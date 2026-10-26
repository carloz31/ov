from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad


class OcupacionTestimonio(BaseModel):
    codigo: str
    titulo: str


class CasoTestimonio(BaseModel):
    # La actividad CASO cuya superación regala el testimonio.
    codigo: str
    titulo: str


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
    # El caso ya está disponible para la cuenta (ajuste mochila): solo entonces la voz bloqueada se lista.
    caso_disponible: bool
    # La cuenta lo marcó como favorito (ajuste mochila).
    es_favorita: bool
