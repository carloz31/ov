from datetime import datetime

from pydantic import BaseModel

from app.schemas.cuentas import NivelActual


class AvanceRuta(BaseModel):
    """Actividades requeridas completadas sobre las requeridas de los bloques de la audiencia de la cuenta."""
    completadas: int
    total: int
    porcentaje: float


class Diploma(BaseModel):
    obtenido: bool
    obtenido_en: datetime | None


class EstudianteVinculado(BaseModel):
    codigo: str
    nombre: str
    avance: AvanceRuta
    nivel_actual: NivelActual | None


class FamiliaApoderado(BaseModel):
    """La ruta del apoderado (HU-078, HU-079) y el avance de su hijo (HU-080); `estudiante` nulo sin vínculo activo."""
    avance: AvanceRuta
    diploma: Diploma
    estudiante: EstudianteVinculado | None
