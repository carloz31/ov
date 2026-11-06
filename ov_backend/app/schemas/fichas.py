from datetime import datetime

from pydantic import BaseModel

from app.schemas.comun import EstadoDisponibilidad


class ActividadFicha(BaseModel):
    # La actividad cuya regla dio la ficha (la primera condición COMPLETA_ACTIVIDAD).
    codigo: str
    titulo: str


class TramoFicha(BaseModel):
    # El bloque de esa actividad, solo si es del Camino (MISIONES_CAMPO).
    codigo: str
    nombre: str
    numero: int


class FichaCuenta(BaseModel):
    codigo: str
    titulo: str
    estado: EstadoDisponibilidad
    # Solo con la ficha obtenida; nulos si está bloqueada (ajuste mochila). Lo de la tarjeta: el contenido va
    # aparte, en FichaDetalle.
    tema: str | None
    descripcion: str | None
    obtenida_en: datetime | None
    # La cuenta abrió esta ficha (evento VISTA_FICHA con esta ficha como referencia).
    visto: bool
    # La marcó como favorita (solo obtenida; ajuste mochila).
    es_favorita: bool
    # F08: también en las bloqueadas.
    actividad: ActividadFicha | None
    tramo: TramoFicha | None


class FichaDetalle(BaseModel):
    """GET /cuentas/{c}/fichas/{codigo}: el texto de una ficha obtenida, que el modal pide al abrirse."""
    codigo: str
    titulo: str
    # Markdown, sin repetir el título.
    contenido: str
