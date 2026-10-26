from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.acciones import FechaAccion


class GrupoInsigniaPublico(BaseModel):
    codigo: str
    nombre: str
    orden: int


class InsigniaEstado(BaseModel):
    """Una oculta no obtenida va enmascarada, pero conserva `grupo`, `orden` y `pista` (ajuste pasaporte-perfil)."""
    codigo: str
    nombre: str
    descripcion: str | None
    requisito: str | None
    estado: Literal["BLOQUEADA", "OBTENIDA"]
    grupo: GrupoInsigniaPublico
    orden: int
    pista: str | None
    obtenida_en: datetime | None


class NivelEstado(BaseModel):
    numero: int
    titulo: str
    descripcion: str | None
    estado: Literal["BLOQUEADO", "OBTENIDO"]


class LogrosCuenta(BaseModel):
    """`afinidad`: porcentaje de actividades de la Ciudad completadas (requeridas, opcionales y adicionales), tope 100; solo la tiene el estudiante.
    `vitrina`: códigos de las insignias que la cuenta muestra a sus compañeros, en orden (hasta 3)."""
    insignias: list[InsigniaEstado]
    niveles: list[NivelEstado]
    vitrina: list[str]
    afinidad: float | None = None


class VitrinaEntrada(FechaAccion):
    cuenta: str
    codigos: list[str]


class VitrinaCuenta(BaseModel):
    vitrina: list[str]
