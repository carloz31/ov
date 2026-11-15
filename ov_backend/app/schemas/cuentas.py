from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import Rol, TipoEventoUso, TipoObjetivo
from app.schemas.motor import ObjetivoLegible, ProgresoCondicion, ResultadoEvaluador


class CuentaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    nombre: str
    rol: Rol


class SalonDatos(BaseModel):
    """Un salón: su código, la promoción (año de egreso) y la sección. El front lo nombra según el año en curso
    («Quinto A», «Promoción 2024 A»)."""
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    promocion: int
    seccion: str


class NivelActual(BaseModel):
    numero: int
    titulo: str
    descripcion: str | None
    cita_lumi: str | None


class ResumenCuenta(BaseModel):
    cuenta: CuentaResumen
    nivel_actual: NivelActual | None


class ObjetivoProgreso(BaseModel):
    tipo: TipoObjetivo
    codigo: str


class ProgresoRegla(BaseModel):
    regla: str
    mensaje_bloqueo: str
    cumplida: bool
    condiciones: list[ProgresoCondicion]
    evaluador_especial: ResultadoEvaluador | None = None


class ProgresoObjetivo(BaseModel):
    objetivo: ObjetivoProgreso
    disponible: bool
    reglas: list[ProgresoRegla]


class EventoLegible(BaseModel):
    tipo: TipoEventoUso
    referencia: str | None
    fecha_hora: datetime


class DesbloqueoLegible(BaseModel):
    regla: str
    tipo_objetivo: TipoObjetivo
    objetivo: ObjetivoLegible
    fecha_hora: datetime
