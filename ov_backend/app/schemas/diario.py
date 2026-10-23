from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel

from app.models.enums import OrigenEntrada
from app.schemas.comun import EstadoDisponibilidad


class ActividadRemitente(BaseModel):
    codigo: str
    titulo: str


class PreguntaDiarioEstado(BaseModel):
    """Pregunta DESBLOQUEABLE. `redactada`: la cuenta ya tiene su texto; `respondida`: tiene una entrada.

    Ajuste del diario (F05), todos nulos hasta recibirla: `recibida_en`, `texto` (solo redactada), `entrada` y
    `respondida_en` (la entrada que la responde), `bandeja` (RESPONDIDA si tiene entrada; si no, ARCHIVADA o
    PENDIENTE), `archivada_en` y `actividad` (la que la abrió; nula si la abrió otra cosa).
    """
    codigo: str
    nombre: str
    estado: EstadoDisponibilidad
    personalizada: bool
    redactada: bool
    respondida: bool
    recibida_en: datetime | None = None
    texto: str | None = None
    entrada: int | None = None
    respondida_en: datetime | None = None
    bandeja: Literal["PENDIENTE", "ARCHIVADA", "RESPONDIDA"] | None = None
    archivada_en: datetime | None = None
    actividad: ActividadRemitente | None = None


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
    """`cerrada`: se borró su entrada; no vuelve a responderse (ajuste del diario de F05)."""
    nombre: str
    texto: str
    fecha: date
    respondida: bool
    cerrada: bool = False


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
    """`registrado_hoy`: ya hay check-in en la fecha de Lima del servidor."""
    dias_registrados: int
    registrado_hoy: bool
    check_ins: list[CheckInRegistrado]
