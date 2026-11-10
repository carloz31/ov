"""Filtro de la repregunta: el del runner de `tests/llm` (v7.12c, piloto-claude-3) más tres cuidados del lote 1.

El léxico es_ES (LibreOffice, `lexico/`) lo lee `spylls`: es la excepción aprobada a «app no lee archivos de datos».
"""

import html
import re
from functools import lru_cache
from pathlib import Path

from spylls.hunspell import Dictionary

from app.core.parametros import MAXIMO_PALABRAS_REPREGUNTA_LLM
from app.models.base import sin_tildes

LEXICO = Path(__file__).resolve().parent / 'lexico' / 'es_ES'
PROHIBIDAS = ('específicamente', '¿podrías', 'desarrolla', 'explica', 'demuestra', 'demostraste')
PERMITIDOS = re.compile(r'''[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:¿?¡!()«»"'“”‘’…–—-]*''')
PALABRA = re.compile(r'[^\W\d_]+')
TRUNCAMIENTOS = ('qu', 'dnde', 'cmo')  # palabras rotas que el léxico no atrapa siempre («qu» es una entrada de es_ES)
FORMATO = re.compile(r'<[^>]*>|\*\*|__|`|^\s*#|\[[^\]]*\]\([^)]*\)', re.M)
ENLACE = re.compile(r'https?://|www\.|\b[\w-]+\.(?:com|net|org|edu|gob|pe|io|ly|app|me|info)\b', re.I)


@lru_cache(maxsize=1)
def _lexico():
    return Dictionary.from_files(str(LEXICO))


@lru_cache(maxsize=None)
def en_lexico(palabra: str) -> bool:
    return _lexico().lookup(palabra)


def palabras_permitidas(*textos: str | None) -> frozenset[str]:
    """Lo que escribió o marcó el estudiante (y sus ecos) vale aunque no esté en el léxico: nombres, lugares, carreras."""
    return frozenset(p.lower() for texto in textos if texto for p in PALABRA.findall(texto))


def abrir_interrogacion(texto: str) -> str:
    """Con «?» y sin «¿», agrega el «¿» al inicio de la oración interrogativa (no mueve uno mal puesto)."""
    if '?' not in texto or '¿' in texto:
        return texto
    fin = texto.index('?')
    inicio = max(texto.rfind(signo, 0, fin) for signo in '.!:;…') + 1
    inicio += len(texto[inicio:]) - len(texto[inicio:].lstrip())
    return f'{texto[:inicio]}¿{texto[inicio:]}'


def mayuscula_inicial(texto: str) -> str:
    for i, caracter in enumerate(texto):
        if caracter.isalpha():
            return texto[:i] + caracter.upper() + texto[i + 1:]
    return texto


def filtrar(repregunta: str, tipo: str, etiquetas: tuple[str, ...], filtrar_etiqueta: bool,
            permitidas: frozenset[str]) -> tuple[str, list[str]]:
    """(texto, reglas incumplidas). El texto vuelve con las entidades HTML decodificadas y el «¿» agregado si faltaba.

    La etiqueta de la opción no se filtra en `fuera_de_tema`: su base la nombra (hoy solo b1-1-logro filtra etiqueta)."""
    texto = abrir_interrogacion(html.unescape(repregunta).strip())
    normal, reglas = sin_tildes(texto), []
    if FORMATO.search(texto):
        reglas.append('formato')
    if ENLACE.search(texto):
        reglas.append('enlace')
    for palabra in PROHIBIDAS:
        if re.search(rf'(?<!\w){re.escape(sin_tildes(palabra))}(?!\w)', normal):
            reglas.append(f'prohibida:{palabra}')
    if filtrar_etiqueta and tipo != 'fuera_de_tema' and any(sin_tildes(e) in normal for e in etiquetas):
        reglas.append('etiqueta_opcion')
    if len(texto.split()) > MAXIMO_PALABRAS_REPREGUNTA_LLM:
        reglas.append(f'mas_de_{MAXIMO_PALABRAS_REPREGUNTA_LLM}_palabras')
    if texto.count('?') > 1:
        reglas.append('mas_de_una_pregunta')
    if not texto.endswith(('?', '.')):
        reglas.append('no_termina_en_interrogacion_ni_punto')
    if not PERMITIDOS.fullmatch(texto):
        reglas.append('caracteres')
    for palabra in PALABRA.findall(texto):
        if palabra.lower() in TRUNCAMIENTOS:
            reglas.append(f'palabra_truncada:{palabra}')
        # Con la mayúscula original: el léxico solo conoce los nombres propios así («Arequipa»).
        elif palabra.lower() not in permitidas and not en_lexico(palabra):
            reglas.append(f'palabra_extrana:{palabra}')
    return texto, reglas
