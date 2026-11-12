"""Preguntas sugeridas por el LLM para el guion de una entrevista (B13 · HU-059; ajuste llm-sugerencias, §2).

Una llamada a Claude Haiku (`cliente_llm`) por versión de «lo que pienso»: entran la familia de carreras, las preguntas
base y los tres textos del estudiante, en etiquetas; sale a lo más una pregunta por campo (día, necesita, duda), con su
motivo. La llamada va entre dos transacciones, como en planes. Si el texto es pobre (los tres campos juntos no llegan a
MIN_CARACTERES_RESPALDO) no se llama. Si el LLM falla, tarda o sale del esquema, no se guarda nada y el estudiante puede
reintentar; si responde, lo útil se guarda y no se vuelve a pedir."""

import re
from dataclasses import dataclass
from uuid import uuid4

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_CARACTERES_PREGUNTA_GUION, MIN_CARACTERES_RESPALDO
from app.models import (
    CampoLoQuePienso, Cuenta, EstadoSugerenciaGuion, FamiliaCarrera, Investigacion, PreguntaBaseGuion, PreguntaGuion,
    SugerenciaGuion,
)
from app.models.base import sin_tildes
from app.schemas.investigaciones import PedirSugerenciasEntrada, SugerenciaGuionPublica, SugerenciasGuion
from app.services.comun import buscar_por_codigo
from app.services.investigaciones.consultas import exigir_investigacion_activa, exigir_seccion_investigaciones
from app.services.investigaciones.prompt_guion_v4_haiku import PROMPT
from app.services.registro.llm import ClienteLLM, LlamadaFallida, SalidaInvalida, salida_json


CAMPOS = (('dia', CampoLoQuePienso.DIA), ('necesita', CampoLoQuePienso.NECESITA), ('duda', CampoLoQuePienso.DUDA))


@dataclass(frozen=True, slots=True)
class ContextoGuion:
    familia: str
    dia: str
    necesita: str
    duda: str
    preguntas_base: tuple[str, ...]


class SugerenciaCampo(BaseModel):
    model_config = ConfigDict(extra='forbid')
    motivo: str
    pregunta: str | None


class RespuestaGuion(BaseModel):
    """La salida del LLM (§2.4): las tres claves, cada una con su motivo y su pregunta o null."""
    model_config = ConfigDict(extra='forbid')
    dia: SugerenciaCampo
    necesita: SugerenciaCampo
    duda: SugerenciaCampo


@dataclass(frozen=True, slots=True)
class PreguntaSugerida:
    campo: CampoLoQuePienso
    texto: str
    motivo: str


def armar_mensaje(contexto_llm: ContextoGuion) -> str:
    """El mensaje del usuario (§2.3): las etiquetas, con las preguntas base una por línea."""
    base = '\n'.join(contexto_llm.preguntas_base)
    return (f'<familia>{contexto_llm.familia}</familia>\n<base>\n{base}\n</base>\n'
            f'<dia>{contexto_llm.dia}</dia>\n<necesita>{contexto_llm.necesita}</necesita>\n'
            f'<duda>{contexto_llm.duda}</duda>')


def texto_pobre(dia: str, necesita: str, duda: str) -> bool:
    return len(dia.strip()) + len(necesita.strip()) + len(duda.strip()) < MIN_CARACTERES_RESPALDO


def clave_pregunta(texto: str) -> str:
    """Para comparar preguntas: sin tildes, sin signos y con un solo espacio."""
    return ' '.join(re.sub(r'[^\w\s]', ' ', sin_tildes(texto)).split())


def pregunta_util(texto: str) -> bool:
    """Con texto, termina en «?», un solo «¿» y no supera MAXIMO_CARACTERES_PREGUNTA_GUION."""
    return (bool(clave_pregunta(texto)) and texto.endswith('?') and texto.count('¿') == 1
            and len(texto) <= MAXIMO_CARACTERES_PREGUNTA_GUION)


def filtrar_preguntas(resultado: RespuestaGuion, excluidas: set[str]) -> list[PreguntaSugerida]:
    """Las preguntas útiles, en el orden de los campos: cada una pasa `pregunta_util` y no repite, en
    `clave_pregunta`, las excluidas (base, guion y sugerencias anteriores) ni otra de esta respuesta. La que no pasa se
    descarta; las demás siguen."""
    vistas, utiles = set(excluidas), []
    for clave_campo, campo in CAMPOS:
        sugerencia = getattr(resultado, clave_campo)
        if sugerencia.pregunta is None:
            continue
        texto = ' '.join(sugerencia.pregunta.split())
        clave = clave_pregunta(texto)
        if not pregunta_util(texto) or clave in vistas:
            continue
        vistas.add(clave)
        utiles.append(PreguntaSugerida(campo=campo, texto=texto, motivo=' '.join(sugerencia.motivo.split())))
    return utiles


