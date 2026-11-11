"""Validación de la elección de un ítem de registro; sin base de datos."""

import re
from dataclasses import dataclass

from app.exceptions import ErrorAccion
from app.models.enums import FuenteOpciones


CODIGO_OTRA = 'OTRA'
# Ajuste registros llm (lote 2): en un ítem de varias opciones cada «Otra» lleva su número (`OTRA-1`, `OTRA-2`…).
_OTRA_NUMERADA = re.compile(r'OTRA-([1-9]\d*)')
FUENTES_PIEZAS = (FuenteOpciones.PIEZAS_PERFIL, FuenteOpciones.PIEZAS_PERFIL_MENOS, FuenteOpciones.PIEZAS_INICIO)


@dataclass(frozen=True, slots=True)
class OpcionItem:
    """Una opción que el ítem ofrece: de su lista, de su referencia (resuelta en vivo), una pieza o una propia.

    Las de referencia y las piezas se guardan con su texto, porque el objeto puede desaparecer o cambiar."""
    codigo: str
    texto: str
    exclusiva: bool = False
    de_referencia: bool = False
    sin_llm: bool = False


def invalida(mensaje):
    return ErrorAccion(mensaje, estado_http=422)


def es_otra(item, codigo):
    """`OTRA` en un ítem de una opción; `OTRA-n` (n hasta el máximo) en uno de varias."""
    if not item.permite_otra:
        return False
    if item.eleccion_maxima == 1:
        return codigo == CODIGO_OTRA
    numero = _OTRA_NUMERADA.fullmatch(codigo)
    return numero is not None and int(numero.group(1)) <= item.eleccion_maxima


def es_pieza(item, opcion):
    """Una pieza armada para la cuenta (lote 3): se valida su código y que el texto sea el que se ofrece."""
    return item.fuente_opciones in FUENTES_PIEZAS and getattr(opcion, 'origen', None) is not None


def validar_eleccion(item, opciones, elegidas, exigir_minimo):
    """Devuelve la elección para guardar: `[{codigo, texto}]`, con el texto tal como se mostró (la etiqueta, el de la
    referencia o la pieza, o lo escrito en «¿Cuál?»).

    `opciones` son las que el ítem le ofrece a la cuenta, en su orden: las de `resolver_contexto` (`OpcionContexto`,
    también las piezas) u `OpcionItem`. Sin exigir el mínimo se valida todo lo demás. Una elección no ordenada se guarda
    en el orden de las opciones (las «Otra» al final). Una opción exclusiva va sola.
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
    textos = {}
    for elegida in elegidas:
        opcion = por_codigo.get(elegida.codigo)
        if opcion is not None and es_pieza(item, opcion):
            if elegida.texto != opcion.texto:
                raise invalida(f'La pieza {elegida.codigo} no se ofrece con ese texto')
            textos[elegida.codigo] = opcion.texto
        elif opcion is not None:
            # Una opción de referencia guarda el texto vigente; el que traiga la petición se ignora.
            if elegida.texto is not None and not getattr(opcion, 'de_referencia', False):
                raise invalida('Solo la opción «otra» lleva texto')
            textos[elegida.codigo] = opcion.texto
        elif es_otra(item, elegida.codigo):
            if elegida.texto is None or not elegida.texto.strip():
                raise invalida('La opción «otra» necesita un texto')
            textos[elegida.codigo] = elegida.texto
        elif elegida.codigo.startswith(CODIGO_OTRA) and item.permite_otra:
            raise invalida('La opción «otra» no corresponde a este ítem')
        elif elegida.codigo.startswith(CODIGO_OTRA):
            raise invalida('Este ítem no admite la opción «otra»')
        else:
            raise invalida(f'La opción {elegida.codigo} no se ofrece en este ítem')
    if len(elegidas) > 1 and any(por_codigo.get(c) is not None and por_codigo[c].exclusiva for c in codigos):
        raise invalida('Esa opción se elige sola')
    if len(elegidas) > item.eleccion_maxima:
        raise invalida(f'Se pueden elegir como máximo {item.eleccion_maxima} opciones')
    if exigir_minimo and len(elegidas) < item.eleccion_minima:
        raise invalida(f'Se deben elegir al menos {item.eleccion_minima} opciones')
    if not item.eleccion_ordenada:
        elegidas = sorted(elegidas, key=lambda elegida: orden.get(elegida.codigo, len(orden)))
    return [{'codigo': elegida.codigo, 'texto': textos[elegida.codigo]} for elegida in elegidas]
