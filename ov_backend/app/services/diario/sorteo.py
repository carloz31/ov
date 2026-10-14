"""Sorteo de la pregunta del día (B09): primero la dimensión, según el resultado de partida o llegada, y luego una
pregunta DIARIA de esa dimensión. Puro: recibe lo leído y una semilla `(cuenta, fecha)` para ser determinista."""

import random
from dataclasses import dataclass
from datetime import date

from app.core.parametros import PESO_BASE_DIMENSION


@dataclass(frozen=True, slots=True)
class PuntajeDimension:
    puntaje: float
    puntaje_maximo: float
    items: int


def pesos_dimensiones(dimensiones, puntajes: dict[int, PuntajeDimension]) -> dict[int | None, float]:
    """Peso por dimensión (None = DIARIA sin dimensión). Sin resultado, todas pesan igual."""
    if not puntajes:
        return {dimension: 1.0 for dimension in dimensiones}
    pesos = {}
    for dimension in dimensiones:
        dato = puntajes.get(dimension)
        if dimension is None or dato is None or dato.items < 1:
            pesos[dimension] = PESO_BASE_DIMENSION
        else:
            pesos[dimension] = (dato.puntaje_maximo - dato.puntaje) / dato.items + PESO_BASE_DIMENSION
    return pesos


def semilla(cuenta: str, fecha: date) -> str:
    return f'{cuenta}|{fecha.isoformat()}'


def sortear(preguntas, pesos: dict[int | None, float], excluidas: set[int], semilla_sorteo: str):
    """Sortea una dimensión según `pesos` y, dentro, una pregunta no excluida; si la dimensión no tiene ninguna,
    vuelve a sortear entre las demás. Devuelve None si no queda ninguna."""
    azar = random.Random(semilla_sorteo)
    grupos = {}
    for pregunta in sorted(preguntas, key=lambda pregunta: pregunta.codigo):
        if pregunta.id not in excluidas:
            grupos.setdefault(pregunta.dimension_id, []).append(pregunta)
    if not grupos:
        return None
    claves = sorted(grupos, key=lambda dimension: (dimension is None, dimension or 0))
    dimension = azar.choices(claves, weights=[max(pesos.get(clave, PESO_BASE_DIMENSION), 0) or 1e-9
                                              for clave in claves])[0]
    return azar.choice(grupos[dimension])
