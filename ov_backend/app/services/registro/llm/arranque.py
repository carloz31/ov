"""Arranque y línea del seguimiento (§7): el modelo escribe el comienzo de una oración y el backend le pega la segunda
respuesta tal como la escribió el estudiante."""

import re

from app.core.parametros import MAXIMO_PALABRAS_ARRANQUE
from app.services.registro.llm.filtro import ENLACE, FORMATO, mayuscula_inicial

COMILLAS = '"\'«»“”‘’'


def limpiar(arranque: str) -> str:
    """Sin comillas y sin los dos puntos (o espacios) del final."""
    sin_comillas = ''.join(c for c in arranque if c not in COMILLAS)
    return re.sub(r'[\s:]+$', '', sin_comillas).strip()


def revisar(arranque: str | None) -> tuple[str | None, str | None]:
    """(arranque limpio, causa). Sin causa, el arranque pasa."""
    if arranque is None:
        return None, 'sin_arranque'
    texto = limpiar(arranque)
    if not texto:
        return None, 'vacio'
    if len(texto.split()) > MAXIMO_PALABRAS_ARRANQUE:
        return None, f'mas_de_{MAXIMO_PALABRAS_ARRANQUE}_palabras'
    if ENLACE.search(texto):
        return None, 'enlace'
    if FORMATO.search(texto):
        return None, 'formato'
    if '?' in texto or '¿' in texto:
        return None, 'signo_de_pregunta'
    return texto, None


def linea(arranque: str | None, segunda: str) -> str:
    """«Arranque: segunda respuesta»; sin arranque válido, la segunda respuesta sola."""
    return f'{mayuscula_inicial(arranque)}: {segunda}' if arranque else segunda
