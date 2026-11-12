"""Pasos sugeridos para las dudas y complicaciones nuevas de una tarjeta (B11 · HU-110; ajuste llm-sugerencias, §3).

Se generan solo al guardar CONOCIMIENTO o REALIDAD con novedades: una llamada a Claude Haiku (`cliente_llm`) por
guardado con todas ellas, hasta MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN por plan, con sus propios topes de tokens y de
tiempo. La llamada va entre dos transacciones, como en el registro. El LLM clasifica cada novedad (`clase`) y propone
hasta dos pasos; con `no_aplica` no se crea nada. Si la llamada falla, tarda, sale del esquema o se agotó el tope, o
una novedad vuelve sin pasos válidos, solo las novedades de lista (dudas de las preguntas de conocimiento o sugeridas,
complicaciones de DIFICULTADES) reciben su paso fijo de respaldo (`respaldo_paso`). Al LLM van la carrera, la
institución, el camino, los tipos de paso, los pasos actuales, las novedades y, con complicaciones, el financiamiento;
nada más del estudiante."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import (
    MAXIMO_CARACTERES_PASO, MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN, MAXIMO_PASOS_POR_COMPLICACION, MAXIMO_PASOS_POR_DUDA,
    MAXIMO_TOKENS_SALIDA_PASOS, TIEMPO_MAXIMO_PASOS_SEGUNDOS,
)
from app.models import (
    Carrera, ClaseNovedadPlan, ComplicacionTarjeta, DudaTarjeta, EstadoSugerencia, FinanciamientoTarjeta,
    GestionInstitucion, Institucion, OrigenDuda, OrigenSugerencia, PasoTarjeta, RespaldoPaso, SugerenciaTarjeta,
    TarjetaCarrera,
)
from app.services.planes.consultas import opcion_por_codigo, opciones_lista, texto_opcion
from app.services.planes.prompt_pasos_v5_haiku import PROMPT
from app.services.registro.llm import ClienteLLM, LlamadaFallida, SalidaInvalida, salida_json


DUDAS, COMPLICACIONES = 'DUDAS', 'COMPLICACIONES'
GESTION = {GestionInstitucion.PUBLICA: 'pública', GestionInstitucion.PRIVADA: 'privada'}
SIN_ELEGIR = 'sin elegir'
CLASES = ('dato', 'experiencia', 'sobre_mi', 'lo_que_dicen', 'lista', 'no_aplica')


@dataclass(frozen=True, slots=True)
class Novedad:
    numero: int
    texto: str


@dataclass(frozen=True, slots=True)
class ContextoSugerencias:
    tipo: str
    """DUDAS o COMPLICACIONES."""
    carrera: str
    institucion: str | None
    """«nombre, pública|privada, ciudad», o None si no la eligió."""
    camino: str | None
    financiamiento: tuple[str, ...]
    tipos_paso: tuple[tuple[str, str], ...]
    """(código, etiqueta) de la lista PASOS."""
    pasos_actuales: tuple[str, ...]
    """Los textos de los pasos del plan y de las sugerencias pendientes."""
    novedades: tuple[Novedad, ...]


def armar_mensaje(contexto_llm: ContextoSugerencias) -> str:
    """El mensaje del usuario (§3.3): `<dudas>` o `<complicaciones>`, nunca ambos; `<financiamiento>` solo con
    complicaciones."""
    etiqueta = 'dudas' if contexto_llm.tipo == DUDAS else 'complicaciones'
    lineas = [f'<carrera>{contexto_llm.carrera}</carrera>',
              f'<institucion>{contexto_llm.institucion or SIN_ELEGIR}</institucion>',
              f'<camino>{contexto_llm.camino or SIN_ELEGIR}</camino>',
              '<tipos_paso>', *(f'{codigo}: {etiqueta_paso}' for codigo, etiqueta_paso in contexto_llm.tipos_paso),
              '</tipos_paso>', '<pasos_actuales>', *contexto_llm.pasos_actuales, '</pasos_actuales>']
    if contexto_llm.tipo == COMPLICACIONES:
        lineas.append(f'<financiamiento>{", ".join(contexto_llm.financiamiento)}</financiamiento>')
    lineas += [f'<{etiqueta}>', *(f'{n.numero}. {n.texto}' for n in contexto_llm.novedades), f'</{etiqueta}>']
    return '\n'.join(lineas)


# --- Respuesta y validación ---------------------------------------------------------------------

def modelo_respuesta(tipos_paso: tuple[str, ...]):
    """El esquema de salida (§3.4), con `tipo` limitado a los códigos de PASOS que se envían."""
    TipoPaso = Literal[tipos_paso]  # noqa: N806 - tipo construido con los códigos de la lista

    class PasoSugerido(BaseModel):
        model_config = ConfigDict(extra='forbid')
        tipo: TipoPaso
        texto: str

    class SugerenciaNovedad(BaseModel):
        model_config = ConfigDict(extra='forbid')
        numero: int
        clase: Literal[CLASES]
        motivo: str
        pasos: list[PasoSugerido]

    class RespuestaSugerencias(BaseModel):
        model_config = ConfigDict(extra='forbid')
        sugerencias: list[SugerenciaNovedad]

    return RespuestaSugerencias


@dataclass(frozen=True, slots=True)
class Sugerida:
    """Lo que el LLM dio para una novedad: su clase, su motivo y los pasos que pasaron la validación."""
    clase: ClaseNovedadPlan
    motivo: str
    pasos: tuple[tuple[str, str], ...]


def validar_sugerencias(resultado, contexto_llm: ContextoSugerencias) -> dict[int, Sugerida]:
    """Por número de novedad enviado: la clase, el motivo y los pasos válidos (tipo de PASOS, con texto, no más de
    MAXIMO_CARACTERES_PASO: el que lo supera se descarta, no se corta), a lo sumo los permitidos por novedad. Ignora
    números que no se enviaron y, si un número viene dos veces, la segunda. Con `no_aplica`, sin pasos."""
    maximo = MAXIMO_PASOS_POR_DUDA if contexto_llm.tipo == DUDAS else MAXIMO_PASOS_POR_COMPLICACION
    numeros = {novedad.numero for novedad in contexto_llm.novedades}
    tipos = {codigo for codigo, _ in contexto_llm.tipos_paso}
    sugeridas: dict[int, Sugerida] = {}
    for item in resultado.sugerencias:
        if item.numero not in numeros or item.numero in sugeridas:
            continue
        clase = ClaseNovedadPlan(item.clase.upper())
        pasos = []
        for paso in item.pasos:
            texto = ' '.join(paso.texto.split())
            if clase != ClaseNovedadPlan.NO_APLICA and paso.tipo in tipos and texto \
                    and len(texto) <= MAXIMO_CARACTERES_PASO and len(pasos) < maximo:
                pasos.append((paso.tipo, texto))
        sugeridas[item.numero] = Sugerida(clase=clase, motivo=' '.join(item.motivo.split()), pasos=tuple(pasos))
    return sugeridas


def pedir_sugerencias(cliente: ClienteLLM, contexto_llm: ContextoSugerencias) -> dict[int, Sugerida] | None:
    """Lo que el LLM dio por novedad; None si la llamada falla, tarda o sale del esquema (respaldo donde toque)."""
    modelo = modelo_respuesta(tuple(codigo for codigo, _ in contexto_llm.tipos_paso))
    try:
        resultado, _ = salida_json(cliente, PROMPT, armar_mensaje(contexto_llm), modelo,
                                   maximo_tokens=MAXIMO_TOKENS_SALIDA_PASOS, tiempo=TIEMPO_MAXIMO_PASOS_SEGUNDOS)
    except (LlamadaFallida, SalidaInvalida):
        # Nunca se propaga ni se guarda el mensaje de una excepción externa.
        return None
    return validar_sugerencias(resultado, contexto_llm)


# --- Lectura, llamada y guardado ----------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Novedades:
    """Lo que dejó un guardado para sugerir después de confirmarlo."""
    tarjeta_id: int
    tipo: str
    numeros: tuple[int, ...]
    fecha: datetime


def siguiente_numero(tarjeta: TarjetaCarrera, secuencia: str) -> int:
    """El siguiente número de la secuencia de la tarjeta (duda, complicacion, sugerencia o paso); nunca se reutiliza."""
    atributo = f'ultimo_numero_{secuencia}'
    setattr(tarjeta, atributo, getattr(tarjeta, atributo) + 1)
    return getattr(tarjeta, atributo)


def texto_complicacion(sesion: Session, complicacion) -> str:
    return complicacion.texto_otro or texto_opcion(sesion, complicacion.opcion_id)


def _novedades(sesion: Session, novedades: Novedades):
    """Las filas de las novedades que siguen existiendo y aún no tienen sugerencias."""
    modelo = DudaTarjeta if novedades.tipo == DUDAS else ComplicacionTarjeta
    columna = SugerenciaTarjeta.duda_id if novedades.tipo == DUDAS else SugerenciaTarjeta.complicacion_id
    con_sugerencias = select(columna).where(columna.is_not(None))
    return list(sesion.scalars(select(modelo).where(
        modelo.tarjeta_id == novedades.tarjeta_id, modelo.numero.in_(novedades.numeros),
        modelo.id.not_in(con_sugerencias)).order_by(modelo.numero)))


def _pasos_actuales(sesion: Session, tarjeta_id: int) -> tuple[str, ...]:
    pasos = sesion.scalars(select(PasoTarjeta.texto).where(PasoTarjeta.tarjeta_id == tarjeta_id)
                           .order_by(PasoTarjeta.posicion))
    pendientes = sesion.scalars(select(SugerenciaTarjeta.texto).where(
        SugerenciaTarjeta.tarjeta_id == tarjeta_id, SugerenciaTarjeta.estado == EstadoSugerencia.PENDIENTE)
        .order_by(SugerenciaTarjeta.numero))
    return (*pasos, *pendientes)


@usar_contexto
def leer_contexto(sesion: Session, novedades: Novedades) -> ContextoSugerencias | None:
    """El contexto de la llamada, o None si no hay qué sugerir con el LLM (sin novedades o tope agotado)."""
    tarjeta = sesion.get(TarjetaCarrera, novedades.tarjeta_id)
    filas = [] if tarjeta is None else _novedades(sesion, novedades)
    if not filas or tarjeta.llamadas_sugerencias >= MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN:
        return None
    carrera = sesion.scalar(select(Carrera.nombre).where(Carrera.id == tarjeta.carrera_id))
    institucion = None
    if tarjeta.institucion_id is not None:
        fila = sesion.scalar(select(Institucion).where(Institucion.id == tarjeta.institucion_id).options(
            selectinload(Institucion.ubicacion)))
        gestion = GESTION.get(fila.gestion)
        institucion = ', '.join(parte for parte in (fila.nombre, gestion, fila.ubicacion.nombre) if parte)
    dudas = novedades.tipo == DUDAS
    camino, financiamiento = None, ()
    if tarjeta.camino_opcion_id is not None or tarjeta.camino_otro is not None:
        camino = tarjeta.camino_otro or texto_opcion(sesion, tarjeta.camino_opcion_id)
    if not dudas:
        financiamiento = tuple(f.texto_otro or texto_opcion(sesion, f.opcion_id) for f in sesion.scalars(
            select(FinanciamientoTarjeta).where(FinanciamientoTarjeta.tarjeta_id == tarjeta.id).order_by(
                FinanciamientoTarjeta.posicion)))
    return ContextoSugerencias(
        tipo=novedades.tipo, carrera=carrera, institucion=institucion, camino=camino, financiamiento=financiamiento,
        tipos_paso=tuple((o.codigo, o.texto) for o in opciones_lista(sesion, 'PASOS')),
        pasos_actuales=_pasos_actuales(sesion, tarjeta.id),
        novedades=tuple(Novedad(numero=f.numero, texto=f.texto if dudas else texto_complicacion(sesion, f))
                        for f in filas))


def _opcion_de_lista(sesion: Session, fila, dudas: bool) -> int | None:
    """La opción de la que sale la novedad, si es de lista: la pregunta de conocimiento, la duda sugerida o la
    complicación de DIFICULTADES. None para dudas propias y complicaciones «Otro»."""
    if not dudas:
        return fila.opcion_id
    if fila.origen == OrigenDuda.PREGUNTA:
        return opcion_por_codigo(sesion, 'PREGUNTAS_CONOCIMIENTO', fila.pregunta.value).id
    return fila.opcion_id if fila.origen == OrigenDuda.SUGERIDA else None


def _respaldo(sesion: Session, tarjeta: TarjetaCarrera, opcion_id: int) -> tuple[int, str]:
    """(tipo, texto) del paso de respaldo de esa opción, con la carrera y la institución del plan."""
    respaldo = next(r for r in contexto(sesion).definiciones.listar(RespaldoPaso) if r.opcion_id == opcion_id)
    carrera = sesion.scalar(select(Carrera.nombre).where(Carrera.id == tarjeta.carrera_id))
    if tarjeta.institucion_id is None:
        texto = respaldo.texto_sin_institucion
    else:
        institucion = sesion.scalar(select(Institucion.nombre).where(Institucion.id == tarjeta.institucion_id))
        texto = respaldo.texto.replace('{institucion}', institucion)
    return respaldo.tipo_opcion_id, texto.replace('{carrera}', carrera)


def _sugerencia(tarjeta, fecha, tipo_opcion_id, texto, generada_por, *, clase=None, motivo=None, duda=None,
                complicacion=None):
    return SugerenciaTarjeta(
        tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'sugerencia'),
        duda_id=None if duda is None else duda.id, complicacion_id=None if complicacion is None else complicacion.id,
        tipo_opcion_id=tipo_opcion_id, texto=texto, estado=EstadoSugerencia.PENDIENTE, generada_por=generada_por,
        clase=clase, motivo=motivo, creada_en=fecha)


@usar_contexto
def guardar_sugerencias(sesion: Session, novedades: Novedades, sugeridas: dict[int, Sugerida] | None,
                        *, llamada: bool) -> None:
    """Guarda los pasos del LLM, con su clase y su motivo, y el respaldo de cada novedad de lista que quedó sin pasos
    (salvo `no_aplica`); cuenta la llamada. `sugeridas` es None si la llamada falló o no se hizo."""
    tarjeta = sesion.get(TarjetaCarrera, novedades.tarjeta_id)
    if tarjeta is None:
        return
    if llamada:
        tarjeta.llamadas_sugerencias += 1
    dudas = novedades.tipo == DUDAS
    for fila in _novedades(sesion, novedades):
        origen = dict(duda=fila) if dudas else dict(complicacion=fila)
        sugerida = (sugeridas or {}).get(fila.numero)
        if sugerida is not None and sugerida.pasos:
            sesion.add_all(_sugerencia(tarjeta, novedades.fecha, opcion_por_codigo(sesion, 'PASOS', tipo).id, texto,
                                       OrigenSugerencia.LLM, clase=sugerida.clase, motivo=sugerida.motivo, **origen)
                           for tipo, texto in sugerida.pasos)
            continue
        if sugerida is not None and sugerida.clase == ClaseNovedadPlan.NO_APLICA:
            continue
        opcion_id = _opcion_de_lista(sesion, fila, dudas)
        if opcion_id is not None:
            tipo_opcion_id, texto = _respaldo(sesion, tarjeta, opcion_id)
            sesion.add(_sugerencia(tarjeta, novedades.fecha, tipo_opcion_id, texto, OrigenSugerencia.RESPALDO, **origen))


def sugerir(fabrica_sesiones, novedades: Novedades, cliente: ClienteLLM) -> None:
    """Lee el contexto, llama al LLM fuera de toda transacción y guarda lo sugerido (o el respaldo)."""
    with fabrica_sesiones.begin() as sesion:
        contexto_llm = leer_contexto(sesion, novedades)
    sugeridas = None if contexto_llm is None else pedir_sugerencias(cliente, contexto_llm)
    with fabrica_sesiones.begin() as sesion:
        guardar_sugerencias(sesion, novedades, sugeridas, llamada=contexto_llm is not None)
