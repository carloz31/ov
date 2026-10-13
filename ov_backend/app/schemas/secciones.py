from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad
from app.schemas.motor import MotivoBloqueo


class SeccionEstado(BaseModel):
    codigo: str
    nombre: str
    estado: EstadoDisponibilidad
    bloqueo: list[MotivoBloqueo] | None
