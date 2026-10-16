from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.acciones import AccionCuenta


EstadoConversacion = Literal["sin_responder", "esperando_al_otro", "te_toca", "por_conversar", "conversada"]


class ResponderConversacionEntrada(AccionCuenta):
    conversacion: str
    texto: str

    @field_validator("texto")
    @classmethod
    def texto_no_vacio(cls, texto: str) -> str:
        if not texto.strip():
            raise ValueError("La respuesta no puede estar vacía")
        return texto


class ConversacionCuenta(BaseModel):
    """Una conversación vista por quien consulta. Lo del otro y la guía, solo con las dos respuestas."""
    codigo: str
    titulo: str
    pregunta: str
    estado: EstadoConversacion
    mi_respuesta: str | None
    conversada_en: datetime | None
    respuesta_otro: str | None
    preguntas_guia: list[str] | None
    mensaje_diferencias: str | None


class ConversacionesCuenta(BaseModel):
    """Sin carta propia, `carta_pendiente` y ninguna conversación. La carta del otro, solo con todas conversadas."""
    carta_pendiente: bool
    completadas: int
    total: int
    carta_propia: str | None
    carta_recibida: str | None
    conversaciones: list[ConversacionCuenta]
