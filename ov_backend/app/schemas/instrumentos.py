"""Contratos públicos de las consultas de instrumentos, sin ids internos."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import MomentoAplicacion, NivelAjuste, TipoResultado, ZonaDimension


class OpcionPublica(BaseModel):
    orden: int
    etiqueta: str
    puntaje: float


class EscalaPublica(BaseModel):
    codigo: str
    nombre: str
    opciones: list[OpcionPublica]


class DimensionPublica(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    orden: int


class ActividadPublica(BaseModel):
    codigo: str
    titulo: str
    orden: int


class AplicacionPublica(BaseModel):
    codigo: str
    nombre: str
    momento: MomentoAplicacion
    actividades: list[ActividadPublica]


class InstrumentoPublico(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    tipo_resultado: TipoResultado
    dimensiones: list[DimensionPublica]
    escalas: list[EscalaPublica]
    aplicaciones: list[AplicacionPublica]


class ItemPublico(BaseModel):
    codigo: str
    instrumento: str
    numero: int
    orden: int
    enunciado: str
    dimension: str | None
    inverso: bool
    escala: EscalaPublica


class RespuestaPublica(BaseModel):
    item: str
    opcion: OpcionPublica
    creada_en: datetime
    actualizada_en: datetime


class RespuestasActividad(BaseModel):
    cuenta: str
    actividad: str
    respuestas: list[RespuestaPublica]


class ConteoAvance(BaseModel):
    completadas: int
    total: int
    faltantes: list[str]


class ConteoItems(BaseModel):
    respondidos: int
    total: int


class AvanceAplicacion(BaseModel):
    aplicacion: str
    estado: Literal["NO_INICIADO", "EN_PROGRESO", "COMPLETADO"]
    actividades: ConteoAvance
    items: ConteoItems
    hay_resultado_vigente: bool


class AvanceInstrumento(BaseModel):
    instrumento: str
    aplicaciones: list[AvanceAplicacion]


class DimensionResultado(BaseModel):
    """En COMPARACION, el estudiante recibe solo la zona y la temática: los números van en null (B07)."""
    codigo: str
    nombre: str
    descripcion: str
    puntaje: float | None
    puntaje_maximo: float | None
    porcentaje: float | None
    zona: ZonaDimension | None = None
    tematica: str | None = None


class CodigoInteresPublico(BaseModel):
    codigo: str
    hay_empate: bool


class CoincidenciaPublica(BaseModel):
    posicion: int
    codigo: str | None
    codigo_onet: str
    titulo: str
    correlacion: float
    ajuste: NivelAjuste


class CarreraRecomendada(BaseModel):
    codigo: str
    nombre: str
    familia: str
    via: list[CoincidenciaPublica]


class ResultadoPublico(BaseModel):
    instrumento: str
    aplicacion: str
    calculado_en: datetime
    perfil_plano: bool
    dimensiones: list[DimensionResultado]
    dimensiones_destacadas: list[DimensionResultado] | None = None
    codigo_interes: CodigoInteresPublico | None = None
    coincidencias: list[CoincidenciaPublica] | None = None
    carreras_recomendadas: list[CarreraRecomendada] | None = None


class ResultadoHistorico(ResultadoPublico):
    anulado_en: datetime | None


class ComparacionItem(BaseModel):
    """Texto de la opción elegida en cada momento; sin puntajes (HU-094)."""
    item: str
    enunciado: str
    partida: str
    llegada: str
    cambio: bool


class ComparacionDimension(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    tematica: str | None
    zona_partida: ZonaDimension
    zona_llegada: ZonaDimension
    actividades_completadas: int
    items: list[ComparacionItem]


class ComparacionAutopercepcion(BaseModel):
    instrumento: str
    partida: str
    llegada: str
    dimensiones: list[ComparacionDimension]
