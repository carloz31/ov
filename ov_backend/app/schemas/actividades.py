from typing import Literal

from pydantic import BaseModel

from app.models import Espacio, TipoActividad, Visibilidad
from app.schemas.comun import EstadoDisponibilidad
from app.schemas.motor import MotivoBloqueo


class ActividadCuenta(BaseModel):
    codigo: str
    titulo: str
    tipo: TipoActividad
    orden: int
    contenido: str
    visibilidad: Visibilidad
    visible: bool
    estado: Literal["BLOQUEADA", "DISPONIBLE", "EN_CURSO", "COMPLETADA"]
    requerida: bool
    duracion_estimada_min: int | None
    descripcion: str | None
    bloqueo: list[MotivoBloqueo] | None


class BloqueActividades(BaseModel):
    codigo: str
    nombre: str
    numero: int
    espacio: Espacio
    estado: EstadoDisponibilidad
    bloqueo: list[MotivoBloqueo] | None
    actividades: list[ActividadCuenta]
