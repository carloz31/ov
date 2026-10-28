from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.acciones import AccionCuenta


# F08: sin «por_conversar»; con las dos respuestas, la conversación ya está conversada.
EstadoConversacion = Literal["bloqueada", "sin_responder", "esperando_al_otro", "te_toca", "conversada"]


class ResponderConversacionEntrada(AccionCuenta):
    conversacion: str
    texto: str
    # Solo el apoderado: el hijo del vínculo; sin él, el primer vínculo activo (F08).
    estudiante: str | None = None

    @field_validator("texto")
    @classmethod
    def texto_no_vacio(cls, texto: str) -> str:
        if not texto.strip():
            raise ValueError("La respuesta no puede estar vacía")
        return texto


class EntradaDiarioConversacion(BaseModel):
    # La pregunta del diario que abre conversarla, ya desbloqueada para el estudiante.
    codigo: str
    nombre: str
    pregunta: str


class ConversacionCuenta(BaseModel):
    """Una conversación vista por quien consulta. Lo del otro y la guía, solo con las dos respuestas."""
    codigo: str
    orden: int
    titulo: str
    # El chip de la tarjeta; nulo, sin chip.
    tema: str | None
    pregunta: str
    estado: EstadoConversacion
    # Por qué está bloqueada: sin carta propia, o la regla del estudiante; nulo si no lo está.
    bloqueo_mensaje: str | None
    # Solo el apoderado: si el hijo ya la tiene habilitada; nulo para el estudiante.
    abierta_para_hijo: bool | None
    mi_respuesta: str | None
    conversada_en: datetime | None
    pregunta_otro: str | None
    respuesta_otro: str | None
    preguntas_guia: list[str] | None
    mensaje_diferencias: str | None
    algo_que_saben: str | None
    # Solo el estudiante, con la conversación conversada y su pregunta del diario desbloqueada.
    entrada_diario: EntradaDiarioConversacion | None


class OtroVinculo(BaseModel):
    """La otra persona del vínculo: el remitente de la carta recibida."""
    codigo: str
    nombre: str
    parentesco: str | None


class ConversacionesCuenta(BaseModel):
    """La carta del otro, solo con `cartas_disponibles` (todas conversadas)."""
    carta_pendiente: bool
    completadas: int
    total: int
    cartas_disponibles: bool
    carta_propia: str | None
    carta_recibida: str | None
    otro: OtroVinculo
    conversaciones: list[ConversacionCuenta]
