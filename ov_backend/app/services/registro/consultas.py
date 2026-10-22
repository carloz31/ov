"""Lecturas agrupadas del registro."""


from app.core.contexto import contexto, usar_contexto
from app.models import ListaOpciones, Referencia
from app.schemas.registro import EleccionPublica, ItemRegistroPublico, OpcionListaPublica, RegistroConsultado
from app.services.registro.acciones import leer_registro, opciones_de, registro_publico, validar_registro


def eleccion_publica(sesion, item):
    definiciones = contexto(sesion).definiciones
    comunes = dict(minima=item.eleccion_minima, maxima=item.eleccion_maxima, ordenada=item.eleccion_ordenada,
                   permite_otra=item.permite_otra)
    if item.lista_id is None:
        return None
    lista = definiciones.obtener(ListaOpciones, item.lista_id)
    # F02: la referencia solo marca lo elegido la vez pasada; se lee en la consulta de referencias.
    referencia = None if item.referencia_id is None else definiciones.obtener(Referencia, item.referencia_id).codigo
    return EleccionPublica(lista=lista.codigo, referencia=referencia, comun=lista.comun, **comunes,
        opciones=[OpcionListaPublica(codigo=o.codigo, texto=o.texto) for o in opciones_de(sesion, item)])


@usar_contexto
def consultar_items(sesion, actividad):
    _, _, items = validar_registro(sesion, actividad)
    return [ItemRegistroPublico(codigo=item.codigo, nombre=item.nombre, consigna=item.consigna,
                                min_caracteres=item.min_caracteres, obligatorio=item.obligatorio,
                                eleccion=eleccion_publica(sesion, item))
            for item in items]


@usar_contexto
def consultar_registro(sesion, cuenta, actividad):
    cuenta, actividad, items = validar_registro(sesion, actividad, cuenta)
    return RegistroConsultado(**registro_publico(leer_registro(sesion, cuenta, actividad), items, consolidada=True))
