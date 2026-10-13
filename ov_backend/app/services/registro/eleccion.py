"""Validación de la elección de un ítem de registro; sin base de datos."""

from app.exceptions import ErrorAccion


CODIGO_OTRA = 'OTRA'


def invalida(mensaje):
    return ErrorAccion(mensaje, estado_http=422)


def validar_eleccion(item, opciones_lista, elegidas, exigir_minimo):
    """Devuelve la elección para guardar: `[{codigo}, {codigo: 'OTRA', texto}]`.

    `opciones_lista` son las opciones de la lista del ítem, en su orden. Sin exigir el mínimo
    (borrador) se valida todo lo demás. Una elección no ordenada se guarda en el orden de la lista.
    """
    if item.lista_id is None:
        if elegidas:
            raise invalida('Este ítem no tiene opciones para elegir')
        return []
    orden = {opcion.codigo: posicion for posicion, opcion in enumerate(opciones_lista)}
    codigos = [elegida.codigo for elegida in elegidas]
    if len(codigos) != len(set(codigos)):
        raise invalida('No se puede elegir la misma opción dos veces')
    for elegida in elegidas:
        if elegida.codigo == CODIGO_OTRA:
            if not item.permite_otra:
                raise invalida('Este ítem no admite la opción «otra»')
            if elegida.texto is None or not elegida.texto.strip():
                raise invalida('La opción «otra» necesita un texto')
        elif elegida.codigo not in orden:
            raise invalida(f'La opción {elegida.codigo} no pertenece a la lista del ítem')
        elif elegida.texto is not None:
            raise invalida('Solo la opción «otra» lleva texto')
    if len(elegidas) > item.eleccion_maxima:
        raise invalida(f'Se pueden elegir como máximo {item.eleccion_maxima} opciones')
    if exigir_minimo and len(elegidas) < item.eleccion_minima:
        raise invalida(f'Se deben elegir al menos {item.eleccion_minima} opciones')
    if not item.eleccion_ordenada:
        elegidas = sorted(elegidas, key=lambda elegida: orden.get(elegida.codigo, len(orden)))
    return [{'codigo': elegida.codigo} if elegida.texto is None else
            {'codigo': elegida.codigo, 'texto': elegida.texto} for elegida in elegidas]
