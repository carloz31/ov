"""Contratos públicos del registro."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.models import EstadoProgreso
from app.models.enums import EstadoRespuestaRegistro
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


MensajeRegistro = Annotated[MensajeRespuestaRegistro | MensajePreguntaRegistro, Field(discriminator='tipo')]


class OpcionListaPublica(BaseModel):
    codigo: str
    texto: str


class EleccionPublica(BaseModel):
    """`referencia` (F02): la ELECCION que marca lo elegido la vez pasada; las opciones son las de la lista."""
    lista: str | None
    referencia: str | None
    comun: bool
    minima: int
    maxima: int
    ordenada: bool
    permite_otra: bool
    opciones: list[OpcionListaPublica]


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


class RegistroConsultado(BaseModel):
    posicion: str | None
    estado: EstadoProgreso | None
    respuestas: list[RespuestaRegistroPublica]
    # Solo con el registro cerrado: ítems que quedaron poco desarrollados y la pregunta que los ampliaría.
    items_por_ampliar: list[ItemPorAmpliar] | None = None


class RespuestaRegistroAccion(RegistroConsultado, RespuestaAccion):
    """Estado del registro tras entregar, responder, omitir o editar; nunca lleva clasificaciones."""
