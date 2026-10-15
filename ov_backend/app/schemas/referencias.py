"""Contratos públicos de las referencias: lo que una actividad lee de la propia cuenta."""

from pydantic import BaseModel

from app.models.enums import EstadoReferencia, TipoReferencia


class OpcionReferida(BaseModel):
    codigo: str
    texto: str


class ReferenciaResuelta(BaseModel):
    """`texto` (TEXTO) u `opciones` (ELECCION) solo cuando está DISPONIBLE; nunca la clasificación."""
    codigo: str
    tipo: TipoReferencia
    estado: EstadoReferencia
    texto: str | None = None
    opciones: list[OpcionReferida] | None = None
    cita: str | None = None
    """PLAN (B11): el relato del plan A, si lo escribió."""


class ReferenciasConsultadas(BaseModel):
    referencias: list[ReferenciaResuelta]
