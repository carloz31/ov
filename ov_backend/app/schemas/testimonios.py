from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad


class OcupacionTestimonio(BaseModel):
    codigo: str
    titulo: str


class CasoTestimonio(BaseModel):
    # La actividad CASO cuya superación regala el testimonio, y si la cuenta ya puede jugarla.
    codigo: str
    titulo: str
    disponible: bool


class TestimonioEstado(BaseModel):
    codigo: str
    titulo: str
    estado: EstadoDisponibilidad
    visto: bool
    # Bloqueado: solo la pista. Disponible: la descripción, el enlace y quién lo cuenta.
    pista: str | None
    descripcion: str | None
    enlace: str | None
    persona: str | None
    ocupacion: OcupacionTestimonio | None
    anios_experiencia: int | None
    cita: str | None
    # Siempre, bloqueado o no (ajustes Central, 7); nulo si ninguna regla SUPERA_CASO lo abre.
    caso: CasoTestimonio | None
