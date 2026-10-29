from datetime import datetime
import re
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, StringConstraints, field_validator, model_validator

from app.models.enums import EstadoInvestigacion, MotivoReporte, OrigenPreguntaGuion
from app.schemas.acciones import AccionCuenta


Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
# Enlaces de un video de YouTube: watch, youtu.be, shorts, embed o live, con el id de 11 caracteres.
ENLACE_YOUTUBE = re.compile(
    r'https?://(?:(?:www|m)\.)?(?:youtube\.com/(?:watch\?(?:[^#\s]*&)?v=|shorts/|embed/|live/)|youtu\.be/)'
    r'[A-Za-z0-9_-]{11}(?:[?&#][^\s]*)?')


def _enlace_youtube(valor: str) -> str:
    if not ENLACE_YOUTUBE.fullmatch(valor):
        raise ValueError('El enlace debe ser de un video de YouTube')
    return valor


EnlaceYoutube = Annotated[str, StringConstraints(strip_whitespace=True), AfterValidator(_enlace_youtube)]


def _sin_repetidos(valores: list[str]) -> list[str]:
    if len(set(valores)) != len(valores):
        raise ValueError('Los coautores no pueden repetirse')
    return valores


# --- Entradas -----------------------------------------------------------------------------------

class GuardarLoQuePiensoEntrada(AccionCuenta):
    """Crea la investigación o edita la que está en curso (HU-057 y HU-100)."""
    ocupacion: str
    dia: Texto
    necesita: Texto
    duda: Texto


class PedirSugerenciasEntrada(AccionCuenta):
    pass


class CancelarInvestigacionEntrada(AccionCuenta):
    pass


class PreguntaGuionEntrada(BaseModel):
    origen: OrigenPreguntaGuion
    texto: Texto
    sugerencia: str | None = None
    """Código de la sugerencia agregada; obligatorio en SUGERIDA y prohibido en los demás orígenes."""

    @model_validator(mode='after')
    def validar_sugerencia(self):
        if (self.origen == OrigenPreguntaGuion.SUGERIDA) != (self.sugerencia is not None):
            raise ValueError('Solo una pregunta sugerida lleva el código de su sugerencia')
        return self


class GuardarGuionEntrada(AccionCuenta):
    """Reemplaza el guion entero. `terminar` pasa la investigación a guía lista."""
    preguntas: list[PreguntaGuionEntrada]
    descartadas: list[str] = []
    terminar: bool = False

    @model_validator(mode='after')
    def validar_sugerencias(self):
        agregadas = [pregunta.sugerencia for pregunta in self.preguntas if pregunta.sugerencia is not None]
        if len(set(agregadas)) != len(agregadas) or set(agregadas) & set(self.descartadas):
            raise ValueError('Cada sugerencia se agrega o se descarta una sola vez')
        if self.terminar and not any(p.origen != OrigenPreguntaGuion.SUGERIDA for p in self.preguntas):
            raise ValueError('Para terminar el guion agrega al menos una pregunta tuya')
        return self


class FichaEntrevistaEntrada(AccionCuenta):
    titulo: Texto
    profesional: Texto
    duracion: Texto
    enlace: EnlaceYoutube
    resumen: Texto


class PublicarEntrevistaEntrada(FichaEntrevistaEntrada):
    """Publica la investigación con guía lista de `cuenta`, con coautores de su salón (HU-060 y HU-061)."""
    coautores: Annotated[list[str], AfterValidator(_sin_repetidos)] = []
    permiso: bool

    @field_validator('permiso')
    @classmethod
    def exigir_permiso(cls, valor):
        if not valor:
            raise ValueError('Confirma que la persona entrevistada dio su permiso')
        return valor


class EditarEntrevistaEntrada(FichaEntrevistaEntrada):
    """Cualquier autor edita la ficha y puede sumar coautores; no puede quitarlos."""
    entrevista: str
    coautores_nuevos: Annotated[list[str], AfterValidator(_sin_repetidos)] = []


