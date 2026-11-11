"""Contratos públicos del registro.

Ajuste registros llm (lote 3): flujo ítem por ítem (responder, seguimiento, reenviar, terminar) y lectura con el
contexto resuelto. El front actual no funciona contra estos contratos hasta su propio ajuste.
"""

from typing import Literal

from pydantic import BaseModel

from app.models import EstadoProgreso
from app.models.enums import FuenteOpciones
from app.schemas.acciones import CompletarActividadEntrada, RespuestaAccion




class AccionItemRegistroEntrada(CompletarActividadEntrada):
    """Reenviar un ítem (§4): sin cuerpo propio."""
    item: str


class TextoRegistroEntrada(AccionItemRegistroEntrada):
    texto: str


class OpcionElegida(BaseModel):
    codigo: str
    texto: str | None = None


class ResponderItemEntrada(TextoRegistroEntrada):
    """Responder un ítem, la primera vez o para editarlo (§2): la elección y el texto."""
    opciones: list[OpcionElegida] = []


class ResponderSeguimientoEntrada(TextoRegistroEntrada):
    pass


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
    referencias de la cuenta), PROPIAS o PIEZAS_* (las arma la cuenta: van en el registro de la cuenta). `opciones_propias` se suman a la
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
    """La definición del ítem, con los marcadores sin resolver (resueltos, en el registro de la cuenta)."""
    codigo: str
    nombre: str
    dialogo: str | None
    pregunta_eleccion: str | None
    pregunta_texto: str
    arranque: str | None
    obligatorio: bool
    # El ítem tiene tarjeta (pasa por el LLM).
    con_llm: bool
    eleccion: EleccionPublica | None


class OpcionGuardada(BaseModel):
    codigo: str
    texto: str


class ConsignaItem(BaseModel):
    """La consigna ya armada para la cuenta (marcadores resueltos)."""
    dialogo: str | None
    pregunta_eleccion: str | None
    pregunta_texto: str
    arranque: str | None


class EleccionItem(BaseModel):
    minima: int
    maxima: int
    ordenada: bool
    permite_otra: bool
    etiqueta_otra: str | None


class OpcionOfrecida(BaseModel):
    """Una opción que se le ofrece a la cuenta. En las piezas, con su origen y su grupo; con `pregunta` o `arranque`,
    reemplazan los del ítem al marcarla. Nunca lleva su tarjeta."""
    codigo: str
    texto: str
    origen: str | None
    grupo: str | None
    exclusiva: bool
    sin_llm: bool
    pregunta: str | None
    arranque: str | None
    # Una pieza que cita un texto: sus líneas por separado (`texto` las une con « / »); vacío en las demás.
    lineas: list[str] = []


class RespuestaVigente(BaseModel):
    """El intento vigente: la elección tal como se guardó, la primera respuesta y, aparte, la línea del seguimiento.
    Nunca el tipo, el `motivo`, la marca `sensible`, el estado abierto ni el histórico."""
    opciones_elegidas: list[OpcionGuardada]
    primera_respuesta: str
    linea_seguimiento: str | None
    pista: str | None
    # El intento quedó sin evaluar (o su seguimiento): se puede reenviar.
    reenviable: bool
    # Cambió algo de lo que se le mostró o fue al LLM al responder (§8; se calcula al leer).
    eco_cambiado: bool


class ItemRegistroCuenta(BaseModel):
    """Un ítem con su contexto resuelto hoy y su respuesta vigente. `disponible` es falso si falta el valor de un
    marcador (`marcador_faltante`): entonces no trae consigna, opciones ni ecos."""
    codigo: str
    nombre: str
    obligatorio: bool
    con_llm: bool
    disponible: bool
    marcador_faltante: str | None
    consigna: ConsignaItem | None
    eleccion: EleccionItem | None
    opciones: list[OpcionOfrecida]
    ecos: list[dict]
    respuesta: RespuestaVigente | None


class RegistroConsultado(BaseModel):
    """El registro para el estudiante (§7). `item_actual`: el primer ítem sin intento vigente (None si no queda)."""
    estado: EstadoProgreso | None
    item_actual: str | None
    items: list[ItemRegistroCuenta]


class RespuestaRegistroAccion(RegistroConsultado, RespuestaAccion):
    """El registro tras terminarlo, con los eventos."""


class PasoRegistro(RespuestaAccion):
    """El paso siguiente tras responder, seguir o reenviar un ítem: SIGUIENTE, REPREGUNTA (con la repregunta ya
    filtrada) o MENSAJE (con el texto de Lumi). Nunca el tipo ni el `motivo`."""
    item: str
    paso: Literal['SIGUIENTE', 'REPREGUNTA', 'MENSAJE']
    repregunta: str | None = None
    mensaje: str | None = None
    registro: RegistroConsultado
