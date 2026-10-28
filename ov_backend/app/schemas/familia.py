from datetime import datetime

from pydantic import BaseModel

from app.models import MomentoAplicacion
from app.schemas.cuentas import NivelActual


class AvanceRuta(BaseModel):
    """Actividades requeridas completadas sobre las requeridas de los bloques de la audiencia de la cuenta."""
    completadas: int
    total: int
    porcentaje: float


class Diploma(BaseModel):
    obtenido: bool
    obtenido_en: datetime | None
    # F08: determinista desde la cuenta y el año de emisión; nulo sin diploma.
    codigo: str | None


class AplicacionHijo(BaseModel):
    """Ajuste inicio-apoderado: `completado_en` es el `calculado_en` del resultado vigente del hijo; nulo sin él."""
    aplicacion: str
    nombre: str
    momento: MomentoAplicacion
    completado_en: datetime | None


class CuestionarioHijo(BaseModel):
    """Un cuestionario visible al apoderado en el salón del hijo; sin puntajes (siguen en `/familia/resultados`)."""
    instrumento: str
    nombre: str
    aplicaciones: list[AplicacionHijo]


class EstudianteVinculado(BaseModel):
    codigo: str
    nombre: str
    avance: AvanceRuta
    nivel_actual: NivelActual | None
    cuestionarios: list[CuestionarioHijo]


class FamiliaApoderado(BaseModel):
    """La ruta del apoderado (HU-078, HU-079) y el avance de sus hijos (HU-080), en el orden de sus vínculos activos;
    lista vacía sin vínculo (ajuste inicio-apoderado)."""
    avance: AvanceRuta
    diploma: Diploma
    estudiantes: list[EstudianteVinculado]
