from typing import Literal

from pydantic import BaseModel


class ConteoAvance(BaseModel):
    """Completadas sobre todas las actividades del grupo (requeridas y opcionales), total fijo; tope 100."""
    completadas: int
    total: int
    porcentaje: float


class TramoActual(BaseModel):
    """Primer bloque del camino con una requerida pendiente; cuenta solo sus requeridas."""
    codigo: str
    nombre: str
    numero: int
    completadas: int
    total: int


class Tramo(BaseModel):
    """Un bloque del camino (ajuste pasaporte-perfil): sus requeridas completadas sobre su total fijo."""
    codigo: str
    nombre: str
    numero: int
    completadas: int
    total: int
    estado: Literal["COMPLETO", "ACTUAL", "PENDIENTE"]


class ConteoRequeridas(BaseModel):
    completadas: int
    total: int


class AvanceEstudiante(BaseModel):
    """Ajuste del panel (F05): avance del panel del estudiante. `camino_completo` no depende del porcentaje."""
    camino: ConteoAvance
    tramo_actual: TramoActual | None
    camino_completo: bool
    ciudad: ConteoAvance
    tramos: list[Tramo]
    requeridas: ConteoRequeridas
