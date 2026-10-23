from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CasoCuenta(BaseModel):
    actividad: str
    titulo: str
    # Tipos RIASEC del caso, por el orden de la dimensión.
    dimensiones: list[str]
    estado: Literal["BLOQUEADA", "DISPONIBLE", "EN_CURSO", "COMPLETADA"]
    intentos: int
    superado: bool
    # Puntos de satisfacción (ajustes Central, 6): el máximo es el total de necesidades del caso.
    ultimo_puntaje: int | None
    mejor_puntaje: int | None
    # Umbral propio del caso: con un puntaje igual o mayor, el intento lo supera.
    puntaje_minimo: int
    puntaje_maximo: int


class OcupacionColeccion(BaseModel):
    ocupacion: str
    titulo: str
    caso: str
    obtenida_en: datetime
