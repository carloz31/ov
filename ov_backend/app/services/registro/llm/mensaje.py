"""Lo que entra al LLM: saneo de lo que escribió el estudiante y armado del mensaje con etiquetas.

Ningún dato de la cuenta entra aquí: solo la tarjeta, la pregunta, la opción marcada, los ecos y las respuestas.
"""

import re
import unicodedata
from dataclasses import dataclass

from app.core.parametros import MAXIMO_CARACTERES_TEXTO_LLM
from app.services.registro.llm.tarjeta import Tarjeta

ETIQUETAS = ('tarjeta', 'pregunta_mostrada', 'opcion_marcada', 'ecos', 'respuesta_anterior', 'invitacion', 'respuesta')
_ETIQUETA = re.compile(r'<\s*/?\s*(?:' + '|'.join(ETIQUETAS) + r')\s*/?\s*>', re.I)


class EntradaInvalida(ValueError):
    """Un texto del estudiante pasa del largo máximo (el flujo del lote 3 lo traduce a 422)."""


@dataclass(frozen=True, slots=True)
class Entrada:
    """Todo ya resuelto por quien llama. `etiquetas`: la etiqueta marcada, lo escrito en «¿Cuál?» o la pieza con su
    origen entre paréntesis; con `ordenada` (podio) cada una lleva su lugar. En el seguimiento, `respuesta_anterior` es
    la primera respuesta e `invitacion`, la repregunta que vio el estudiante."""
    tarjeta: Tarjeta
    pregunta: str
    respuesta: str
    etiquetas: tuple[str, ...] = ()
    ordenada: bool = False
    ecos: tuple[str, ...] = ()
    respuesta_anterior: str | None = None
    invitacion: str | None = None


def _neutralizar(texto: str) -> str:
    return _ETIQUETA.sub(lambda m: m.group(0).replace('<', '‹').replace('>', '›'), texto)


def sanear(texto: str | None, con_largo: bool = True) -> str:
    """Sin caracteres de control (salvo el salto de línea) y con las etiquetas del mensaje neutralizadas.

    `con_largo`: lo escrito por el estudiante en este ítem no puede pasar de `MAXIMO_CARACTERES_TEXTO_LLM`."""
    texto = texto or ''
    if con_largo and len(texto) > MAXIMO_CARACTERES_TEXTO_LLM:
        raise EntradaInvalida(f'El texto pasa de {MAXIMO_CARACTERES_TEXTO_LLM} caracteres')
    limpio = ''.join(c for c in texto if c == '\n' or unicodedata.category(c) != 'Cc')
    return _neutralizar(limpio)


def opcion_marcada(etiquetas: tuple[str, ...], ordenada: bool) -> str:
    if ordenada:
        return ', '.join(f'{lugar}.º {etiqueta}' for lugar, etiqueta in enumerate(etiquetas, 1))
    return ', '.join(etiquetas)


def armar(entrada: Entrada) -> str:
    """Las etiquetas del prompt, en su orden; las vacías se omiten. Los ecos y la pregunta se sanean sin largo: vienen
    de textos que ya lo pasaron y llevan su nombre delante."""
    etiquetas = tuple(sanear(e) for e in entrada.etiquetas)
    partes = (('tarjeta', entrada.tarjeta.texto),
              ('pregunta_mostrada', sanear(entrada.pregunta, con_largo=False)),
              ('opcion_marcada', opcion_marcada(etiquetas, entrada.ordenada)),
              ('ecos', '\n'.join(sanear(e, con_largo=False) for e in entrada.ecos)),
              ('respuesta_anterior', sanear(entrada.respuesta_anterior)),
              ('invitacion', sanear(entrada.invitacion, con_largo=False)),
              ('respuesta', sanear(entrada.respuesta)))
    return '\n'.join(f'<{nombre}>{valor}</{nombre}>' for nombre, valor in partes if valor)
