from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class IntentoBatalla(BaseModel):
    victoria: bool
    aciertos: int
    preguntas: int
    fecha_hora: datetime


class BatallaCuenta(BaseModel):
    actividad: str
    titulo: str
    estado: Literal["BLOQUEADA", "DISPONIBLE", "EN_CURSO", "COMPLETADA"]
    intentos: int
    superada: bool
    # El primer intento es el que cuenta para la métrica de conocimiento.
    primer_intento: IntentoBatalla | None
