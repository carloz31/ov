"""Validación pura de la elección de un ítem de registro."""

from types import SimpleNamespace

import pytest

from app.exceptions import ErrorAccion
from app.services.registro.eleccion import OpcionItem, validar_eleccion


# DATO DE PRUEBA: una lista de tres opciones.
OPCIONES = tuple(OpcionItem(c, f'Opción {c}') for c in ('A', 'B', 'C'))


def item(**cambios):
    # Ajuste registros: la fuente de opciones reemplaza a `lista_id` como señal de que el ítem tiene elección.
    datos = {'lista_id': 1, 'referencia_id': None, 'eleccion_minima': 1, 'eleccion_maxima': 2,
             'eleccion_ordenada': False, 'permite_otra': True, **cambios}
    datos.setdefault('fuente_opciones', None if datos['lista_id'] is None else 'LISTA')
    return SimpleNamespace(**datos)


def elegidas(*pares):
    return [SimpleNamespace(codigo=c, texto=t) for c, t in pares]


def test_sin_lista_solo_acepta_vacio():
    assert validar_eleccion(item(lista_id=None), (), [], True) == []
    with pytest.raises(ErrorAccion):
        validar_eleccion(item(lista_id=None), (), elegidas(('A', None)), False)


def test_no_ordenada_sigue_la_lista_y_otra_va_al_final():
    # Ajuste registros llm (lote 2): se guarda el texto tal como se mostró; con varias opciones, «Otra» va numerada.
    assert validar_eleccion(item(), OPCIONES, elegidas(('OTRA-1', 'x'), ('C', None)), True) == [
        {'codigo': 'C', 'texto': 'Opción C'}, {'codigo': 'OTRA-1', 'texto': 'x'}]


def test_ordenada_conserva_el_orden():
    assert validar_eleccion(item(eleccion_ordenada=True), OPCIONES, elegidas(('C', None), ('A', None)), True) == [
        {'codigo': 'C', 'texto': 'Opción C'}, {'codigo': 'A', 'texto': 'Opción A'}]


def test_varias_otra_en_un_podio_y_una_sola_otra_en_un_item_de_una_opcion():
    podio = item(eleccion_minima=3, eleccion_maxima=3, eleccion_ordenada=True)
    assert validar_eleccion(podio, OPCIONES, elegidas(('OTRA-2', 'y'), ('A', None), ('OTRA-1', 'x')), True) == [
        {'codigo': 'OTRA-2', 'texto': 'y'}, {'codigo': 'A', 'texto': 'Opción A'}, {'codigo': 'OTRA-1', 'texto': 'x'}]
    for codigo in ('OTRA', 'OTRA-4', 'OTRA-0'):
        with pytest.raises(ErrorAccion):
            validar_eleccion(podio, OPCIONES, elegidas((codigo, 'x')), False)
    una = item(eleccion_maxima=1)
    assert validar_eleccion(una, OPCIONES, elegidas(('OTRA', 'x')), True) == [{'codigo': 'OTRA', 'texto': 'x'}]
    with pytest.raises(ErrorAccion):
        validar_eleccion(una, OPCIONES, elegidas(('OTRA-1', 'x')), True)


def test_piezas_se_validan_contra_las_ofrecidas_con_su_texto():
    """Lote 3: una pieza vale si se le ofrece a la cuenta y con el texto que se le ofrece (ya no por prefijo)."""
    from app.services.registro.contexto import OpcionContexto
    piezas = item(lista_id=None, fuente_opciones='PIEZAS_PERFIL', eleccion_maxima=2)
    ofrecidas = (OpcionContexto('INTEL-ESP', 'Ver formas', origen='Tu test de inteligencias'),
                 OpcionContexto('GUSTO', '«Armar castillos»', origen='Lo que te encantaba de niño'))
    assert validar_eleccion(piezas, ofrecidas, elegidas(('INTEL-ESP', 'Ver formas')), True) == [
        {'codigo': 'INTEL-ESP', 'texto': 'Ver formas'}]
    for pares in ((('INTEL-ESP', 'Otro texto'),), (('GUSTO', None),), (('INI-OPCION', 'x'),),
                  (('CUESTA-MATEMATICA', 'x'),)):
        with pytest.raises(ErrorAccion):
            validar_eleccion(piezas, ofrecidas, elegidas(*pares), True)


def test_minimo_y_podio_incompleto():
    podio = item(eleccion_minima=3, eleccion_maxima=3, eleccion_ordenada=True)
    with pytest.raises(ErrorAccion):
        validar_eleccion(podio, OPCIONES, elegidas(('A', None), ('B', None)), True)


@pytest.mark.parametrize(('cambios', 'pares', 'minimo'), [
    ({}, (), True), ({}, (('A', None), ('B', None), ('C', None)), False), ({}, (('Z', None),), False),
    ({}, (('A', None), ('A', None)), False), ({'permite_otra': False}, (('OTRA', 'x'),), False),
    ({}, (('OTRA-1', None),), False), ({}, (('A', 'x'),), False),
])
def test_rechazos_con_422(cambios, pares, minimo):
    with pytest.raises(ErrorAccion) as error:
        validar_eleccion(item(**cambios), OPCIONES, elegidas(*pares), minimo)
    assert error.value.estado_http == 422


def test_sin_exigir_el_minimo_se_valida_lo_demas():
    assert validar_eleccion(item(), OPCIONES, [], False) == []


def test_exclusiva_va_sola_y_la_de_referencia_guarda_su_texto():
    """Ajuste registros: una opción propia exclusiva no se combina; una de referencia guarda el texto vigente."""
    opciones = (OpcionItem('mtpe-1', 'DATO DE PRUEBA: Enfermería', de_referencia=True),
                OpcionItem('NINGUNO', 'Ninguno', exclusiva=True))
    referencia = item(lista_id=None, fuente_opciones='REFERENCIA', permite_otra=False)
    assert validar_eleccion(referencia, opciones, elegidas(('mtpe-1', 'se ignora')), True) == [
        {'codigo': 'mtpe-1', 'texto': 'DATO DE PRUEBA: Enfermería'}]
    with pytest.raises(ErrorAccion):
        validar_eleccion(referencia, opciones, elegidas(('mtpe-1', None), ('NINGUNO', None)), True)
