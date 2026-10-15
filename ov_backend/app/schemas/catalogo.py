from pydantic import BaseModel

from app.models.enums import GestionInstitucion, TipoInstitucion


class FamiliaPublica(BaseModel):
    codigo: str
    nombre: str


class UbicacionPublica(BaseModel):
    codigo: str
    nombre: str


class CarreraResumen(BaseModel):
    codigo: str
    nombre: str
    familia: FamiliaPublica
    riasec: list[str]
    """De 0 a 3 letras, en orden de posición."""
    es_favorita: bool


class OcupacionResumen(BaseModel):
    codigo: str
    codigo_onet: str
    titulo: str
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
    es_favorita: bool


class RangoIngresoPublico(BaseModel):
    minimo: int
    maximo: int | None
    porcentaje: float


class IngresoPublico(BaseModel):
    promedio_mensual: int
    fuente: str
    anio: int
    rangos: list[RangoIngresoPublico]


class CarreraDetalle(CarreraResumen):
    descripcion: str | None
    duracion: str | None
    ocupaciones: list[OcupacionResumen]
    instituciones: list[InstitucionResumen]
    ingreso: IngresoPublico | None


class OcupacionDetalle(OcupacionResumen):
    descripcion: str | None
    lugares_trabajo: str | None
    conocimientos: list[str]
    habilidades: list[str]
    carreras: list[CarreraResumen]


class InstitucionDetalle(InstitucionResumen):
    descripcion: str | None
    pagina_web: str | None
    carreras: list[CarreraResumen]
