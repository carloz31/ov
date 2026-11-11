"""La llamada al LLM: protocolo, cliente de Claude (SDK `anthropic`) y cliente falso para las pruebas."""

import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Protocol

from app.core.parametros import (ESFUERZO_LLM_REGISTRO_V7, MAXIMO_TOKENS_SALIDA_LLM, MODELO_LLM_REGISTRO_V7,
                                 TIEMPO_MAXIMO_LLM_SEGUNDOS)


class LlamadaFallida(Exception):
    """Error de la API o tiempo agotado. `causa`: `tiempo_agotado` o `error`."""

    def __init__(self, causa: str, detalle: str = ''):
        super().__init__(causa)
        self.causa, self.detalle = causa, detalle


@dataclass(frozen=True, slots=True)
class RespuestaCruda:
    texto: str
    parada: str
    detalle_parada: str = ''
    tokens_entrada: int | None = None
    tokens_razonamiento: int | None = None
    tokens_salida: int | None = None
    latencia_ms: int | None = None


class ClienteLLM(Protocol):
    modelo: str

    def llamar(self, sistema: str, mensaje: str, esquema: dict) -> RespuestaCruda: ...


class ClienteClaude:
    """`claude-haiku-5-5`, esfuerzo `low`, salida con esquema JSON, sin temperatura y sin reintentos."""

    def __init__(self, clave: str, modelo: str = MODELO_LLM_REGISTRO_V7, esfuerzo: str = ESFUERZO_LLM_REGISTRO_V7,
                 maximo_tokens: int = MAXIMO_TOKENS_SALIDA_LLM, tiempo: float = TIEMPO_MAXIMO_LLM_SEGUNDOS):
        import anthropic
        self._anthropic = anthropic
        self.cliente = anthropic.Anthropic(api_key=clave, timeout=tiempo, max_retries=0)
        self.modelo, self.esfuerzo, self.maximo_tokens, self.tiempo = modelo, esfuerzo, maximo_tokens, tiempo

    def llamar(self, sistema: str, mensaje: str, esquema: dict) -> RespuestaCruda:
        inicio = time.perf_counter()
        try:
            respuesta = self.cliente.messages.create(
                model=self.modelo, max_tokens=self.maximo_tokens, system=sistema,
                messages=[{'role': 'user', 'content': mensaje}],
                output_config={'effort': self.esfuerzo, 'format': {'type': 'json_schema', 'schema': esquema}})
        except self._anthropic.APITimeoutError:
            raise LlamadaFallida('tiempo_agotado') from None
        except self._anthropic.APIError as error:
            raise LlamadaFallida('error', type(error).__name__) from None
        latencia = round((time.perf_counter() - inicio) * 1000)
        uso = respuesta.usage
        detalles = getattr(uso, 'output_tokens_details', None)
        pensar = getattr(detalles, 'thinking_tokens', None) if detalles else None
        detalle = getattr(respuesta, 'stop_details', None)
        return RespuestaCruda(
            texto=''.join(b.text for b in respuesta.content if b.type == 'text'), parada=respuesta.stop_reason or '',
            detalle_parada=f'{detalle.category or ""} {detalle.explanation or ""}'.strip() if detalle else '',
            tokens_entrada=uso.input_tokens, tokens_razonamiento=pensar,
            tokens_salida=uso.output_tokens - (pensar or 0), latencia_ms=latencia)


class ClienteSinClave:
    """Sin `ANTHROPIC_API_KEY`: toda llamada falla (`sin_clave`) y el ítem queda `sin_evaluar` (lote 3)."""

    modelo = 'sin_clave'

    def llamar(self, sistema: str, mensaje: str, esquema: dict) -> RespuestaCruda:
        raise LlamadaFallida('sin_clave')


class ClienteFalso:
    """Devuelve, en orden, las respuestas que recibe: un `RespuestaCruda`, un `str` (JSON con parada `end_turn`) o una
    excepción, que se levanta. Guarda cada llamada en `llamadas`."""

    modelo = 'falso'

    def __init__(self, respuestas: Sequence[RespuestaCruda | str | Exception | Callable[[], RespuestaCruda]]):
        self._respuestas = list(respuestas)
        self.llamadas: list[tuple[str, str, dict]] = []

    def llamar(self, sistema: str, mensaje: str, esquema: dict) -> RespuestaCruda:
        self.llamadas.append((sistema, mensaje, esquema))
        respuesta = self._respuestas.pop(0)
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, str):
            return RespuestaCruda(texto=respuesta, parada='end_turn')
        return respuesta() if callable(respuesta) else respuesta


class SalidaInvalida(Exception):
    """La llamada respondió, pero sin `end_turn` o fuera del esquema. `causa`: `rechazo`, `tope_tokens`,
    `parada:<x>`, `json_invalido` o `fuera_de_esquema`. Nunca lleva el texto de la respuesta ni de una excepción."""

    def __init__(self, causa: str, cruda: RespuestaCruda | None = None):
        super().__init__(causa)
        self.causa, self.cruda = causa, cruda


def salida_json(cliente: ClienteLLM, sistema: str, mensaje: str, modelo):
    """Llama con el esquema de `modelo` (Pydantic) y devuelve `(salida validada, respuesta cruda)`. Lanza
    `LlamadaFallida` si la llamada falla o tarda, y `SalidaInvalida` si la parada no es `end_turn` o la salida no
    cumple el esquema. Lo usan las sugerencias del guion y de los pasos (ajuste llm-sugerencias)."""
    from pydantic import ValidationError
    try:
        cruda = cliente.llamar(sistema, mensaje, esquema_estricto(modelo))
    except TimeoutError:
        raise LlamadaFallida('tiempo_agotado') from None
    if cruda.parada == 'refusal':
        raise SalidaInvalida('rechazo', cruda)
    if cruda.parada == 'max_tokens':
        raise SalidaInvalida('tope_tokens', cruda)
    if cruda.parada != 'end_turn':
        raise SalidaInvalida(f'parada:{cruda.parada}', cruda)
    try:
        return modelo.model_validate_json(cruda.texto), cruda
    except ValidationError as error:
        invalido = any(e['type'] == 'json_invalid' for e in error.errors())
        raise SalidaInvalida('json_invalido' if invalido else 'fuera_de_esquema', cruda) from None


def esquema_estricto(modelo) -> dict:
    """El esquema JSON de `modelo` con `additionalProperties: false` en todo objeto, como exige la salida
    estructurada."""
    def cerrar(nodo):
        if isinstance(nodo, dict):
            if nodo.get('type') == 'object':
                nodo['additionalProperties'] = False
            for valor in nodo.values():
                cerrar(valor)
        elif isinstance(nodo, list):
            for valor in nodo:
                cerrar(valor)
        return nodo
    return cerrar(modelo.model_json_schema())
