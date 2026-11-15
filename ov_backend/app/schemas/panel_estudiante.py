"""Lista de estudiantes y perfil de un estudiante para la orientadora (ajuste panel-estudiantes). Ninguna respuesta
lleva texto del diario, cartas ni su estado, puntajes de partida y llegada, motivos del LLM ni intentos anteriores."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.panel import SalonPanel

EstadoTest = Literal["LISTO", "POR_REVISAR", "EN_CURSO", "SIN_EMPEZAR"]
Destino = Literal["TESTS", "PLANES", "RESPUESTAS", "AVANCE"]
Zona = Literal["FUERTE", "EN_CAMINO", "POR_TRABAJAR"]
Cambio = Literal["SUBIO", "IGUAL", "BAJO"]


class TramoEstudiante(BaseModel):
    """Por dónde va: `codigo` es SIN_EMPEZAR, TERMINO o el código del bloque; `nombre`, el del bloque (nulo en los
    otros dos); `numero` 0…total+1."""
    codigo: str
    numero: int
    total: int
    nombre: str | None


# --- Lista ---------------------------------------------------------------------------------------

class FilaEstudiante(BaseModel):
    codigo: str
    nombre: str
    salon: str
    tramo: TramoEstudiante
    test: EstadoTest
    plan_a: str | None
    dias_sin_ingreso: int | None = Field(description="Días de calendario desde su último ingreso; nulo si nunca.")
    aviso: str | None = Field(description="El aviso más importante, con su texto de perfil.")
    avisos_mas: int


class AccesoLista(BaseModel):
    """Botón de acceso rápido: `todos`, `con_avisos`, un grupo del Inicio de orden 1 o `sin_avisos`."""
    codigo: str
    nombre: str | None
    cantidad: int


class OpcionAviso(BaseModel):
    codigo: str
    nombre: str


class PaginaEstudiantes(BaseModel):
    salon: SalonPanel | None
    total_estudiantes: int
    total: int
    accesos: list[AccesoLista]
    avisos: list[OpcionAviso]
    items: list[FilaEstudiante]


# --- Perfil: cabecera y Resumen ------------------------------------------------------------------

class ApoderadoCabecera(BaseModel):
    nombre: str
    parentesco: str | None
    estado: Literal["AUN_NO_INGRESA", "INGRESO", "TERMINO_RUTA"]


class CabeceraEstudiante(BaseModel):
    codigo: str
    nombre: str
    salon: SalonPanel
    dias_sin_ingreso: int | None
    apoderado: ApoderadoCabecera | None
    tramo: TramoEstudiante


class AvisoPerfil(BaseModel):
    codigo: str
    nombre: str
    descripcion: str | None
    destino: Destino | None


class GrupoAvisosPerfil(BaseModel):
    codigo: str
    nombre: str
    avisos: list[AvisoPerfil]


class TemaPerfil(BaseModel):
    codigo: str
    texto: str
    destino: Destino | None


class DimensionInteres(BaseModel):
    codigo: str
    nombre: str


class InteresesResumen(BaseModel):
    """El test de intereses (instrumento principal). `codigo` y `areas` solo con resultado vigente no plano."""
    instrumento: str
    estado: EstadoTest
    fecha: date | None
    motivo_revision: Literal["PLANO", "PRISA"] | None
    codigo: list[DimensionInteres]
    areas: list[str]
    partes_respondidas: int
    partes_total: int


class InstitucionPlan(BaseModel):
    nombre: str
    tipo: str
    gestion: str | None


class PlanResumen(BaseModel):
    prioridad: int
    carrera: str
    institucion: InstitucionPlan | None
    en_areas: bool | None = Field(description="Entre sus áreas sugeridas; nulo sin resultado vigente no plano.")


class DimensionPartida(BaseModel):
    codigo: str
    nombre: str
    zona_partida: Zona | None
    zona_llegada: Zona | None
    cambio: Cambio | None


class PartidaResumen(BaseModel):
    estado: Literal["SIN_PARTIDA", "SOLO_PARTIDA", "CON_LLEGADA"]
    fecha_partida: date | None
    fecha_llegada: date | None
    dimensiones: list[DimensionPartida]


class RespuestasResumen(BaseModel):
    """Registros completados sobre los destacados del salón (o, sin destacados, sobre los requeridos) y cuántas
    respuestas llevan cada etiqueta."""
    destacados: bool
    completados: int
    total: int
    requiere_atencion: int
    sin_contenido: int
    aun_no_lo_sabe: int


class NotaPerfil(BaseModel):
    numero: int
    texto: str
    creada_en: datetime
    actualizada_en: datetime


class PerfilEstudiante(BaseModel):
    cabecera: CabeceraEstudiante
    avisos: list[GrupoAvisosPerfil]
    temas: list[TemaPerfil] = Field(description="Todos los temas que cumple, en su orden.")
    temas_visibles: int = Field(description="Temas que se muestran antes de «Ver los N temas restantes» "
                                            "(PANEL_TEMAS_VISIBLES).")
    intereses: InteresesResumen | None
    planes: list[PlanResumen]
    partida: PartidaResumen
    respuestas: RespuestasResumen
    notas: list[NotaPerfil]


# --- Notas (acciones) ----------------------------------------------------------------------------

class EscribirNotaEntrada(BaseModel):
    cuenta: str
    estudiante: str
    texto: str


class EditarNotaEntrada(EscribirNotaEntrada):
    nota: int


class BorrarNotaEntrada(BaseModel):
    cuenta: str
    estudiante: str
    nota: int


class NotaBorrada(BaseModel):
    nota: int
    borrada: bool = True


# --- Pestaña Tests -------------------------------------------------------------------------------

Etiqueta = Literal["REQUISITO", "REQUISITO_ALGUNOS", "CAMINO", "OPCIONAL"]


class BarraInteres(BaseModel):
    codigo: str
    nombre: str
    valor: int = Field(description="0 a 100 (el puntaje visual del resultado).")
    en_codigo: bool


class PlanFrenteAreas(BaseModel):
    prioridad: int
    carrera: str
    en_areas: bool


class TestIntereses(BaseModel):
    instrumento: str
    nombre: str
    etiqueta: Etiqueta
    estado: EstadoTest
    fecha: date | None
    motivo_revision: Literal["PLANO", "PRISA"] | None
    mensaje: str
    aplicacion: str | None = Field(description="Para pedir el resultado completo; nulo sin resultado vigente.")
    barras: list[BarraInteres]
    codigo: list[DimensionInteres]
    areas: list[str]
    frente_planes: list[PlanFrenteAreas]
    rehizo_plano: bool = Field(description="Tiene un resultado plano anterior que anuló al rehacer el test.")
    partes_respondidas: int
    partes_total: int


class Afirmacion(BaseModel):
    item: str
    enunciado: str
    partida: str | None
    llegada: str | None


class GrupoAfirmaciones(BaseModel):
    codigo: Literal["BAJAS", "BAJARON", "SIGUEN_BAJAS", "MEJORARON"]
    afirmaciones: list[Afirmacion]


class PartidaLlegada(BaseModel):
    instrumento: str
    nombre: str
    etiqueta: Etiqueta
    mensaje: str
    resumen: PartidaResumen
    grupos: list[GrupoAfirmaciones]


class DimensionRespuestas(BaseModel):
    codigo: str
    nombre: str
    afirmaciones: list[Afirmacion]


class RespuestasPartidaLlegada(BaseModel):
    """«Ver todas sus respuestas»: cada afirmación con las etiquetas que marcó, sin puntajes."""
    dimensiones: list[DimensionRespuestas]


class OtroCuestionario(BaseModel):
    instrumento: str
    nombre: str
    etiqueta: Etiqueta
    estado: EstadoTest
    aplicacion: str | None
    destaca: list[str]
    para_practicar: str | None
    partes_respondidas: int
    partes_total: int


class TestsEstudiante(BaseModel):
    intereses: TestIntereses | None
    partida_llegada: PartidaLlegada | None
    otros: list[OtroCuestionario]


# --- Pestaña Planes ------------------------------------------------------------------------------

class Medidores(BaseModel):
    """1 Bajo, 2 Medio, 3 Alto; nulo sin marcar."""
    entusiasmo: int | None
    capacidad: int | None
    recursos: int | None


class PlanVistazo(BaseModel):
    prioridad: int
    carrera: str
    tipo: str
    en_areas: bool | None
    institucion: InstitucionPlan | None
    idea_origen: str | None
    motivo_principal: str | None
    conoce_si: int
    conoce_total: int
    conoce_respondidas: int
    dudas_abiertas: int
    dudas_resueltas: int
    costo_primer_anio: int | None
    financiamiento: list[str]
    complicaciones: list[str]
    pasos_hechos: int
    pasos_total: int
    medidores: Medidores
    secciones_listas: int
    secciones_total: int


class AntesDePlanes(BaseModel):
    opcion_inicial: str | None
    plan_a: str | None
    carreras_favoritas: list[str]
    instituciones_favoritas: list[str]


class PlanesEstudiante(BaseModel):
    planes: list[PlanVistazo]
    maximo_planes: int
    antes: AntesDePlanes


class SeccionCompleta(BaseModel):
    codigo: str
    nombre: str
    estado: Literal["BLOQUEADA", "POR_EMPEZAR", "EN_PROCESO", "LISTA"]


class PorQue(BaseModel):
    idea_origen: str | None
    motivos: list[str]
    relato: str | None


class PreguntaConoce(BaseModel):
    codigo: str
    texto: str
    respuesta: Literal["SI", "MAS_O_MENOS", "NO"] | None


class DudaCompleta(BaseModel):
    texto: str
    resuelta: bool
    hallazgo: str | None


class Conoce(BaseModel):
    preguntas: list[PreguntaConoce]
    dudas: list[DudaCompleta]
    dudas_visibles: int


class Realidad(BaseModel):
    institucion: InstitucionPlan | None
    ciclos: int | None
    camino: str | None
    costo_primer_anio: int | None
    costo_carrera: int | None
    rubros: list[str]
    financiamiento: list[str]
    complicaciones: list[str]


class PasoCompleto(BaseModel):
    texto: str
    hecho: bool
    hecho_en: datetime | None
    hallazgo: str | None
    sale_de: str | None


class PlanCompleto(BaseModel):
    prioridad: int
    carrera: str
    tipo: str
    en_areas: bool | None
    actualizada_en: datetime
    medidores: Medidores
    secciones: list[SeccionCompleta]
    por_que: PorQue | None
    conoce: Conoce | None
    realidad: Realidad | None
    pasos: list[PasoCompleto] | None
    planes: list[int] = Field(description="Las prioridades de los planes activos, para el selector.")


# --- Pestaña Avance y familia --------------------------------------------------------------------

class TramoCamino(BaseModel):
    numero: int
    nombre: str
    hechas: int
    total: int
    estado: Literal["COMPLETO", "VA_AQUI", "POR_ABRIR"]
    siguiente: str | None


class Senal(BaseModel):
    nivel: int
    fecha: date
    banda: Literal["BAJA", "MEDIA", "ALTA"]


class ViniendoBajando(BaseModel):
    senales: int
    nivel_maximo: int


class FamiliaAvance(BaseModel):
    nombre: str
    parentesco: str | None
    ingreso: Literal["AUN_NO_INGRESA", "INGRESO"]
    ruta_hechas: int
    ruta_total: int
    conversadas: int
    conversaciones_total: int
    esperan_apoderado: int


class AvanceEstudiantePerfil(BaseModel):
    tramos: list[TramoCamino]
    opcionales_ciudad: int
    casos_superados: int
    senales: list[Senal]
    viene_bajando: ViniendoBajando | None
    entradas_diario: int
    dias_ultima_entrada: int | None
    familia: FamiliaAvance | None


# --- Pestaña Respuestas --------------------------------------------------------------------------

EtiquetaRespuesta = Literal["REQUIERE_ATENCION", "SIN_CONTENIDO", "AUN_NO_LO_SABE"]


class ConteoEtiqueta(BaseModel):
    etiqueta: EtiquetaRespuesta
    cantidad: int


class OpcionElegidaLectura(BaseModel):
    """`otra`: lo escribió el estudiante en «Otra». `origen` y `grupo`: de dónde sale una pieza (nulos en las
    respuestas anteriores a que se guardaran)."""
    texto: str
    otra: bool
    origen: str | None
    grupo: str | None


class ItemLectura(BaseModel):
    """Un ítem con el intento vigente, con las preguntas y ecos con los valores con que respondió. `ecos` son los
    ecos mostrados tal como se guardaron (mismas formas que ve el estudiante); `ecos_hoy`, los de hoy cuando lo que
    tenía a la vista cambió; `ecos_de_hoy`: la respuesta no guardó sus ecos y se muestran los de hoy."""
    numero: int
    codigo: str
    nombre: str
    etiquetas: list[EtiquetaRespuesta]
    dialogo: str | None
    ecos: list[dict]
    ecos_hoy: list[dict] | None
    ecos_de_hoy: bool
    pregunta_eleccion: str | None
    eleccion: Literal["LISTA", "ORDENADA", "PIEZAS"] | None
    elegidas: list[OpcionElegidaLectura]
    pregunta_texto: str
    primera_respuesta: str | None
    repregunta: str | None
    segunda_respuesta: str | None
    respondido: bool


class RegistroFila(BaseModel):
    actividad: str
    titulo: str
    tramo: str
    ciudad: bool
    destacado: bool
    estado: Literal["COMPLETADO", "EN_CURSO", "AUN_NO_LLEGA"]
    fecha: date | None
    etiquetas: list[ConteoEtiqueta]
    cambio_despues: bool = Field(description="Lo que tenía a la vista cambió después.")


class RegistroLectura(BaseModel):
    actividad: str
    items: list[ItemLectura]


class RespuestasEstudiante(BaseModel):
    hay_destacados: bool
    registros: list[RegistroFila]
    leer_primero: list[RegistroLectura]
