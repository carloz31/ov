"""Lecturas agrupadas del registro."""


from app.core.contexto import contexto, usar_contexto
from app.models import ListaOpciones, Referencia
from app.schemas.registro import (
    EleccionPublica, ItemRegistroPublico, OpcionListaPublica, OpcionPropiaPublica, PremarcarPublico,
    RegistroConsultado,
)
from app.services.registro.acciones import opciones_de, publico, validar_registro


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
                                arranque=item.arranque, min_caracteres=item.min_caracteres,
                                obligatorio=item.obligatorio, con_llm=item.tarjeta is not None,
                                eleccion=eleccion_publica(sesion, item))
            for item in items]


@usar_contexto
def consultar_registro(sesion, cuenta, actividad):
    cuenta, actividad, items = validar_registro(sesion, actividad, cuenta)
    return RegistroConsultado(**publico(sesion, cuenta, actividad, items))
