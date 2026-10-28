from pydantic import BaseModel

from app.models.enums import GestionInstitucion, TipoInstitucion


class FamiliaPublica(BaseModel):
    """Campo detallado CINE; el área es su campo de educación."""
    codigo: str
    nombre: str
    area_codigo: str
    area_nombre: str


class GrupoPublico(BaseModel):
    """Grupo mayor O*NET (2 cifras)."""
    codigo: str
    nombre: str


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
    """De 1 a 3 letras (high points), en orden de posición."""
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


class CarreraDetalle(CarreraResumen):
    descripcion: str | None
    nombre_cine: str | None
    """Nombre del programa CINE, solo si difiere del de la carrera."""
    ambito_laboral: list[str]
    ocupaciones: list[OcupacionResumen]
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
    carreras: list[CarreraResumen]


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
