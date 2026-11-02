from typing import Literal

from pydantic import BaseModel

from app.models.enums import GestionInstitucion, TipoInstitucion


class FamiliaPublica(BaseModel):
    """Campo detallado CINE; el área es su campo específico (2 cifras)."""
    codigo: str
    nombre: str
    area_codigo: str
    area_nombre: str


class GrupoPublico(BaseModel):
    """Grupo mayor O*NET (2 cifras); ya no filtra el catálogo, solo nombra el grupo."""
    codigo: str
    nombre: str


class FamiliaResumida(FamiliaPublica):
    """La familia en una tarjeta: su descripción, los tipos con carreras y cuántas tiene."""
    descripcion: str | None
    tipos: list[TipoInstitucion]
    total_carreras: int


class Afinidad(BaseModel):
    """Solo para el estudiante y solo si la ocupación está entre sus afines (ajuste resultados-intereses)."""
    parecido: int
    banda: Literal["MUY_AFIN", "AFIN", "CERCANA"]


class EstiloPublico(BaseModel):
    codigo: str
    nombre: str


class UbicacionPublica(BaseModel):
    codigo: str
    nombre: str


class CarreraResumen(BaseModel):
    codigo: str
    nombre: str
    tipo: TipoInstitucion
    familia: FamiliaPublica
    duracion: str | None
    riasec: list[str]
    """De 0 a 3 letras, en orden de posición."""
    es_favorita: bool


class OcupacionResumen(BaseModel):
    codigo: str
    codigo_onet: str
    titulo: str
    resumen: str | None
    grupo: str
    riasec: list[str]
    """De 0 a 3 letras (high points), en orden de posición; las militares no tienen."""
    familia_principal: FamiliaPublica | None
    """Su área es la de la ocupación; nula si la curaduría no le da familia."""
    via_familia: Literal["PRINCIPAL", "SECUNDARIA"] | None = None
    """Solo al filtrar por familia: si la tiene como principal o como secundaria."""
    es_favorita: bool


class InstitucionResumen(BaseModel):
    codigo: str
    nombre: str
    tipo: TipoInstitucion
    gestion: GestionInstitucion | None
    """Pública o privada (B11); nula si no se conoce."""
    ubicacion: UbicacionPublica
    distrito: str | None
    es_favorita: bool


class Tramo(BaseModel):
    """Ingreso mensual en soles: promedio y extremos."""
    promedio: int
    minimo: int
    maximo: int


class IngresoFamiliaPublico(BaseModel):
    ubicacion: UbicacionPublica | None
    """Nula en el promedio nacional."""
    jovenes: Tramo
    adultos: Tramo


class IngresoCarreraPublico(BaseModel):
    """Ingresos de los egresados de la familia y el tipo de la carrera, no de la carrera exacta."""
    fuente: str
    nacional: IngresoFamiliaPublico
    departamentos: list[IngresoFamiliaPublico]
    """Los que tienen dato, ordenados por nombre."""


class InstitucionEnCarrera(InstitucionResumen):
    ingreso: Tramo | None
    """Ingreso de los egresados de la institución en la familia de la carrera; nulo si no hay dato."""
    duracion_ciclos: int | None
    """Duración de la carrera en esa institución (F07b: el total de la carrera en vivo); nula si no se conoce."""


class CarreraEnInstitucion(CarreraResumen):
    ingreso: Tramo | None
    """Ingreso de los egresados de la institución en la familia de la carrera; nulo si no hay dato."""


class CarrerasParecidas(BaseModel):
    total: int
    """Cuántas otras carreras del mismo tipo hay en la familia."""
    carreras: list[CarreraResumen]
    """Hasta 3, por nombre."""


class OcupacionDeFamilia(BaseModel):
    codigo: str
    titulo: str
    riasec: list[str]
    afinidad: Afinidad | None


