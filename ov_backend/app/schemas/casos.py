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
    ultimo_puntaje: float | None
    mejor_puntaje: float | None


class OcupacionColeccion(BaseModel):
    ocupacion: str
    titulo: str
    caso: str
    obtenida_en: datetime
