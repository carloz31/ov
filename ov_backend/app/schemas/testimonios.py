from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad


class OcupacionTestimonio(BaseModel):
    codigo: str
    titulo: str


class CasoTestimonio(BaseModel):
    # La actividad CASO cuya superación regala el testimonio.
    codigo: str
    titulo: str


class ActividadTestimonio(BaseModel):
    # La actividad cuya COMPLETA_ACTIVIDAD abre el testimonio (ajuste testimonios).
    codigo: str
    titulo: str


class TestimonioEstado(BaseModel):
    codigo: str
    titulo: str
    estado: EstadoDisponibilidad
    visto: bool
    # Bloqueado: solo la pista. Disponible: la descripción, el video con su tramo y quién lo cuenta.
    pista: str | None
    descripcion: str | None
    video_id: str | None
    inicio: int | None
    fin: int | None
    persona: str | None
    ocupacion: OcupacionTestimonio | None
    contexto: str | None
    cita: str | None
    # El origen, siempre y bloqueado o no: el caso (ajustes Central, 7) o la actividad (ajuste testimonios), nunca los dos.
    caso: CasoTestimonio | None
    actividad: ActividadTestimonio | None
    # Su origen ya está disponible para la cuenta (ajuste mochila): solo entonces la voz bloqueada se lista.
    caso_disponible: bool
    actividad_disponible: bool
    # La cuenta lo marcó como favorito (ajuste mochila).
    es_favorita: bool