class OcupacionesDeLaFamilia(BaseModel):
    """Ocupaciones del catálogo a las que lleva la familia de la carrera: como principal y como secundaria."""
    principales: list[OcupacionDeFamilia]
    secundarias: list[OcupacionDeFamilia]


class CarreraDetalle(CarreraResumen):
    descripcion: str | None
    nombre_cine: str | None
    """Nombre del programa CINE, solo si difiere del de la carrera."""
    ambito_laboral: list[str]
    ocupaciones_de_la_familia: OcupacionesDeLaFamilia
    instituciones: list[InstitucionEnCarrera]
    ingreso: IngresoCarreraPublico | None
    parecidas: CarrerasParecidas


class OcupacionDetalle(OcupacionResumen):
    descripcion: str | None
    tambien_llamado: list[str]
    job_zone: int | None
    """Preparación de 1 a 5."""
    tareas: list[str]
    personalidad: str | None
    estilos_trabajo: list[EstiloPublico]
    conocimientos: list[str]
    aptitudes: list[str]
    puntajes: dict[str, int]
    """Cada dimensión RIASEC de 0 a 100."""
    familia_principal: FamiliaResumida | None
    programa_ejemplo: "ProgramaEjemplo | None"
    """Una carrera de la familia principal con un programa de referencia de la ocupación."""
    familias_secundarias: list["FamiliaSecundaria"]
    otras_ocupaciones_de_la_familia: list["OcupacionEnlace"]
    """Las demás con la misma familia principal, por título."""
    total_ocupaciones_familia: int
    """Las que llegan a la familia principal, como principal o secundaria (el filtro del catálogo)."""
    afinidad: Afinidad | None


class ProgramaEjemplo(BaseModel):
    codigo: str
    nombre: str
    tipo: TipoInstitucion
    duracion: str | None


class FamiliaSecundaria(BaseModel):
    codigo: str
    nombre: str
    total_carreras: int
    programas: list[str]
    """Nombres de las carreras de la familia con un programa de referencia de la ocupación."""


class OcupacionEnlace(BaseModel):
    codigo: str
    titulo: str


class IngresoJovenes(BaseModel):
    tipo: TipoInstitucion
    promedio_jovenes: int


class FamiliaFicha(FamiliaPublica):
    """La ficha de la familia en el catálogo de carreras (ajuste resultados-intereses)."""
    descripcion: str | None
    carreras_por_tipo: dict[TipoInstitucion, int]
    total_carreras: int
    ocupaciones_principales: int
    ocupaciones_secundarias: int
    ingresos: list[IngresoJovenes]
    """Promedio nacional de los egresados jóvenes por tipo de institución."""
    vecinas: list[FamiliaPublica]
    """Las demás familias del área con carreras, por nombre."""
    recomendada_posicion: int | None
    """Solo el estudiante: su posición (1–5) entre las familias recomendadas por su test."""


class InstitucionDetalle(InstitucionResumen):
    descripcion: str | None
    direccion: str | None
    pagina_web: str | None
    carreras: list[CarreraEnInstitucion]


class PaginaCarreras(BaseModel):
    total: int
    """Cuántas carreras cumplen los filtros, sin paginar."""
    total_dominio: int
    """Cuántas hay en todo el catálogo, sin filtros."""
    items: list[CarreraResumen]


class PaginaOcupaciones(BaseModel):
    total: int
    total_dominio: int
    items: list[OcupacionResumen]


class PaginaInstituciones(BaseModel):
    total: int
    total_dominio: int
    items: list[InstitucionResumen]


class Inesperada(BaseModel):
    """«Llévame a un lugar inesperado» (HU-042): una carrera u ocupación que la cuenta no ha visto."""
    codigo: str | None
    """Nulo solo si el catálogo no tiene otra que la actual."""
    revisitando: bool
    """La cuenta ya las vio todas: se elige una ya vista."""


# Los tipos de la ficha de ocupación se declaran después de ella.
OcupacionDetalle.model_rebuild()
