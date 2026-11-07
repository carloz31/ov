"""Contratos públicos del registro."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

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


class EntregarRegistroEntrada(CompletarActividadEntrada):
    pass


class ResponderSeguimientoEntrada(TextoRegistroEntrada):
    pass


class ItemEdicion(BaseModel):
    item: str
    texto: str
    # F02: la elección nueva; sin ella, se conserva la de la respuesta.
    opciones: list[OpcionElegida] | None = None


class EditarRegistroEntrada(CompletarActividadEntrada):
    items: list[ItemEdicion]




class EstadoItemRegistro(BaseModel):
    item: str
    estado: EstadoRespuestaRegistro


class MensajeRespuestaRegistro(BaseModel):
    tipo: Literal['respuesta'] = 'respuesta'
    texto: str
    orden: int | None = None
    borrador: bool | None = None


class MensajePreguntaRegistro(BaseModel):
    tipo: Literal['pregunta'] = 'pregunta'
    orden: int
    texto: str


class MensajeAvisoRegistro(BaseModel):
    """Ajuste registros: Lumi acoge una respuesta sensible con un texto fijo y no repregunta (solo «Continuar»)."""
    tipo: Literal['aviso'] = 'aviso'
    texto: str


MensajeRegistro = Annotated[MensajeRespuestaRegistro | MensajePreguntaRegistro | MensajeAvisoRegistro,
                            Field(discriminator='tipo')]


class OpcionListaPublica(BaseModel):
    codigo: str
    texto: str


class OpcionPropiaPublica(BaseModel):
    """Una opción propia del ítem, con solo lo que la pantalla necesita: nunca su criterio ni sus ejemplos."""
    codigo: str
    texto: str
    exclusiva: bool
    # Reemplaza la consigna del texto cuando se elige.
    pregunta_propia: str | None
    # Con `criterio: null`: la opción cumple sin seguimiento y el texto es opcional en la pantalla.
    sin_seguimiento: bool


class PremarcarPublico(BaseModel):
    """Si en `item` (anterior, misma actividad) se eligió `opcion`, este ítem llega con `marca` marcada."""
    item: str
    opcion: str
    marca: str


class EleccionPublica(BaseModel):
    """`fuente` (ajuste registros): LISTA (opciones de `lista`), REFERENCIA (las de `referencia_opciones`, que se
    leen con las referencias de la cuenta) o PROPIAS. `opciones_propias` se suman a la fuente o son la única.
    `referencia` (F02): la que marca lo elegido la vez pasada."""
    fuente: FuenteOpciones
    lista: str | None
    referencia: str | None
    referencia_opciones: str | None
    comun: bool
    minima: int
    maxima: int
    ordenada: bool
    permite_otra: bool
    opciones: list[OpcionListaPublica]
    opciones_propias: list[OpcionPropiaPublica]
    premarcar_si: PremarcarPublico | None


class ItemRegistroPublico(BaseModel):
    codigo: str
    nombre: str
    consigna: str
    min_caracteres: int | None
    obligatorio: bool
    eleccion: EleccionPublica | None


class RespuestaRegistroPublica(EstadoItemRegistro):
    opciones_elegidas: list[OpcionElegida]
    # Conversación del intento vigente: su texto base y sus turnos.
    conversacion: list[MensajeRegistro]
    # Solo en la consulta y con el registro cerrado: la respuesta final.
    texto_consolidado: str | None = None


class ItemPorAmpliar(BaseModel):
    item: str
    pista: str
    # Ajuste registros: lo que le faltó según el evaluador; el front lo muestra antes que la pista o el nombre.
    falta: str | None = None


class RegistroConsultado(BaseModel):
    posicion: str | None
    estado: EstadoProgreso | None
    respuestas: list[RespuestaRegistroPublica]
    # Solo con el registro cerrado: ítems que quedaron poco desarrollados y la pregunta que los ampliaría.
    items_por_ampliar: list[ItemPorAmpliar] | None = None
    # Solo con el registro cerrado (ajuste registros): ítems que el estudiante dejó abiertos.
    items_abiertos: list[str] | None = None


class RespuestaRegistroAccion(RegistroConsultado, RespuestaAccion):
    """Estado del registro tras entregar, responder, omitir o editar; nunca lleva clasificaciones."""
