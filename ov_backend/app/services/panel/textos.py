"""Textos que arma el servidor para el perfil del estudiante (ajuste panel-estudiantes): uniones «a, b y c» y fechas
en palabras. Solo dan forma a datos de la base; los textos fijos están en las filas de `alerta` y en sus parámetros."""

from collections.abc import Iterable, Mapping
from datetime import date, datetime

MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
         "noviembre", "diciembre")


def unir(partes: Iterable[str]) -> str:
    """«a», «a y b», «a, b y c»."""
    partes = [str(p) for p in partes]
    if len(partes) <= 1:
        return "".join(partes)
    return f"{', '.join(partes[:-1])} y {partes[-1]}"


def fecha_en_palabras(fecha: date | datetime) -> str:
    """«12 de noviembre»."""
    return f"{fecha.day} de {MESES[fecha.month - 1]}"


def fechas_en_palabras(fechas: Iterable[date | datetime]) -> str:
    """En el orden dado: «el 7, 10 y 12 de noviembre»; meses distintos: «el 30 de octubre, 2 y 5 de noviembre»."""
    grupos: list[tuple[int, list[int]]] = []
    for fecha in fechas:
        if grupos and grupos[-1][0] == fecha.month:
            grupos[-1][1].append(fecha.day)
        else:
            grupos.append((fecha.month, [fecha.day]))
    if not grupos:
        return ""
    trozos = [f"{unir(map(str, dias))} de {MESES[mes - 1]}" for mes, dias in grupos]
    return "el " + ", ".join(trozos)


class _Textos(dict):
    """`{clave}` sin valor queda tal cual."""

    def __missing__(self, clave):
        return "{" + clave + "}"


def resolver_texto(texto: str | None, *valores: Mapping) -> str | None:
    """`{clave}` con el primer mapeo que la tenga, de izquierda a derecha."""
    if texto is None:
        return None
    juntos = {}
    for mapeo in reversed(valores):
        juntos.update(mapeo)
    return texto.format_map(_Textos(juntos))
