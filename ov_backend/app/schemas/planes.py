"""Planes de carrera (B11): la consulta de la sección PLANES y las acciones sobre las tarjetas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, StrictInt, field_validator, model_validator

from app.models.enums import (
    EstadoDuda, EstadoPaso, EstadoSugerencia, FrecuenciaGasto, OrigenDuda, OrigenIdea, OrigenSugerencia,
    PreguntaConocimiento, RespuestaConocimiento,
)
from app.schemas.acciones import AccionCuenta
from app.schemas.catalogo import CarreraResumen, FamiliaPublica, InstitucionResumen
from app.schemas.motor import MotivoBloqueo


Prioridad = Literal['A', 'B', 'C']
CodigoSeccion = Literal['POR_QUE', 'CONOCIMIENTO', 'REALIDAD', 'PASOS']
EstadoSeccion = Literal['BLOQUEADA', 'POR_EMPEZAR', 'EN_PROCESO', 'LISTA']


def _texto(valor: str | None) -> str | None:
    """Texto sin espacios sobrantes; vacío equivale a no enviado."""
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


# --- Consulta --------------------------------------------------------------------------------------

class Elegida(BaseModel):
    """Una opción de lista común (`opcion`, su código) o «Otro» con su texto (`otro`)."""
    opcion: str | None
    otro: str | None


class MotivoPublico(Elegida):
    posicion: int


class DudaPublica(BaseModel):
    numero: int
    origen: OrigenDuda
    pregunta: PreguntaConocimiento | None
    opcion: str | None
    texto: str
    estado: EstadoDuda
    hallazgo: str | None
    """El del paso que la cerró, si lo hay."""


class GastoPublico(BaseModel):
    rubro: str | None
    otro: str | None
    monto: int
    frecuencia: FrecuenciaGasto


class ComplicacionPublica(Elegida):
    numero: int


class OrigenSugerenciaPublico(BaseModel):
    duda: int | None
    complicacion: int | None
    texto: str


class SugerenciaPublica(BaseModel):
    numero: int
    origen: OrigenSugerenciaPublico
    tipo: str
    texto: str
    estado: EstadoSugerencia
    generada_por: OrigenSugerencia


class OrigenPasoPublico(BaseModel):
    duda: int | None
    complicacion: int | None
    sugerencia: int | None


class PasoPublico(BaseModel):
    numero: int
    tipo: str
    texto: str
    origen: OrigenPasoPublico
    estado: EstadoPaso
    hallazgo: str | None


class Medidores(BaseModel):
    entusiasmo: int | None
    capacidad: int | None
    recursos: int | None


class SeccionPlan(BaseModel):
    codigo: CodigoSeccion
    nombre: str
    estado: EstadoSeccion
    bloqueo: list[MotivoBloqueo] | None
    guardada_en: datetime | None


class InstitucionPlan(InstitucionResumen):
    duracion_ciclos: int | None
    """Duración de la carrera en esa institución (F07b: el total de la carrera en vivo); nula si no se conoce."""


class PlanCarrera(BaseModel):
    prioridad: Prioridad
    carrera: CarreraResumen
    institucion: InstitucionPlan | None
    idea_origen: OrigenIdea | None
    motivos: list[MotivoPublico]
    relato: str | None
    conocimiento: dict[PreguntaConocimiento, RespuestaConocimiento | None]
    dudas: list[DudaPublica]
    camino: Elegida | None
    gastos: list[GastoPublico]
    totales_por_frecuencia: dict[FrecuenciaGasto, int]
    total_primer_anio: int
    total_carrera: int | None
    """Nulo si la institución no tiene la duración de la carrera en ciclos."""
    financiamiento: list[Elegida]
    complicaciones: list[ComplicacionPublica]
    sugerencias: list[SugerenciaPublica]
    pasos: list[PasoPublico]
    medidores: Medidores
    secciones: list[SeccionPlan]
    lista_para_comparar: bool
    actualizada_en: datetime


class AvisoPlanes(BaseModel):
    tipo: Literal['MISMA_FAMILIA']
    planes: list[Prioridad]
    familia: FamiliaPublica


class OpcionTarjeta(BaseModel):
    codigo: str
    texto: str


class CaminoTarjeta(OpcionTarjeta):
    incluye_preparacion: bool


class RubroTarjeta(OpcionTarjeta):
    """Con `frecuencia_recomendada` y `monto_referencia`, el front lo precarga; sin ellos, se agrega a mano."""
    frecuencia_recomendada: FrecuenciaGasto | None
    monto_referencia: int | None
    cero_si_publica: bool
    solo_si_camino_prepara: bool


class PreguntaTarjeta(BaseModel):
    codigo: PreguntaConocimiento
    texto: str
    texto_duda: str
    """Con `{carrera}`, que el front reemplaza por el nombre."""


class OpcionesTarjeta(BaseModel):
    valores: list[OpcionTarjeta]
    caminos: list[CaminoTarjeta]
    rubros: list[RubroTarjeta]
    financiamiento: list[OpcionTarjeta]
    dificultades: list[OpcionTarjeta]
    pasos: list[OpcionTarjeta]
    dudas_sugeridas: list[OpcionTarjeta]
    preguntas: list[PreguntaTarjeta]
    ciclos_por_anio: int
    """F07b: para que el front calcule los totales en vivo con la misma fórmula."""


class PlanesCuenta(BaseModel):
    planes: list[PlanCarrera]
    """Por prioridad: A, B y C."""
    avisos: list[AvisoPlanes]
    opcion_inicial: CarreraResumen | None
    maximo_planes: int
    opciones: OpcionesTarjeta


# --- Acciones --------------------------------------------------------------------------------------

class PlanEntrada(AccionCuenta):
    carrera: str


class ElegidaEntrada(BaseModel):
    opcion: str | None = None
    otro: str | None = None

    @model_validator(mode='after')
    def una_de_las_dos(self):
        self.otro = _texto(self.otro)
        if (self.opcion is None) == (self.otro is None):
            raise ValueError('Elige una opción o escribe «Otro», pero no ambas')
        return self


class PorQueDatos(BaseModel):
    idea_origen: OrigenIdea | None = None
    motivos: list[ElegidaEntrada] = []
    """En orden: el primero es el motivo principal."""
    relato: str | None = None

    _relato = field_validator('relato')(_texto)


class DudaEntrada(BaseModel):
    """Una duda que se conserva (`numero`) o una nueva: SUGERIDA con su `opcion`, o PROPIA con su `texto`."""
    numero: StrictInt | None = None
    origen: Literal['SUGERIDA', 'PROPIA'] | None = None
    opcion: str | None = None
    texto: str | None = None

    @model_validator(mode='after')
    def forma_valida(self):
        self.texto = _texto(self.texto)
        if self.numero is not None:
            if (self.origen, self.opcion, self.texto) != (None, None, None):
                raise ValueError('Una duda que se conserva solo lleva su número')
        elif self.origen == 'SUGERIDA':
            if self.opcion is None or self.texto is not None:
                raise ValueError('Una duda sugerida lleva solo su opción')
        elif self.origen == 'PROPIA':
            if self.texto is None or self.opcion is not None:
                raise ValueError('Una duda propia lleva solo su texto')
        else:
            raise ValueError('Una duda nueva necesita su origen: SUGERIDA o PROPIA')
        return self


class ConocimientoDatos(BaseModel):
    respuestas: dict[PreguntaConocimiento, RespuestaConocimiento] = {}
    dudas: list[DudaEntrada] = []
    """Las sugeridas y propias; las de las preguntas salen de `respuestas`."""


class GastoEntrada(BaseModel):
    rubro: str | None = None
    otro: str | None = None
    monto: StrictInt = Field(ge=0)
    frecuencia: FrecuenciaGasto

    @model_validator(mode='after')
    def un_rubro(self):
        self.otro = _texto(self.otro)
        if (self.rubro is None) == (self.otro is None):
            raise ValueError('Elige un rubro o escribe «Otro», pero no ambos')
        return self


class ComplicacionEntrada(BaseModel):
    """Una complicación que se conserva (`numero`) o una nueva, de la lista (`opcion`) u «Otro»."""
    numero: StrictInt | None = None
    opcion: str | None = None
    otro: str | None = None

    @model_validator(mode='after')
    def forma_valida(self):
        self.otro = _texto(self.otro)
        nuevas = (self.opcion is not None) + (self.otro is not None)
        if (self.numero is None and nuevas != 1) or (self.numero is not None and nuevas):
            raise ValueError('Una complicación lleva su número, o una opción, o «Otro»')
        return self


class RealidadDatos(BaseModel):
    institucion: str | None = None
    camino: ElegidaEntrada | None = None
    gastos: list[GastoEntrada] = []
    financiamiento: list[ElegidaEntrada] = []
    complicaciones: list[ComplicacionEntrada] = []


class PasoEntrada(BaseModel):
    """Un paso que se conserva o edita (`numero`), uno que acepta una sugerencia (`sugerencia`, con `tipo` y
    `texto` opcionales para editarla) o uno nuevo (`tipo` y `texto`)."""
    numero: StrictInt | None = None
    sugerencia: StrictInt | None = None
    tipo: str | None = None
    texto: str | None = None

    @model_validator(mode='after')
    def forma_valida(self):
        self.texto = _texto(self.texto)
        if self.numero is not None and self.sugerencia is not None:
            raise ValueError('Un paso que se conserva no acepta otra sugerencia')
        if self.numero is None and self.sugerencia is None and (self.tipo is None or self.texto is None):
            raise ValueError('Un paso nuevo necesita su tipo y su texto')
        return self


class PasosDatos(BaseModel):
    pasos: list[PasoEntrada] = []
    sugerencias_descartadas: list[StrictInt] = []


DATOS_POR_SECCION = {'POR_QUE': PorQueDatos, 'CONOCIMIENTO': ConocimientoDatos, 'REALIDAD': RealidadDatos,
                     'PASOS': PasosDatos}


class GuardarSeccionEntrada(PlanEntrada):
    """Guarda una sección entera: lo enviado reemplaza lo anterior de esa sección y nada más."""
    seccion: CodigoSeccion
    datos: Any

    @model_validator(mode='after')
    def datos_de_la_seccion(self):
        self.datos = DATOS_POR_SECCION[self.seccion].model_validate(self.datos or {})
        return self


class MedidoresEntrada(PlanEntrada):
    entusiasmo: StrictInt | None = Field(default=None, ge=1, le=3)
    capacidad: StrictInt | None = Field(default=None, ge=1, le=3)
    recursos: StrictInt | None = Field(default=None, ge=1, le=3)


class PasoHechoEntrada(PlanEntrada):
    paso: StrictInt
    hallazgo: str | None = None

    _hallazgo = field_validator('hallazgo')(_texto)


class OrdenarPlanesEntrada(AccionCuenta):
    carreras: list[str] = Field(min_length=1)
    """Las carreras de todos los planes, en el orden A, B, C."""
