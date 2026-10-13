"""Lecturas agrupadas del registro."""


from app.core.contexto import contexto, usar_contexto
from app.models import ListaOpciones
from app.schemas.registro import (
    EleccionPublica, ItemRegistroPublico, OpcionListaPublica, RegistroConsultado, RespuestaRegistroPublica,
)
from app.services.registro.acciones import conversacion_publica, leer_registro, opciones_de, validar_registro


def eleccion_publica(sesion, item):
    if item.lista_id is None:
        return None
    lista = contexto(sesion).definiciones.obtener(ListaOpciones, item.lista_id)
    return EleccionPublica(lista=lista.codigo, comun=lista.comun, minima=item.eleccion_minima,
        maxima=item.eleccion_maxima, ordenada=item.eleccion_ordenada, permite_otra=item.permite_otra,
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
    registro = leer_registro(sesion, cuenta, actividad)
    progreso, respuestas = registro.progreso, registro.respuestas
    return RegistroConsultado(posicion=progreso.posicion if progreso is not None else None,
        estado=progreso.estado if progreso is not None else None,
        respuestas=[RespuestaRegistroPublica(item=item.codigo, estado=respuestas[item.id].estado,
            opciones_elegidas=respuestas[item.id].opciones_elegidas,
            conversacion=conversacion_publica(respuestas[item.id].texto_inicial,
                registro.turnos.get(respuestas[item.id].id, ())))
            for item in items if item.id in respuestas])
