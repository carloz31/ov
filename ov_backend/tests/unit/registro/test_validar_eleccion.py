"""Validación pura de la elección de un ítem de registro."""

from types import SimpleNamespace

import pytest

from app.exceptions import ErrorAccion
from app.services.registro.eleccion import validar_eleccion


# DATO DE PRUEBA: una lista de tres opciones.
OPCIONES = tuple(SimpleNamespace(codigo=c) for c in ('A', 'B', 'C'))


def item(**cambios):
    return SimpleNamespace(**{'lista_id': 1, 'eleccion_minima': 1, 'eleccion_maxima': 2,
                              'eleccion_ordenada': False, 'permite_otra': True, **cambios})


def elegidas(*pares):
    return [SimpleNamespace(codigo=c, texto=t) for c, t in pares]


def test_sin_lista_solo_acepta_vacio():
    assert validar_eleccion(item(lista_id=None), (), [], True) == []
    with pytest.raises(ErrorAccion):
        validar_eleccion(item(lista_id=None), (), elegidas(('A', None)), False)


def test_no_ordenada_sigue_la_lista_y_otra_va_al_final():
    assert validar_eleccion(item(), OPCIONES, elegidas(('OTRA', 'x'), ('C', None)), True) == [
        {'codigo': 'C'}, {'codigo': 'OTRA', 'texto': 'x'}]


def test_ordenada_conserva_el_orden():
    assert validar_eleccion(item(eleccion_ordenada=True), OPCIONES, elegidas(('C', None), ('A', None)), True) == [
        {'codigo': 'C'}, {'codigo': 'A'}]


@pytest.mark.parametrize(('cambios', 'pares', 'minimo'), [
    ({}, (), True), ({}, (('A', None), ('B', None), ('C', None)), False), ({}, (('Z', None),), False),
    ({}, (('A', None), ('A', None)), False), ({'permite_otra': False}, (('OTRA', 'x'),), False),
    ({}, (('OTRA', None),), False), ({}, (('A', 'x'),), False),
])
def test_rechazos_con_422(cambios, pares, minimo):
    with pytest.raises(ErrorAccion) as error:
        validar_eleccion(item(**cambios), OPCIONES, elegidas(*pares), minimo)
    assert error.value.estado_http == 422


def test_el_borrador_no_exige_el_minimo():
    assert validar_eleccion(item(), OPCIONES, [], False) == []
