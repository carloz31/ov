"""B05 y F02: `t-eco-ruta` retoma la elección de `t-exp-ruta`: elige de la misma lista y la referencia solo marca
lo elegido la vez pasada, que el estudiante mantiene o cambia.

Los textos son DATO DE PRUEBA. Ajuste registros llm (lote 2): se entrega con la entrega provisional (todos los ítems a
la vez, sin LLM); en un ítem de varias opciones la «Otra» se numera (`OTRA-1`).
"""

import pytest

from soporte_ruta import FECHA, actividades, avanzar, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
OTRA = {'codigo': 'OTRA-1', 'texto': 'DATO DE PRUEBA: trabajar en el taller familiar'}


def entregar(cliente, actividad, items, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/entregar', {
        'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA,
        'items': [{'item': item, 'texto': ADECUADO, 'opciones': opciones} for item, opciones in items]}, esperado)


def cerrar_expectativas(cliente, cuenta='est-ana'):
    """Entrega t-expectativas eligiendo UNIVERSIDAD y una «Otra»."""
    avanzar(cliente, 't-cierre-inicio', cuenta)
    entregar(cliente, 't-expectativas', (('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, OTRA]),
                                         ('t-exp-apoyo', [{'codigo': 'FAMILIA'}]), ('t-exp-espera', [])), cuenta)


def entregar_eco(cliente, opciones, esperado=200):
    return entregar(cliente, 't-eco', (('t-eco-ruta', opciones), ('t-eco-espera', [])), esperado=esperado)


def test_items_de_t_eco_publican_la_lista_y_la_referencia(cliente):
    ruta, espera = pedir(cliente, 'GET', '/actividades/t-eco/items-registro')
    original = pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')[0]['eleccion']
    assert ruta['eleccion'] == {**original, 'referencia': 't-ref-rutas'}
    assert [o['codigo'] for o in ruta['eleccion']['opciones']] == [o['codigo'] for o in original['opciones']]
    assert espera['eleccion'] is None
    assert original['referencia'] is None


@pytest.mark.parametrize('opciones', [
    [{'codigo': 'NADA'}],
    [{'codigo': 'OTRA-1'}],  # la «otra» lleva su texto, como en cualquier lista
    [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'INSTITUTO'}, {'codigo': 'TRABAJAR'}],  # supera la máxima
])
def test_valida_contra_la_lista(cliente, opciones):
    cerrar_expectativas(cliente)
    entregar_eco(cliente, opciones, esperado=422)


@pytest.mark.parametrize('opciones', [
    [{'codigo': 'UNIVERSIDAD'}, OTRA],  # mantiene lo de la vez pasada
    [{'codigo': 'INSTITUTO'}],  # cambia
    [{'codigo': 'AUN_NO_SE'}],
])
def test_mantiene_o_cambia_lo_elegido_antes(cliente, opciones):
    cerrar_expectativas(cliente)
    entregar_eco(cliente, opciones)
    lista = pedir(cliente, 'GET', '/actividades/t-eco/items-registro')[0]['eleccion']['opciones']
    textos = {o['codigo']: o['texto'] for o in lista}
    registro = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/registro')
    # Lo guardado lleva siempre su texto: el de la lista o el escrito en la «Otra».
    assert registro['respuestas'][0]['opciones_elegidas'] == [
        {'codigo': o['codigo'], 'texto': o.get('texto') or textos[o['codigo']]} for o in opciones]


def test_entrega_exige_la_minima(cliente):
    cerrar_expectativas(cliente)
    entregar_eco(cliente, [], esperado=422)


def test_entregar_t_eco_adecuado_no_abre_la_mision_adicional(cliente):
    # La entrega provisional de t-expectativas siempre emite su REGISTRO_ADECUADO (que sí abre t-adicional): t-eco se
    # abre con el evento crudo de completarla, para ver que el REGISTRO_ADECUADO de t-eco no la abre.
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-expectativas'})
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    entrega = entregar_eco(cliente, [{'codigo': 'UNIVERSIDAD'}])
    assert ('REGISTRO_ADECUADO', 't-eco') in [(e['tipo'], e['referencia']) for e in entrega['eventos_registrados']]
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
