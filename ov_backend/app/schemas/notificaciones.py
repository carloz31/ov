from datetime import datetime

from pydantic import BaseModel

from app.models import TipoNotificacion


class NotificacionPublica(BaseModel):
    codigo: str
    tipo: TipoNotificacion
    referencia: str
    nombre: str
    detalle: str | None
    creada_en: datetime
    vista: bool
    # Solo RESPUESTA_CONVERSACION del apoderado: el hijo del vínculo.
    estudiante: str | None = None


class PaginaNotificaciones(BaseModel):
    total: int
    no_vistas: int
    items: list[NotificacionPublica]


class MarcarVistasEntrada(BaseModel):
    """Sin códigos, todas las pendientes."""
    codigos: list[str] = []


class NotificacionesMarcadas(BaseModel):
    marcadas: int