class EntrevistaEntrada(AccionCuenta):
    entrevista: str


ComentarioOpcional = Annotated[str | None, StringConstraints(strip_whitespace=True)]


class ReaccionarEntrada(AccionCuenta):
    """Crea o cambia la reacción de la cuenta (HU-063). El comentario vacío cuenta como ausente."""
    entrevista: str
    tipo: str
    comentario: ComentarioOpcional = None

    @field_validator('comentario')
    @classmethod
    def vacio_es_nulo(cls, valor):
        return valor or None


class ReaccionEntrada(AccionCuenta):
    reaccion: str


class ReportarEntrada(AccionCuenta):
    """Reporta una entrevista o una reacción, exactamente una."""
    entrevista: str | None = None
    reaccion: str | None = None
    motivo: MotivoReporte
    detalle: ComentarioOpcional = None

    @model_validator(mode='after')
    def un_contenido(self):
        if (self.entrevista is None) == (self.reaccion is None):
            raise ValueError('Reporta una entrevista o una reacción')
        self.detalle = self.detalle or None
        return self


class DestacarEntrada(AccionCuenta):
    entrevista: str
    destacada: bool


class ComentarEntrada(AccionCuenta):
    """Comentario de la orientadora a los autores; con `reaccion`, edita uno suyo."""
    entrevista: str
    texto: Texto
    reaccion: str | None = None


class ReporteEntrada(AccionCuenta):
    reporte: str


# --- Salidas ------------------------------------------------------------------------------------

class OcupacionBreve(BaseModel):
    codigo: str
    titulo: str


class NivelBreve(BaseModel):
    numero: int
    titulo: str


class PersonaInvestigacion(BaseModel):
    """Un estudiante como autor o aliado. `nivel` es nulo si la cuenta está inactiva o aún no tiene nivel."""
    codigo: str
    nombre: str
    nivel: NivelBreve | None
    vitrina: list[str]


class LoQuePienso(BaseModel):
    dia: str
    necesita: str
    duda: str


class PreguntaGuionPublica(BaseModel):
    origen: OrigenPreguntaGuion
    texto: str


class SugerenciaGuionPublica(BaseModel):
    codigo: str
    texto: str


class InvestigacionEnCurso(BaseModel):
    """`sugerencias`: las pendientes. `sugerencias_vigentes` falso: pedirlas llamará al LLM."""
    codigo: str
    estado: EstadoInvestigacion
    ocupacion: OcupacionBreve
    lo_que_pienso: LoQuePienso
    preguntas: list[PreguntaGuionPublica]
    sugerencias: list[SugerenciaGuionPublica]
    sugerencias_vigentes: bool
    creada_en: datetime
    guia_lista_en: datetime | None


class Aliado(PersonaInvestigacion):
    ocupacion: OcupacionBreve


class Aliados(BaseModel):
    """Compañeros del salón con guía lista: los de la misma ocupación que la mía y los demás."""
    misma_ocupacion: list[Aliado]
    otras: list[Aliado]


class PreguntaBasePublica(BaseModel):
    codigo: str
    texto: str


