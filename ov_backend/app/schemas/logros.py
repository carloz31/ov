from typing import Literal

from pydantic import BaseModel


class InsigniaEstado(BaseModel):
    codigo: str
    nombre: str
    descripcion: str | None
    requisito: str | None
    estado: Literal["BLOQUEADA", "OBTENIDA"]


class NivelEstado(BaseModel):
    numero: int
    titulo: str
    estado: Literal["BLOQUEADO", "OBTENIDO"]


class LogrosCuenta(BaseModel):
    """`afinidad`: porcentaje de actividades de la Ciudad completadas (requeridas, opcionales y adicionales), tope 100; solo la tiene el estudiante."""
    insignias: list[InsigniaEstado]
    niveles: list[NivelEstado]
    afinidad: float | None = None
