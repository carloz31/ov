"""Acciones del diario y del check-in (B09).

El diario es privado y va en una sola dirección: las actividades dejan preguntas (recomendaciones), pero nada lee
las entradas. Las llamadas al LLM van fuera de transacción: se lee, se redacta y se guarda en fases separadas.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import delete, exists, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import N_SIN_REPETIR_DIARIA, VIGENCIA_PREGUNTA_DIA_DIAS
from app.exceptions import ErrorAccion
from app.models import (
    CheckIn, ContadorDiario, Cuenta, EntradaDiario, ItemInstrumento, OrigenEntrada, OrigenRedaccion, PreguntaDiario,
    Recomendacion, ResultadoDimension, ResultadoInstrumento, TipoEventoUso, TipoRecomendacion, UsoPreguntaDiario,
)
from app.models.enums import TipoObjetivo
from app.schemas.acciones import (
    AbrirPreguntaEntrada, AccionCuenta, BorrarEntradaEntrada, CheckInEntrada, EditarEntradaEntrada,
    EscribirEntradaEntrada, ResponderRegistroEntrada, RespuestaAccion,
)
from app.schemas.diario import PreguntaAbierta, PreguntaDelDia, PreguntaDiarioEstado
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, exigir_estudiante, fecha_accion, responder_con_eventos,
)
from app.services.diario.asistente import redactar, referencias_resolubles, resolver_contexto
from app.services.diario.consultas import estado_pregunta
from app.services.diario.sorteo import PuntajeDimension, pesos_dimensiones, semilla, sortear
from app.services.secciones import exigir_seccion


@usar_contexto
def responder_registro(sesion: Session, entrada: ResponderRegistroEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    eventos = [(TipoEventoUso.RESPUESTA_REFLEXIVA, None)] if (
        entrada.clasificacion == "ADECUADA" or entrada.ampliada
    ) else []
    return responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada))


# --- Recomendaciones ------------------------------------------------------------------------

def crear_desbloqueadas(sesion: Session, cuenta: Cuenta, preguntas_ids: list[int], fecha: datetime,
                        actividad_id: int | None = None) -> None:
    """Deja en el diario las preguntas recién desbloqueadas, sin LLM: la fija con su texto y la personalizada con
    el contexto de este momento (o la base, si ninguna referencia tiene dato)."""
    existentes = set(sesion.scalars(select(Recomendacion.pregunta_diario_id).where(
        Recomendacion.cuenta_id == cuenta.id, Recomendacion.tipo == TipoRecomendacion.DESBLOQUEADA,
        Recomendacion.pregunta_diario_id.in_(preguntas_ids))))
    definiciones = contexto(sesion).definiciones
    for pregunta_id in dict.fromkeys(preguntas_ids):
        if pregunta_id in existentes:
            continue
        pregunta = definiciones.obtener(PreguntaDiario, pregunta_id)
        datos = resolver_contexto(sesion, cuenta, pregunta)
        por_redactar = pregunta.personalizada and bool(datos)
        sesion.add(Recomendacion(
            cuenta_id=cuenta.id, pregunta_diario_id=pregunta.id, tipo=TipoRecomendacion.DESBLOQUEADA,
            contexto=datos if por_redactar else None, texto=None if por_redactar else pregunta.pregunta,
            origen=None if por_redactar else OrigenRedaccion.FIJA, creada_en=fecha, actividad_id=actividad_id))
    sesion.flush()


def recomendacion_desbloqueada(sesion: Session, cuenta: Cuenta, pregunta: PreguntaDiario) -> Recomendacion | None:
    return sesion.scalar(select(Recomendacion).where(
        Recomendacion.cuenta_id == cuenta.id, Recomendacion.tipo == TipoRecomendacion.DESBLOQUEADA,
        Recomendacion.pregunta_diario_id == pregunta.id))


def diaria_vigente(sesion: Session, cuenta: Cuenta, hoy: date) -> Recomendacion | None:
    """La pregunta del día más reciente que sigue vigente en `hoy`; las vencidas quedan en la base y no se usan."""
    ultima = sesion.scalar(select(Recomendacion).where(
        Recomendacion.cuenta_id == cuenta.id, Recomendacion.tipo == TipoRecomendacion.DIARIA,
        Recomendacion.fecha <= hoy).order_by(Recomendacion.fecha.desc()).limit(1))
    if ultima is None or ultima.fecha + timedelta(days=VIGENCIA_PREGUNTA_DIA_DIAS) <= hoy:
        return None
    return ultima


def respondida(sesion: Session, recomendacion: Recomendacion) -> bool:
    return bool(sesion.scalar(select(exists().where(EntradaDiario.recomendacion_id == recomendacion.id))))


# --- Entradas -------------------------------------------------------------------------------

def _siguiente_numero(sesion: Session, cuenta: Cuenta, libre: bool) -> tuple[int, int | None]:
    contador = sesion.get(ContadorDiario, cuenta.id)
    if contador is None:
        contador = ContadorDiario(cuenta_id=cuenta.id, ultimo_numero=0, ultimo_libre=0)
        sesion.add(contador)
    contador.ultimo_numero += 1
    if libre:
        contador.ultimo_libre += 1
    return contador.ultimo_numero, contador.ultimo_libre if libre else None


@usar_contexto
def escribir_entrada(sesion: Session, entrada: EscribirEntradaEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    exigir_seccion(sesion, cuenta, "DIARIO")
    fecha = fecha_accion(entrada)
    recomendacion, origen = None, OrigenEntrada.LIBRE
    if entrada.pregunta is not None:
        pregunta = buscar_por_codigo(sesion, PreguntaDiario, entrada.pregunta)
        recomendacion = recomendacion_desbloqueada(sesion, cuenta, pregunta)
        if recomendacion is None:
            raise ErrorAccion("Esta pregunta todavía no está en tu diario")
        origen = OrigenEntrada.GUIADA
    elif entrada.del_dia:
        recomendacion = diaria_vigente(sesion, cuenta, fecha.date())
        if recomendacion is None:
            raise ErrorAccion("No tienes una pregunta del día vigente")
        origen = OrigenEntrada.RECOMENDACION_DIA
    if recomendacion is not None:
        if recomendacion.texto is None:
            raise ErrorAccion("Abre la pregunta antes de responderla")
        if respondida(sesion, recomendacion):
            raise ErrorAccion("Ya respondiste esta pregunta")
        if recomendacion.archivada_en is not None:
            raise ErrorAccion("La pregunta de hoy ya está cerrada" if entrada.del_dia
                              else "Desarchiva la carta para responderla")
    numero, numero_libre = _siguiente_numero(sesion, cuenta, origen == OrigenEntrada.LIBRE)
    registro = EntradaDiario(cuenta_id=cuenta.id, origen=origen,
                             recomendacion_id=None if recomendacion is None else recomendacion.id,
                             numero=numero, numero_libre=numero_libre, titulo=entrada.titulo, texto=entrada.texto,
                             fecha_hora=fecha)
    sesion.add(registro)
    sesion.flush()
    eventos = [(TipoEventoUso.ESCRIBE_ENTRADA_DIARIO, registro.id)]
    if origen == OrigenEntrada.LIBRE:
        eventos.append((TipoEventoUso.ESCRIBE_ENTRADA_LIBRE, registro.id))
    return responder_con_eventos(sesion, cuenta, eventos, fecha)


def _entrada_de(sesion: Session, cuenta: Cuenta, numero: int) -> EntradaDiario:
    registro = sesion.scalar(select(EntradaDiario).where(
        EntradaDiario.cuenta_id == cuenta.id, EntradaDiario.numero == numero))
    if registro is None:
        raise ErrorAccion("Entrada no encontrada", estado_http=404)
    return registro


@usar_contexto
def editar_entrada(sesion: Session, entrada: EditarEntradaEntrada) -> RespuestaAccion:
    """Cambia título y texto en cualquier momento; la pregunta nunca cambia. Sin eventos."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    registro = _entrada_de(sesion, cuenta, entrada.numero)
    fecha = fecha_accion(entrada)
    registro.texto = entrada.texto
    if 'titulo' in entrada.model_fields_set:
        registro.titulo = entrada.titulo
    registro.actualizada_en = fecha
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def borrar_entrada(sesion: Session, entrada: BorrarEntradaEntrada) -> RespuestaAccion:
    """Borrado físico, sin eventos. Ajuste del diario (F05): la carta que respondía queda archivada y la pregunta
    del día, cerrada (`archivada_en`); ninguna vuelve a quedar por responder."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    registro = _entrada_de(sesion, cuenta, entrada.numero)
    fecha = fecha_accion(entrada)
    recomendacion_id = registro.recomendacion_id
    sesion.execute(delete(EntradaDiario).where(EntradaDiario.id == registro.id))
    sesion.expunge(registro)
    if recomendacion_id is not None:
        sesion.execute(update(Recomendacion).where(Recomendacion.id == recomendacion_id).values(archivada_en=fecha))
    return responder_con_eventos(sesion, cuenta, [], fecha)


def _carta(sesion: Session, entrada: AbrirPreguntaEntrada) -> tuple[Cuenta, PreguntaDiario, Recomendacion]:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    exigir_seccion(sesion, cuenta, "DIARIO")
    pregunta = buscar_por_codigo(sesion, PreguntaDiario, entrada.codigo)
    if pregunta.uso == UsoPreguntaDiario.DIARIA:
        raise ErrorAccion("La pregunta del día no se archiva ni se desarchiva")
    recomendacion = recomendacion_desbloqueada(sesion, cuenta, pregunta)
    if recomendacion is None:
        raise ErrorAccion("Esta pregunta todavía no está en tu diario")
    return cuenta, pregunta, recomendacion


@usar_contexto
def archivar_pregunta(sesion: Session, entrada: AbrirPreguntaEntrada) -> PreguntaDiarioEstado:
    """Ajuste del diario (F05): solo una carta lista (redactada), pendiente y sin responder. Sin eventos."""
    cuenta, pregunta, recomendacion = _carta(sesion, entrada)
    if recomendacion.texto is None:
        raise ErrorAccion("Abre la carta antes de archivarla")
    if respondida(sesion, recomendacion):
        raise ErrorAccion("Ya respondiste esta carta")
    if recomendacion.archivada_en is not None:
        raise ErrorAccion("Esta carta ya está archivada")
    recomendacion.archivada_en = fecha_accion(entrada)
    sesion.flush()
    return estado_pregunta(sesion, cuenta, pregunta)


@usar_contexto
def desarchivar_pregunta(sesion: Session, entrada: AbrirPreguntaEntrada) -> PreguntaDiarioEstado:
    """Devuelve una carta archivada a pendiente. Sin eventos."""
    cuenta, pregunta, recomendacion = _carta(sesion, entrada)
    if recomendacion.archivada_en is None:
        raise ErrorAccion("Esta carta no está archivada")
    recomendacion.archivada_en = None
    sesion.flush()
    return estado_pregunta(sesion, cuenta, pregunta)


# --- Check-in -------------------------------------------------------------------------------

@usar_contexto
def registrar_check_in(sesion: Session, entrada: CheckInEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    exigir_seccion(sesion, cuenta, "CHECK_IN")
    fecha = fecha_accion(entrada)
    if sesion.scalar(select(CheckIn.id).where(
        CheckIn.cuenta_id == cuenta.id, CheckIn.fecha == fecha.date(),
    ).limit(1)) is not None:
        raise ErrorAccion("La cuenta ya tiene un check-in en esta fecha")
    registro = CheckIn(cuenta_id=cuenta.id, fecha=fecha.date(), nivel_seguridad=entrada.nivel_seguridad)
    sesion.add(registro)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [(TipoEventoUso.REGISTRA_CHECK_IN, registro.id)], fecha)


# --- Abrir una pregunta desbloqueada --------------------------------------------------------

@dataclass(frozen=True, slots=True)
class LecturaPregunta:
    recomendacion_id: int
    base: str
    datos: list | None
    texto: str | None


@usar_contexto
def _leer_desbloqueada(sesion: Session, entrada: AbrirPreguntaEntrada) -> LecturaPregunta:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    exigir_seccion(sesion, cuenta, "DIARIO")
    pregunta = buscar_por_codigo(sesion, PreguntaDiario, entrada.codigo)
    recomendacion = recomendacion_desbloqueada(sesion, cuenta, pregunta)
    if recomendacion is None:
        exigir_disponible(sesion, cuenta, TipoObjetivo.PREGUNTA_DIARIO, pregunta)
        raise ErrorAccion("Esta pregunta todavía no está en tu diario")
    return LecturaPregunta(recomendacion.id, pregunta.pregunta, recomendacion.contexto, recomendacion.texto)


def _guardar_texto(sesion: Session, recomendacion_id: int, texto: str, origen: OrigenRedaccion) -> None:
    """Solo la primera redacción queda: si otra solicitud ya la guardó, no cambia."""
    sesion.execute(update(Recomendacion).where(Recomendacion.id == recomendacion_id, Recomendacion.texto.is_(None))
                   .values(texto=texto, origen=origen))


@usar_contexto
def _pregunta_abierta(sesion: Session, recomendacion_id: int) -> PreguntaAbierta:
    recomendacion = sesion.get(Recomendacion, recomendacion_id)
    pregunta = contexto(sesion).definiciones.obtener(PreguntaDiario, recomendacion.pregunta_diario_id)
    return PreguntaAbierta(codigo=pregunta.codigo, nombre=pregunta.nombre, texto=recomendacion.texto,
                           respondida=respondida(sesion, recomendacion))


def abrir_pregunta(fabrica_sesiones, entrada: AbrirPreguntaEntrada, evaluador, *,
                   tiempo_maximo_segundos: float) -> PreguntaAbierta:
    """Redacta una sola vez, con el contexto guardado al desbloquearla (no con los datos actuales)."""
    with fabrica_sesiones.begin() as sesion:
        lectura = _leer_desbloqueada(sesion, entrada)
    if lectura.texto is None:
        texto, origen = redactar(evaluador, lectura.base, lectura.datos, tiempo_maximo_segundos=tiempo_maximo_segundos)
        with fabrica_sesiones.begin() as sesion:
            _guardar_texto(sesion, lectura.recomendacion_id, texto, origen)
    with fabrica_sesiones.begin() as sesion:
        return _pregunta_abierta(sesion, lectura.recomendacion_id)


# --- Pregunta del día -----------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class LecturaDia:
    cuenta_id: int
    hoy: date
    vigente_id: int | None
    pregunta_id: int | None = None
    base: str | None = None
    datos: list | None = None


def _puntajes(sesion: Session, cuenta: Cuenta, dimensiones: set[int]) -> dict[int, PuntajeDimension]:
    """Puntaje por dimensión del resultado vigente más reciente de partida o llegada."""
    if not dimensiones:
        return {}
    definiciones = contexto(sesion).definiciones
    filas = sesion.execute(select(ResultadoDimension.dimension_id, ResultadoDimension.puntaje,
                                  ResultadoDimension.puntaje_maximo).join(
        ResultadoInstrumento, ResultadoInstrumento.id == ResultadoDimension.resultado_id).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
        ResultadoDimension.dimension_id.in_(dimensiones)).order_by(
        ResultadoInstrumento.calculado_en.desc(), ResultadoInstrumento.id.desc())).all()
    items = {}
    for item in definiciones.listar(ItemInstrumento):
        if item.dimension_id in dimensiones:
            items[item.dimension_id] = items.get(item.dimension_id, 0) + 1
    puntajes = {}
    for dimension_id, puntaje, maximo in filas:
        puntajes.setdefault(dimension_id, PuntajeDimension(puntaje, maximo, items.get(dimension_id, 0)))
    return puntajes


@usar_contexto
def _leer_dia(sesion: Session, entrada: AccionCuenta) -> LecturaDia:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    exigir_seccion(sesion, cuenta, "DIARIO")
    hoy = fecha_accion(entrada).date()
    vigente = diaria_vigente(sesion, cuenta, hoy)
    if vigente is not None:
        return LecturaDia(cuenta.id, hoy, vigente.id)
    definiciones = contexto(sesion).definiciones
    diarias = [pregunta for pregunta in definiciones.listar(PreguntaDiario) if pregunta.uso == UsoPreguntaDiario.DIARIA]
    recientes = set(sesion.scalars(select(Recomendacion.pregunta_diario_id).where(
        Recomendacion.cuenta_id == cuenta.id, Recomendacion.tipo == TipoRecomendacion.DIARIA).order_by(
        Recomendacion.fecha.desc()).limit(N_SIN_REPETIR_DIARIA)))
    sin_dato = {pregunta.id for pregunta in diarias if not referencias_resolubles(sesion, cuenta, pregunta)}
    dimensiones = {pregunta.dimension_id for pregunta in diarias}
    pesos = pesos_dimensiones(dimensiones, _puntajes(sesion, cuenta, dimensiones - {None}))
    elegida = (sortear(diarias, pesos, recientes | sin_dato, semilla(cuenta.codigo, hoy))
               or sortear(diarias, pesos, sin_dato, semilla(cuenta.codigo, hoy)))
    if elegida is None:
        raise ErrorAccion("No hay preguntas del día disponibles")
    return LecturaDia(cuenta.id, hoy, None, elegida.id, elegida.pregunta, resolver_contexto(sesion, cuenta, elegida))


@usar_contexto
def _pregunta_del_dia(sesion: Session, recomendacion_id: int) -> PreguntaDelDia:
    recomendacion = sesion.get(Recomendacion, recomendacion_id)
    pregunta = contexto(sesion).definiciones.obtener(PreguntaDiario, recomendacion.pregunta_diario_id)
    return PreguntaDelDia(nombre=pregunta.nombre, texto=recomendacion.texto, fecha=recomendacion.fecha,
                          respondida=respondida(sesion, recomendacion),
                          cerrada=recomendacion.archivada_en is not None)


def pregunta_del_dia(fabrica_sesiones, entrada: AccionCuenta, evaluador, *,
                     tiempo_maximo_segundos: float) -> PreguntaDelDia:
    """Devuelve la vigente o sortea, redacta y guarda una nueva. Sin tareas programadas: se crea al pedirla."""
    with fabrica_sesiones.begin() as sesion:
        lectura = _leer_dia(sesion, entrada)
    if lectura.vigente_id is None:
        texto, origen = redactar(evaluador, lectura.base, lectura.datos, tiempo_maximo_segundos=tiempo_maximo_segundos)
        try:
            with fabrica_sesiones.begin() as sesion:
                nueva = Recomendacion(cuenta_id=lectura.cuenta_id, pregunta_diario_id=lectura.pregunta_id,
                                      tipo=TipoRecomendacion.DIARIA, contexto=lectura.datos or None, texto=texto,
                                      origen=origen, fecha=lectura.hoy, creada_en=fecha_accion(entrada))
                sesion.add(nueva)
                sesion.flush()
                vigente_id = nueva.id
        except IntegrityError:
            # Otra solicitud la creó primero: vale la suya.
            with fabrica_sesiones.begin() as sesion:
                vigente_id = sesion.scalar(select(Recomendacion.id).where(
                    Recomendacion.cuenta_id == lectura.cuenta_id, Recomendacion.tipo == TipoRecomendacion.DIARIA,
                    Recomendacion.fecha == lectura.hoy))
    else:
        vigente_id = lectura.vigente_id
    with fabrica_sesiones.begin() as sesion:
        return _pregunta_del_dia(sesion, vigente_id)
