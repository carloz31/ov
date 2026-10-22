from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.comun import ContenidoEstado


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
    preguntas_por_intento: int
    # Las fichas de las que salen sus preguntas, en el orden de su primera pregunta (F04b).
    fichas: list[ContenidoEstado]


class OpcionPregunta(BaseModel):
    # Índice de la opción en la pregunta: es lo que se responde, aunque el orden llegue mezclado.
    indice: int
    texto: str


class FichaPregunta(BaseModel):
    codigo: str
    titulo: str


class PreguntaIntento(BaseModel):
    codigo: str
    enunciado: str
    opciones: list[OpcionPregunta]
    correcta: int
    explicacion: str
    ficha: FichaPregunta