def pedir_preguntas(cliente: ClienteLLM, contexto_llm: ContextoGuion,
                    excluidas: set[str]) -> list[PreguntaSugerida] | None:
    """Las preguntas útiles del LLM; None si la llamada falla, tarda o sale del esquema."""
    try:
        resultado, _ = salida_json(cliente, PROMPT, armar_mensaje(contexto_llm), RespuestaGuion)
    except (LlamadaFallida, SalidaInvalida):
        # Nunca se propaga ni se guarda el mensaje de una excepción externa.
        return None
    return filtrar_preguntas(resultado, excluidas)


# --- Lectura, llamada y guardado ----------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Pedido:
    """Lo leído en la primera transacción: con `respuesta`, no hace falta llamar al LLM."""
    investigacion_id: int
    textos: tuple[str, str, str]
    respuesta: SugerenciasGuion | None = None
    contexto_llm: ContextoGuion | None = None
    excluidas: frozenset[str] = frozenset()


def _pendientes(sesion: Session, investigacion_id: int) -> list[SugerenciaGuionPublica]:
    return [SugerenciaGuionPublica(codigo=s.codigo, texto=s.texto, campo=s.campo) for s in sesion.scalars(
        select(SugerenciaGuion).where(SugerenciaGuion.investigacion_id == investigacion_id,
                                      SugerenciaGuion.estado == EstadoSugerenciaGuion.PENDIENTE)
        .order_by(SugerenciaGuion.id))]


@usar_contexto
def _leer(sesion: Session, entrada: PedirSugerenciasEntrada) -> Pedido:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_seccion_investigaciones(sesion, cuenta)
    investigacion = exigir_investigacion_activa(sesion, cuenta)
    textos = (investigacion.piensa_dia, investigacion.piensa_necesita, investigacion.piensa_duda)
    if investigacion.sugerencias_vigentes:
        pendientes = _pendientes(sesion, investigacion.id)
        tiene_sugerencias = sesion.scalar(select(SugerenciaGuion.id).where(
            SugerenciaGuion.investigacion_id == investigacion.id).limit(1)) is not None
        estado = 'LISTAS' if tiene_sugerencias else 'SIN_SUGERENCIAS'
        return Pedido(investigacion.id, textos, SugerenciasGuion(estado=estado, sugerencias=pendientes))
    if texto_pobre(*textos):
        return Pedido(investigacion.id, textos, SugerenciasGuion(estado='SIN_SUGERENCIAS', sugerencias=[]))
    base = tuple(p.texto for p in sorted(contexto(sesion).definiciones.listar(PreguntaBaseGuion),
                                         key=lambda p: p.orden))
    guion = sesion.scalars(select(PreguntaGuion.texto).where(PreguntaGuion.investigacion_id == investigacion.id))
    anteriores = sesion.scalars(select(SugerenciaGuion.texto).where(
        SugerenciaGuion.investigacion_id == investigacion.id))
    familia = sesion.scalar(select(FamiliaCarrera.nombre).where(FamiliaCarrera.id == investigacion.familia_id))
    return Pedido(investigacion.id, textos,
                  contexto_llm=ContextoGuion(familia=familia, dia=textos[0], necesita=textos[1], duda=textos[2],
                                             preguntas_base=base),
                  excluidas=frozenset(clave_pregunta(t) for t in (*base, *guion, *anteriores)))


def _guardar(sesion: Session, pedido: Pedido, preguntas: list[PreguntaSugerida]) -> SugerenciasGuion:
    investigacion = sesion.get(Investigacion, pedido.investigacion_id)
    # Si mientras tanto se canceló o cambió lo que pienso, lo sugerido ya no corresponde: se pide reintentar.
    if investigacion is None or (investigacion.piensa_dia, investigacion.piensa_necesita,
                                 investigacion.piensa_duda) != pedido.textos:
        return SugerenciasGuion(estado='ERROR', sugerencias=[])
    if not investigacion.sugerencias_vigentes:
        sesion.add_all(SugerenciaGuion(codigo=f'SUG-{uuid4().hex}', investigacion_id=investigacion.id, texto=p.texto,
                                       campo=p.campo, motivo=p.motivo, estado=EstadoSugerenciaGuion.PENDIENTE)
                       for p in preguntas)
        investigacion.sugerencias_vigentes = True
        sesion.flush()
    pendientes = _pendientes(sesion, investigacion.id)
    return SugerenciasGuion(estado='LISTAS' if preguntas else 'SIN_SUGERENCIAS', sugerencias=pendientes)


def pedir_sugerencias(fabrica_sesiones, entrada: PedirSugerenciasEntrada, cliente: ClienteLLM) -> SugerenciasGuion:
    with fabrica_sesiones.begin() as sesion:
        pedido = _leer(sesion, entrada)
    if pedido.respuesta is not None:
        return pedido.respuesta
    preguntas = pedir_preguntas(cliente, pedido.contexto_llm, set(pedido.excluidas))
    if preguntas is None:
        return SugerenciasGuion(estado='ERROR', sugerencias=[])
    with fabrica_sesiones.begin() as sesion:
        return _guardar(sesion, pedido, preguntas)
