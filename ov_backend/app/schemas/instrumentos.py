"""Contratos públicos de las consultas de instrumentos, sin ids internos."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models import MomentoAplicacion, TipoInstitucion, TipoResultado, ZonaDimension
from app.schemas.catalogo import FamiliaPublica


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
    ejemplos: str | None
    fortalezas: list[str]
    desarrollo: list[str]
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
    # Textos del estudiante (ajuste resultados-intereses): cómo leer el resultado y la línea de encuadre.
    lectura: str
    mensaje: str
    guia_abierta: bool
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
    """En COMPARACION, el estudiante recibe solo la zona y la temática: los números van en null (B07).
    `puntaje_visual` es el 0–100 entero que se muestra; se deriva al consultar, no se guarda."""
    codigo: str
    nombre: str
    descripcion: str
    ejemplos: str | None
    fortalezas: list[str]
    desarrollo: list[str]
    puntaje: float | None
    puntaje_maximo: float | None
    puntaje_visual: int | None
    zona: ZonaDimension | None = None
    tematica: str | None = None


class CodigoInteresPublico(BaseModel):
    codigo: str
    hay_empate: bool


BandaAfinidad = Literal["MUY_AFIN", "AFIN", "CERCANA"]


class OcupacionAfinPublica(BaseModel):
    """Ocupación afín mostrada (ajuste resultados-intereses): `parecido` es r × 100; el r crudo no se expone."""
    posicion: int
    codigo: str
    codigo_onet: str
    titulo: str
    resumen: str | None
    riasec: list[str]
    parecido: int
    banda: BandaAfinidad
    # AMPLIA (job_zone 4–5) o INTERMEDIA (2–3); nula sin job_zone. El front filtra con ella; no cambia el corte.
    preparacion: Literal["AMPLIA", "INTERMEDIA"] | None
    familia_principal: FamiliaPublica | None


class AreaOcupaciones(BaseModel):
    """Ocupaciones mostradas agrupadas por el área (campo específico) de su familia principal; las sin familia,
    con `area_codigo` nulo, al final."""
    area_codigo: str | None
    area_nombre: str
    ocupaciones: list[str]


class OcupacionDeFamilia(BaseModel):
    codigo: str
    titulo: str
    parecido: int


class FamiliaRecomendadaPublica(BaseModel):
    """En orden de recomendación; la afinidad de la familia solo ordena y no se expone."""
    posicion: int
    codigo: str
    nombre: str
    area_codigo: str
    area_nombre: str
    descripcion: str | None
    tipos: list[TipoInstitucion]
    total_carreras: int
    total_ocupaciones: int
    ocupaciones: list[OcupacionDeFamilia]
    unica_ocupacion: bool


class ResultadoPublico(BaseModel):
    """`mensaje` y `lectura` son los de la audiencia que consulta, con el nombre del hijo ya puesto."""
    instrumento: str
    aplicacion: str
    calculado_en: datetime
    perfil_plano: bool
    mensaje: str
    lectura: str
    guia_abierta: bool
    dimensiones: list[DimensionResultado]
    dimensiones_destacadas: list[DimensionResultado] | None = None
    codigo_interes: CodigoInteresPublico | None = None
    perfil_poco_marcado: bool | None = None
    ocupaciones: list[OcupacionAfinPublica] | None = None
    por_area: list[AreaOcupaciones] | None = None
    familias: list[FamiliaRecomendadaPublica] | None = None


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
    lectura: str
    mensaje: str
    partida: str
    llegada: str
    dimensiones: list[ComparacionDimension]
