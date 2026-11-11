"""Contratos públicos del registro.

Ajuste registros llm (lote 2): la entrega es provisional (sin LLM) hasta el flujo secuencial del lote 3; el
seguimiento, la edición y los borradores responden 501. El front actual no funciona contra estos contratos.
"""

from pydantic import BaseModel

from app.models import EstadoProgreso
from app.models.enums import EstadoRespuestaRegistro, FuenteOpciones
from app.schemas.acciones import CompletarActividadEntrada, RespuestaAccion




class AccionItemRegistroEntrada(CompletarActividadEntrada):
    item: str


class TextoRegistroEntrada(AccionItemRegistroEntrada):
    texto: str


class OpcionElegida(BaseModel):
    codigo: str
    texto: str | None = None


class BorradorRegistroEntrada(TextoRegistroEntrada):
    opciones: list[OpcionElegida] = []
    posicion: str | None = None


class ItemEntrega(BaseModel):
    item: str
    texto: str
    opciones: list[OpcionElegida] = []


class EntregarRegistroEntrada(CompletarActividadEntrada):
    """PROVISIONAL (lote 3): la entrega trae todos los ítems a la vez, sin borradores."""
    items: list[ItemEntrega]


class ResponderSeguimientoEntrada(TextoRegistroEntrada):
    pass


class ItemEdicion(BaseModel):
    item: str
    texto: str
    opciones: list[OpcionElegida] | None = None


class EditarRegistroEntrada(CompletarActividadEntrada):
    items: list[ItemEdicion]




class EstadoItemRegistro(BaseModel):
    item: str
    estado: EstadoRespuestaRegistro


class OpcionListaPublica(BaseModel):
    codigo: str
    texto: str


class OpcionPropiaPublica(BaseModel):
    """Una opción propia del ítem, con solo lo que la pantalla necesita: nunca su tarjeta."""
    codigo: str
    texto: str
    exclusiva: bool
    # Reemplazan la pregunta del texto y el arranque del ítem cuando se marca (con marcadores sin resolver).
    pregunta: str | None
    arranque: str | None
    # La opción no se evalúa con el LLM.
    sin_llm: bool


class PremarcarPublico(BaseModel):
    """Si en `item` (anterior, misma actividad) se eligió `opcion`, este ítem llega con `marca` marcada."""
    item: str
    opcion: str
    marca: str


class EleccionPublica(BaseModel):
    """`fuente`: LISTA (opciones de `lista`), REFERENCIA (las de `referencia_opciones`, que se leen con las
    referencias de la cuenta), PROPIAS o PIEZAS_* (las arma la cuenta; lote 3). `opciones_propias` se suman a la
    fuente o son la única. `referencia` (F02): la que marca lo elegido la vez pasada."""
    fuente: FuenteOpciones
    lista: str | None
    referencia: str | None
    referencia_opciones: str | None
    comun: bool
    minima: int
    maxima: int
    ordenada: bool
    permite_otra: bool
    # La etiqueta de la «Otra» si no es la de siempre.
    etiqueta_otra: str | None
    opciones: list[OpcionListaPublica]
    opciones_propias: list[OpcionPropiaPublica]
    premarcar_si: PremarcarPublico | None


class ItemRegistroPublico(BaseModel):
    """La definición del ítem, con los marcadores sin resolver (los resuelve la cuenta, lote 3)."""
    codigo: str
    nombre: str
    dialogo: str | None
    pregunta_eleccion: str | None
    pregunta_texto: str
    arranque: str | None
    min_caracteres: int | None
    obligatorio: bool
    # El ítem tiene tarjeta (pasa por el LLM).
    con_llm: bool
    eleccion: EleccionPublica | None


class OpcionGuardada(BaseModel):
    codigo: str
    texto: str


class RespuestaRegistroPublica(EstadoItemRegistro):
    """El intento vigente del ítem: la elección tal como se mostró y la primera respuesta."""
    opciones_elegidas: list[OpcionGuardada]
    texto: str


class RegistroConsultado(BaseModel):
    posicion: str | None
    estado: EstadoProgreso | None
    respuestas: list[RespuestaRegistroPublica]


class RespuestaRegistroAccion(RegistroConsultado, RespuestaAccion):
    """Estado del registro tras entregar; nunca lleva tipos ni pistas."""
