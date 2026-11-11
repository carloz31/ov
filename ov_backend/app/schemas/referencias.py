"""Contratos públicos de las referencias: lo que una actividad lee de la propia cuenta."""

from pydantic import BaseModel

from app.models.enums import EstadoReferencia, TipoReferencia


class OpcionReferida(BaseModel):
    codigo: str
    texto: str
    estado: str | None = None
    """PASOS_PLAN_A (ajuste registros llm, lote 2): PENDIENTE o HECHO."""


class PlanReferido(BaseModel):
    """Un plan con lo que leen los ecos de los registros (ajuste registros llm, lote 2), por prioridad."""
    prioridad: int
    codigo: str
    carrera: str
    institucion: str | None = None
    camino: str | None = None
    idea_origen: str | None = None
    motivos: list[OpcionReferida] = []
    relato: str | None = None


class ReferenciaResuelta(BaseModel):
    """`texto` (TEXTO) u `opciones` (ELECCION) solo cuando está DISPONIBLE; nunca la clasificación."""
    codigo: str
    tipo: TipoReferencia
    estado: EstadoReferencia
    texto: str | None = None
    opciones: list[OpcionReferida] | None = None
    cita: str | None = None
    """PLAN (B11): el relato del plan A, si lo escribió."""
    actividad: str | None = None
    """ELECCION y TEXTO (F02): código de la actividad del ítem fuente, en todo estado."""
    planes: list[PlanReferido] | None = None
    """PLANES (todos) y PLAN (solo el A), con institución, camino, motivos, relato e idea (lote 2)."""


class ReferenciasConsultadas(BaseModel):
    referencias: list[ReferenciaResuelta]
