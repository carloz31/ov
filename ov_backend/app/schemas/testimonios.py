from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad


class TestimonioEstado(BaseModel):
    codigo: str
    titulo: str
    estado: EstadoDisponibilidad
    visto: bool
    # Bloqueado: solo la pista. Disponible: la descripción y el enlace.
    pista: str | None
    descripcion: str | None
    enlace: str | None
