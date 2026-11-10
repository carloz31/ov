"""Arranque y línea del seguimiento (§7): el modelo escribe el comienzo de una oración y el backend le pega la segunda
respuesta tal como la escribió el estudiante."""

import re
from collections.abc import Iterable

from app.core.parametros import MAXIMO_PALABRAS_ARRANQUE, MINIMO_PALABRAS_AJENAS_ARRANQUE
from app.models.base import sin_tildes
from app.services.registro.llm.filtro import ENLACE, FORMATO, mayuscula_inicial

COMILLAS = '"\'«»“”‘’'
# Lo que se quita del final, en este orden («es que» antes que «es»), hasta que no quede ninguno.
COLAS = ('es que', 'es', 'fue', 'sería', 'cuando', 'porque')
# Palabras de función (sin tildes): no cuentan como contenido al buscar palabras de las respuestas en el arranque.
FUNCION = frozenset('''
a al ante bajo con contra de del desde durante en entre hacia hasta mediante para por segun sin sobre tras
el la los las lo un una unos unas
yo me mi mis mio mia conmigo tu te ti tus el ella ellos ellas le les se si su sus nos nosotros nuestro nuestra
este esta esto estos estas ese esa eso esos esas aquel aquella
que quien quienes cual cuales cuando donde como cuanto cuanta porque pues
y e o u ni pero sino tambien tampoco ya no mas muy
es son era fue ser estar esta estoy hay ha he han habia seria
'''.split())


def _palabras(texto: str | None) -> set[str]:
    return set(re.findall(r'\w+', sin_tildes((texto or '').lower())))


def limpiar(arranque: str) -> str:
    """Sin comillas, sin los dos puntos (o espacios) del final y sin las COLAS que el modelo deja colgando."""
    texto = re.sub(r'[\s:,]+$', '', ''.join(c for c in arranque if c not in COMILLAS)).strip()
    cambio = True
    while cambio:
        cambio = False
        for cola in COLAS:
            nuevo = re.sub(rf'(?:^|\s+){cola}$', '', texto, flags=re.I)
            if nuevo != texto:
                texto, cambio = re.sub(r'[\s:,]+$', '', nuevo).strip(), True
                break
    return texto


def palabras_ajenas(arranque: str, respuestas: Iterable[str | None], invitacion: str | None,
                    etiquetas: Iterable[str]) -> set[str]:
    """Palabras de contenido del arranque que están en alguna respuesta y no en la repregunta mostrada ni en la opción."""
    vistas = _palabras(invitacion).union(*(_palabras(e) for e in etiquetas))
    de_respuestas = set().union(*(_palabras(r) for r in respuestas))
    return (_palabras(arranque) - FUNCION) & de_respuestas - vistas


def revisar(arranque: str | None, respuestas: Iterable[str | None] = (), invitacion: str | None = None,
            etiquetas: Iterable[str] = ()) -> tuple[str | None, str | None]:
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
    if len(palabras_ajenas(texto, respuestas, invitacion, etiquetas)) >= MINIMO_PALABRAS_AJENAS_ARRANQUE:
        return None, 'palabras_de_la_respuesta'
    return texto, None


def linea(arranque: str | None, segunda: str) -> str:
    """«Arranque: segunda respuesta»; sin arranque válido, la segunda respuesta sola."""
    return f'{mayuscula_inicial(arranque)}: {segunda}' if arranque else segunda
