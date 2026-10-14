from datetime import date, datetime

from pydantic import BaseModel

from app.models.enums import OrigenEntrada
from app.schemas.comun import EstadoDisponibilidad


class PreguntaDiarioEstado(BaseModel):
    """Pregunta DESBLOQUEABLE. `redactada`: la cuenta ya tiene su texto; `respondida`: tiene una entrada."""
    codigo: str
    nombre: str
    estado: EstadoDisponibilidad
    personalizada: bool
    redactada: bool
    respondida: bool


class EntradaDesbloqueada(BaseModel):
    """Pregunta que una acción acaba de dejar en el diario; `texto` nulo si está por redactar."""
    codigo: str
    nombre: str
    personalizada: bool
    texto: str | None


class PreguntaAbierta(BaseModel):
    codigo: str
    nombre: str
    texto: str
    respondida: bool


class PreguntaDelDia(BaseModel):
    nombre: str
    texto: str
    fecha: date
    respondida: bool


class EntradaDiarioPublica(BaseModel):
    """`titulo_mostrado`: el título; si no tiene, la pregunta; si es libre, «Entrada libre N»."""
    numero: int
    origen: OrigenEntrada
    titulo: str | None
    titulo_mostrado: str
    pregunta: str | None
    texto: str
    fecha_hora: datetime
    actualizada_en: datetime | None


class AmistadAsistente(BaseModel):
    """`siguiente_en`: puntos que pide el próximo nivel; nulo en el último."""
    puntos: int
    nivel: int
    siguiente_en: int | None


class CheckInRegistrado(BaseModel):
    fecha: date
    nivel_seguridad: int


class CheckInsCuenta(BaseModel):
    dias_registrados: int
    check_ins: list[CheckInRegistrado]
