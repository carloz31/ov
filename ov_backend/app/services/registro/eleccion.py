"""Validación de la elección de un ítem de registro; sin base de datos."""

from dataclasses import dataclass

from app.exceptions import ErrorAccion


CODIGO_OTRA = 'OTRA'


@dataclass(frozen=True, slots=True)
class OpcionItem:
    """Una opción que el ítem ofrece: de su lista, de su referencia (resuelta en vivo) o propia.

    Las de referencia se guardan con su texto, porque el objeto puede desaparecer o cambiar (ajuste registros)."""
    codigo: str
    texto: str
    exclusiva: bool = False
    de_referencia: bool = False


def invalida(mensaje):
    return ErrorAccion(mensaje, estado_http=422)


def validar_eleccion(item, opciones, elegidas, exigir_minimo):
    """Devuelve la elección para guardar: `[{codigo}, {codigo, texto} (de referencia), {codigo: 'OTRA', texto}]`.

    `opciones` son las del ítem en su orden (`OpcionItem`). Sin exigir el mínimo (borrador) se valida todo lo
    demás. Una elección no ordenada se guarda en el orden de las opciones. Una opción exclusiva va sola.
    """
    if item.fuente_opciones is None:
        if elegidas:
            raise invalida('Este ítem no tiene opciones para elegir')
        return []
    por_codigo = {opcion.codigo: opcion for opcion in opciones}
    orden = {opcion.codigo: posicion for posicion, opcion in enumerate(opciones)}
    codigos = [elegida.codigo for elegida in elegidas]
    if len(codigos) != len(set(codigos)):
        raise invalida('No se puede elegir la misma opción dos veces')
    for elegida in elegidas:
        # Ninguna fuente contiene OTRA (código reservado).
        if elegida.codigo in por_codigo:
            # Una opción de referencia guarda el texto vigente; el que traiga la petición se ignora.
            if elegida.texto is not None and not por_codigo[elegida.codigo].de_referencia:
                raise invalida('Solo la opción «otra» lleva texto')
        elif elegida.codigo == CODIGO_OTRA:
            if not item.permite_otra:
                raise invalida('Este ítem no admite la opción «otra»')
            if elegida.texto is None or not elegida.texto.strip():
                raise invalida('La opción «otra» necesita un texto')
        else:
            raise invalida(f'La opción {elegida.codigo} no pertenece a las opciones del ítem')
    if len(elegidas) > 1 and any(por_codigo.get(c) is not None and por_codigo[c].exclusiva for c in codigos):
        raise invalida('Esa opción se elige sola')
    if len(elegidas) > item.eleccion_maxima:
        raise invalida(f'Se pueden elegir como máximo {item.eleccion_maxima} opciones')
    if exigir_minimo and len(elegidas) < item.eleccion_minima:
        raise invalida(f'Se deben elegir al menos {item.eleccion_minima} opciones')
    if not item.eleccion_ordenada:
        elegidas = sorted(elegidas, key=lambda elegida: orden.get(elegida.codigo, len(orden)))
    guardadas = []
    for elegida in elegidas:
        opcion = por_codigo.get(elegida.codigo)
        if opcion is not None and opcion.de_referencia:
            guardadas.append({'codigo': elegida.codigo, 'texto': opcion.texto})
        elif elegida.texto is None:
            guardadas.append({'codigo': elegida.codigo})
        else:
            guardadas.append({'codigo': elegida.codigo, 'texto': elegida.texto})
    return guardadas