class TipoReaccionPublico(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    pregunta: str
    comentario_obligatorio: bool
    icono: str


class ConteosEntrevistas(BaseModel):
    salon: int
    leyendas: int
    mias: int


class InvestigacionesCuenta(BaseModel):
    en_curso: InvestigacionEnCurso | None
    aliados: Aliados
    preguntas_base: list[PreguntaBasePublica]
    tipos_reaccion: list[TipoReaccionPublico]
    favoritos_leyenda: int
    conteos: ConteosEntrevistas


class SugerenciasGuion(BaseModel):
    """LISTAS: las pendientes (puede ser una lista vacía si ya se usaron todas). SIN_SUGERENCIAS: el texto es
    pobre o el LLM no propuso preguntas útiles. ERROR: el LLM falló o tardó; no se guardó nada."""
    estado: Literal['LISTAS', 'SIN_SUGERENCIAS', 'ERROR']
    sugerencias: list[SugerenciaGuionPublica]


class TarjetaEntrevista(BaseModel):
    """Lo que muestra la tarjeta de una entrevista. `reacciones_por_tipo` solo en la vista MIAS y en el detalle."""
    codigo: str
    titulo: str
    ocupacion: OcupacionBreve
    profesional: str
    duracion: str
    resumen: str
    fecha_hora: datetime
    autores: list[PersonaInvestigacion]
    destacada: bool
    leyenda: bool
    reacciones: int
    favoritos: int
    favorita: bool
    vista: bool
    propia: bool
    reacciones_por_tipo: dict[str, int] | None = None


class PaginaEntrevistas(BaseModel):
    """`favoritos_leyenda`: los favoritos que pide la Leyenda, para el medidor."""
    total: int
    favoritos_leyenda: int
    items: list[TarjetaEntrevista]


class ReaccionPublica(BaseModel):
    """`tipo` nulo: comentario de la orientadora."""
    codigo: str
    autor: PersonaInvestigacion
    tipo: str | None
    comentario: str | None
    creada_en: datetime
    editada_en: datetime | None
    propia: bool
    reportada_por_mi: bool


class EntrevistaDetalle(TarjetaEntrevista):
    enlace: str
    editada_en: datetime | None
    favoritos_leyenda: int
    reportada_por_mi: bool
    lista_reacciones: list[ReaccionPublica]


# --- Orientadora --------------------------------------------------------------------------------

EstadoPublicacion = Literal['SIN_DESTACAR', 'DESTACADA', 'LEYENDA']


class AutorPublicacion(BaseModel):
    """`salon`: código del salón (nulo si la cuenta no tiene). `lo_que_pensaba`: solo en el detalle."""
    codigo: str
    nombre: str
    salon: str | None
    lo_que_pensaba: LoQuePienso | None = None


class FilaPublicacion(BaseModel):
    """`reportes_pendientes`: de la entrevista; `comentarios_reportados`: reacciones con reportes pendientes.
    `de_sus_salones` falso: Leyenda de otro salón o promoción (va al final)."""
    codigo: str
    titulo: str
    autores: list[AutorPublicacion]
    ocupacion: OcupacionBreve
    fecha_hora: datetime
    reacciones: int
    favoritos: int
    estado: EstadoPublicacion
    reportes_pendientes: int
    comentarios_reportados: int
    de_sus_salones: bool


class PaginaPublicaciones(BaseModel):
    total: int
    favoritos_leyenda: int
    items: list[FilaPublicacion]


class ReportePublico(BaseModel):
    """Sin quién reportó."""
    codigo: str
    motivo: MotivoReporte
    detalle: str | None
    fecha_hora: datetime


class ReaccionModerada(BaseModel):
    codigo: str
    autor: PersonaInvestigacion
    tipo: str | None
    comentario: str | None
    creada_en: datetime
    editada_en: datetime | None
    propia: bool
    reportes: list[ReportePublico]


class PublicacionDetalle(BaseModel):
    """Lo que ve la orientadora: la ficha, lo que pensaban antes los autores, reportes y reacciones (las
    reportadas primero, luego de la más reciente a la más antigua)."""
    codigo: str
    titulo: str
    ocupacion: OcupacionBreve
    profesional: str
    duracion: str
    enlace: str
    resumen: str
    fecha_hora: datetime
    editada_en: datetime | None
    estado: EstadoPublicacion
    de_sus_salones: bool
    favoritos: int
    favoritos_leyenda: int
    reacciones_por_tipo: dict[str, int]
    autores: list[AutorPublicacion]
    reportes: list[ReportePublico]
    reacciones: list[ReaccionModerada]
