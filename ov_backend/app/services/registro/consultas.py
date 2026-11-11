"""Lecturas del registro: la definición de los ítems y el registro de la cuenta (§7 del lote 3)."""


from app.core.contexto import contexto, usar_contexto
from app.models import ListaOpciones, Referencia
from app.models.enums import EstadoRespuestaRegistro
from app.schemas.registro import (
    ConsignaItem, EleccionItem, EleccionPublica, ItemRegistroCuenta, ItemRegistroPublico, OpcionGuardada,
    OpcionListaPublica, OpcionOfrecida, OpcionPropiaPublica, PremarcarPublico, RegistroConsultado, RespuestaVigente,
)
from app.services.registro.acciones import leer_registro, opciones_de, validar_registro
from app.services.registro.contexto import MarcadorSinValor, eco_cambiado, resolver_contexto


def eleccion_publica(sesion, item):
    """La elección del ítem sin datos de la cuenta: con fuente REFERENCIA o PIEZAS_*, las opciones las da la cuenta.
    De las opciones propias solo sale lo que la pantalla necesita (nunca su tarjeta)."""
    if item.fuente_opciones is None:
        return None
    definiciones = contexto(sesion).definiciones
    lista = None if item.lista_id is None else definiciones.obtener(ListaOpciones, item.lista_id)

    def codigo_referencia(identificador):
        return None if identificador is None else definiciones.obtener(Referencia, identificador).codigo

    premarcar = item.premarcar_si
    return EleccionPublica(
        fuente=item.fuente_opciones, lista=None if lista is None else lista.codigo,
        # F02: la referencia solo marca lo elegido la vez pasada; se lee en la consulta de referencias.
        referencia=codigo_referencia(item.referencia_id),
        referencia_opciones=codigo_referencia(item.referencia_opciones_id),
        comun=lista is not None and lista.comun, minima=item.eleccion_minima, maxima=item.eleccion_maxima,
        ordenada=item.eleccion_ordenada, permite_otra=item.permite_otra, etiqueta_otra=item.etiqueta_otra,
        opciones=[OpcionListaPublica(codigo=o.codigo, texto=o.texto) for o in opciones_de(sesion, item)],
        opciones_propias=[OpcionPropiaPublica(
            codigo=o['codigo'], texto=o['texto'], exclusiva=o.get('exclusiva', False), pregunta=o.get('pregunta'),
            arranque=o.get('arranque'), sin_llm=o.get('sin_llm', False))
            for o in item.opciones_propias or ()],
        premarcar_si=None if premarcar is None else PremarcarPublico(**premarcar))


@usar_contexto
def consultar_items(sesion, actividad):
    _, _, items = validar_registro(sesion, actividad)
    return [ItemRegistroPublico(codigo=item.codigo, nombre=item.nombre, dialogo=item.dialogo,
                                pregunta_eleccion=item.pregunta_eleccion, pregunta_texto=item.pregunta_texto,
                                arranque=item.arranque,
                                obligatorio=item.obligatorio, con_llm=item.tarjeta is not None,
                                eleccion=eleccion_publica(sesion, item))
            for item in items]


def _respuesta(item, respuesta, hoy):
    return RespuestaVigente(
        opciones_elegidas=[OpcionGuardada(codigo=e['codigo'], texto=e['texto']) for e in respuesta.opciones_elegidas or ()],
        primera_respuesta=respuesta.primera_respuesta, linea_seguimiento=respuesta.linea_registro, pista=respuesta.pista,
        reenviable=respuesta.estado == EstadoRespuestaRegistro.SIN_EVALUAR or respuesta.seguimiento_sin_evaluar,
        eco_cambiado=eco_cambiado(item, respuesta, hoy))


def _item_cuenta(sesion, cuenta, item, respuesta):
    """Un ítem con su contexto de hoy (de `resolver_contexto`) y su respuesta vigente."""
    try:
        hoy, faltante = resolver_contexto(sesion, cuenta, item.codigo), None
    except MarcadorSinValor as error:
        hoy, faltante = None, error.marcador
    eleccion = None if item.fuente_opciones is None else EleccionItem(
        minima=item.eleccion_minima, maxima=item.eleccion_maxima, ordenada=item.eleccion_ordenada,
        permite_otra=item.permite_otra, etiqueta_otra=item.etiqueta_otra)
    return ItemRegistroCuenta(
        codigo=item.codigo, nombre=item.nombre, obligatorio=item.obligatorio, con_llm=item.tarjeta is not None,
        disponible=hoy is not None, marcador_faltante=faltante,
        consigna=None if hoy is None else ConsignaItem(dialogo=hoy.dialogo, pregunta_eleccion=hoy.pregunta_eleccion,
                                                       pregunta_texto=hoy.pregunta_texto, arranque=hoy.arranque),
        eleccion=eleccion,
        opciones=[] if hoy is None else [OpcionOfrecida(
            codigo=o.codigo, texto=o.texto, origen=o.origen, grupo=o.grupo, exclusiva=o.exclusiva, sin_llm=o.sin_llm,
            # Cada opción lleva su pregunta: en los ítems con pregunta por opción, se sirve siempre la de la opción.
            pregunta=hoy.pregunta_para(o.codigo), arranque=hoy.arranque_para(o.codigo), lineas=list(o.lineas))
            for o in hoy.opciones],
        ecos=[] if hoy is None else [dict(e) for e in hoy.ecos_mostrar],
        respuesta=None if respuesta is None else _respuesta(item, respuesta, hoy))


def registro_cuenta(sesion, cuenta, actividad, items) -> RegistroConsultado:
    """El registro para el estudiante: por ítem, su contexto de hoy y su respuesta vigente; el ítem en que va (el primero
    sin intento vigente, calculado) y el estado de la actividad. Lo resuelve ítem por ítem (hasta
    `MAXIMO_ITEMS_REGISTRO`)."""
    registro = leer_registro(sesion, cuenta, actividad)
    return RegistroConsultado(
        estado=None if registro.progreso is None else registro.progreso.estado,
        item_actual=next((item.codigo for item in items if item.id not in registro.vigentes), None),
        items=[_item_cuenta(sesion, cuenta, item, registro.vigentes.get(item.id)) for item in items])


@usar_contexto
def consultar_registro(sesion, cuenta, actividad):
    cuenta, actividad, items = validar_registro(sesion, actividad, cuenta)
    return registro_cuenta(sesion, cuenta, actividad, items)
