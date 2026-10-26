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
    # Solo con la ficha obtenida; nulos si está bloqueada (ajuste mochila).
    tema: str | None
    descripcion: str | None
    contenido: str | None
    obtenida_en: datetime | None
    # La cuenta abrió esta ficha (evento VISTA_FICHA con esta ficha como referencia).
    visto: bool
    # La marcó como favorita (solo obtenida; ajuste mochila).
    es_favorita: bool
    actividad: ActividadFicha | None
    tramo: TramoFicha | None
