"""Evaluar la primera respuesta y el seguimiento: llamada, validación de la salida, coherencia y filtro."""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, ValidationError

from app.services.registro.llm import arranque as arranques
from app.services.registro.llm.cliente import ClienteLLM, LlamadaFallida, RespuestaCruda
from app.services.registro.llm.filtro import filtrar, mayuscula_inicial, palabras_permitidas
from app.services.registro.llm.mensaje import Entrada, armar
from app.services.registro.llm.prompt_v7_haiku_arranque import PROMPT
from app.services.registro.llm.tarjeta import CON_REPREGUNTA


class Salida(BaseModel):
    """El esquema de la salida, en este orden."""
    model_config = ConfigDict(extra='forbid')
    motivo: str
    tipo: Literal['propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional']
    sensible: bool
    repregunta: str | None = None
    arranque: str | None = None


def esquema() -> dict:
    """El de `Salida` con `additionalProperties: false`, que la salida estructurada exige."""
    return {**Salida.model_json_schema(), 'additionalProperties': False}


@dataclass(frozen=True, slots=True)
class Evaluacion:
    """`sin_evaluar` con su `causa_fallo` si la llamada falló; si no, la clasificación y la repregunta ya filtrada.

    `causa_base`: `base_sin_redactar` (tocaba repregunta y vino vacía) o `base_por_filtro` (con `reglas_filtro`).
    Solo en el seguimiento: `arranque` (ya limpio, o None si no pasó), `causa_arranque` y `linea`."""
    sin_evaluar: bool
    causa_fallo: str | None = None
    motivo: str | None = None
    tipo: str | None = None
    sensible: bool = False
    repregunta: str | None = None
    repregunta_modelo: str | None = None
    uso_base: bool = False
    causa_base: str | None = None
    reglas_filtro: tuple[str, ...] = ()
    apertura: bool = False
    arranque_modelo: str | None = None
    arranque: str | None = None
    causa_arranque: str | None = None
    linea: str | None = None
    llamada: RespuestaCruda | None = None

    @property
    def arranque_paso(self) -> bool:
        return self.arranque is not None


def _llamar(entrada: Entrada, cliente: ClienteLLM, sistema: str) -> tuple[Salida | None, str | None, RespuestaCruda | None]:
    """(salida, causa del fallo, respuesta cruda). Sin reintentos: un fallo es `sin_evaluar`."""
    try:
        cruda = cliente.llamar(sistema, armar(entrada), esquema())
    except LlamadaFallida as fallo:
        return None, fallo.causa, None
    except TimeoutError:
        return None, 'tiempo_agotado', None
    if cruda.parada == 'refusal':
        return None, 'rechazo', cruda
    if cruda.parada == 'max_tokens':
        return None, 'tope_tokens', cruda
    if cruda.parada != 'end_turn':
        return None, f'parada:{cruda.parada}', cruda
    try:
        return Salida.model_validate_json(cruda.texto), None, cruda
    except ValidationError as error:
        invalido = any(e['type'] == 'json_invalid' for e in error.errors())
        return None, 'json_invalido' if invalido else 'fuera_de_esquema', cruda


def _repregunta(salida: Salida, entrada: Entrada, seguimiento: bool) -> dict:
    """Coherencia y filtro. Si toca repregunta y vino vacía, la base del tipo; si el filtro la rechaza, la base del
    tipo en la primera y la de `no_sabe` en el seguimiento (como el runner)."""
    if salida.sensible or salida.tipo not in CON_REPREGUNTA:
        return {}
    bases = entrada.tarjeta.bases
    if not (salida.repregunta or '').strip():
        return dict(repregunta=bases[salida.tipo], uso_base=True, causa_base='base_sin_redactar')
    permitidas = palabras_permitidas(entrada.respuesta, entrada.respuesta_anterior, *entrada.etiquetas, *entrada.ecos)
    texto, reglas = filtrar(salida.repregunta, salida.tipo, entrada.etiquetas, entrada.tarjeta.filtrar_etiqueta, permitidas)
    if reglas:
        return dict(repregunta=bases['no_sabe' if seguimiento else salida.tipo], uso_base=True, causa_base='base_por_filtro',
                    reglas_filtro=tuple(reglas))
    return dict(repregunta=mayuscula_inicial(texto), apertura='¿' in texto and '¿' not in salida.repregunta)


def evaluar_primera(entrada: Entrada, cliente: ClienteLLM, sistema: str = PROMPT) -> Evaluacion:
    """La primera respuesta. El `arranque`, si viene, se descarta."""
    salida, causa, cruda = _llamar(entrada, cliente, sistema)
    if salida is None:
        return Evaluacion(sin_evaluar=True, causa_fallo=causa, llamada=cruda)
    return Evaluacion(sin_evaluar=False, motivo=salida.motivo, tipo=salida.tipo, sensible=salida.sensible,
                      repregunta_modelo=salida.repregunta, llamada=cruda, **_repregunta(salida, entrada, seguimiento=False))


def evaluar_seguimiento(entrada: Entrada, cliente: ClienteLLM, sistema: str = PROMPT) -> Evaluacion:
    """Las dos respuestas juntas (`respuesta_anterior` e `invitacion` son obligatorias). La repregunta que devuelve es la
    pista. El arranque se revisa y la línea se arma con cualquier tipo, también con `sensible`; si la llamada falla, la
    línea es la segunda respuesta sola."""
    if entrada.respuesta_anterior is None or entrada.invitacion is None:
        raise ValueError('El seguimiento necesita la primera respuesta y la repregunta que vio el estudiante')
    salida, causa, cruda = _llamar(entrada, cliente, sistema)
    if salida is None:
        return Evaluacion(sin_evaluar=True, causa_fallo=causa, llamada=cruda, linea=arranques.linea(None, entrada.respuesta))
    arranque, causa_arranque = arranques.revisar(salida.arranque, (entrada.respuesta_anterior, entrada.respuesta),
                                                 entrada.invitacion, entrada.etiquetas)
    return Evaluacion(sin_evaluar=False, motivo=salida.motivo, tipo=salida.tipo, sensible=salida.sensible,
                      repregunta_modelo=salida.repregunta, llamada=cruda, arranque_modelo=salida.arranque,
                      arranque=arranque, causa_arranque=causa_arranque, linea=arranques.linea(arranque, entrada.respuesta),
                      **_repregunta(salida, entrada, seguimiento=True))
