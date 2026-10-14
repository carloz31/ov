from pydantic import BaseModel


class AvanceTematica(BaseModel):
    """Actividades completadas sobre el total de las de la temática (HU-075)."""
    codigo: str
    nombre: str
    completadas: int
    total: int
    porcentaje: float
