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
    lista: str
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
    conversacion: list[MensajeRegistro]


class RegistroConsultado(BaseModel):
    posicion: str | None
    estado: EstadoProgreso | None
    respuestas: list[RespuestaRegistroPublica]


class RespuestaRegistroAccion(RegistroConsultado, RespuestaAccion):
    """Estado del registro tras entregar, responder u omitir; nunca lleva clasificaciones."""
    # Solo en la respuesta que cierra el registro: ítems que quedaron poco desarrollados.
    items_por_ampliar: list[str] | None = None
