"""HU-006: la elección de un ítem se valida al responderlo y se guarda con el texto tal como se mostró.

Ajuste registros llm (lote 3): se responde ítem por ítem y se valida contra lo que `resolver_contexto` le ofrece a la
cuenta; en un ítem de varias opciones cada «Otra» lleva su número (`OTRA-1`, `OTRA-2`).
"""

import pytest
from soporte_ruta import FECHA, avanzar, item_de, leer_registro, pedir, responder_item, terminar


TEXTO = 'DATO DE PRUEBA: una respuesta con su ejemplo y su razón.'
BASE = {'t-exp-ruta': [{'codigo': 'UNIVERSIDAD'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}


def responder_todos(cliente, opciones=None, actividad='t-expectativas'):
    """Responde cada ítem con `opciones` y termina el registro."""
    opciones = {**BASE, **(opciones or {})} if actividad == 't-expectativas' else opciones
    for item, elegidas_item in opciones.items():
        responder_item(cliente, actividad, item, elegidas_item, TEXTO)
    return terminar(cliente, actividad)


def elegidas(cliente, item, actividad='t-expectativas'):
    return item_de(leer_registro(cliente, actividad), item)['respuesta']['opciones_elegidas']


@pytest.mark.parametrize(('item', 'opciones', 'mensaje'), [
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'INSTITUTO'}, {'codigo': 'TRABAJAR'}], 'como máximo 2'),
    ('t-exp-ruta', [{'codigo': 'FAMILIA'}], 'no se ofrece'),
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'UNIVERSIDAD'}], 'dos veces'),
    ('t-exp-ruta', [{'codigo': 'OTRA-1'}], 'necesita un texto'),
    ('t-exp-ruta', [{'codigo': 'OTRA-1', 'texto': '  '}], 'necesita un texto'),
    # En un ítem de varias opciones la «Otra» va numerada, hasta el máximo.
    ('t-exp-ruta', [{'codigo': 'OTRA', 'texto': 'Viajar'}], 'no corresponde'),
    ('t-exp-ruta', [{'codigo': 'OTRA-3', 'texto': 'Viajar'}], 'no corresponde'),
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD', 'texto': 'Algo'}], 'Solo la opción «otra»'),
    ('t-exp-apoyo', [{'codigo': 'OTRA', 'texto': 'Mi tía'}], 'no admite la opción «otra»'),
    ('t-exp-espera', [{'codigo': 'UNIVERSIDAD'}], 'no tiene opciones'),
    ('t-exp-ruta', [], 'al menos 1'),
])
def test_eleccion_invalida_responde_422_sin_escribir(cliente, item, opciones, mensaje):
    avanzar(cliente, 't-cierre-inicio')
    respuesta = responder_item(cliente, 't-expectativas', item, opciones, TEXTO, esperado=422)
    assert mensaje in respuesta['detail']['mensaje']
    assert all(i['respuesta'] is None for i in leer_registro(cliente, 't-expectativas')['items'])


def test_faltan_items_obligatorios_y_texto_vacio(cliente):
    avanzar(cliente, 't-cierre-inicio')
    responder_item(cliente, 't-expectativas', 't-exp-espera', [], TEXTO)
    respuesta = terminar(cliente, 't-expectativas', esperado=409)
    assert respuesta['detail']['items_faltantes'] == ['t-exp-ruta', 't-exp-apoyo']
    vacio = responder_item(cliente, 't-expectativas', 't-exp-ruta', BASE['t-exp-ruta'], ' ', esperado=422)
    assert 'vacía' in vacio['detail']['mensaje']


def test_otras_con_texto_y_eleccion_no_ordenada_en_el_orden_de_la_lista(cliente):
    avanzar(cliente, 't-cierre-inicio')
    responder_todos(cliente, {'t-exp-ruta': [{'codigo': 'OTRA-1', 'texto': 'Viajar un año'}, {'codigo': 'TRABAJAR'}]})
    assert elegidas(cliente, 't-exp-ruta') == [{'codigo': 'TRABAJAR', 'texto': 'Trabajar'},
                                               {'codigo': 'OTRA-1', 'texto': 'Viajar un año'}]


def test_eleccion_ordenada_conserva_el_orden_elegido(cliente):
    avanzar(cliente, 't-cierre-inicio')
    orden = [{'codigo': 'LIBERTAD'}, {'codigo': 'SERVIR'}, {'codigo': 'CREAR'}]
    respuesta = responder_todos(cliente, {'t-val-orden': orden, 't-val-libre': [], 't-val-breve': []},
                                actividad='t-valores')
    assert respuesta['estado'] == 'COMPLETADA'
    assert [e['codigo'] for e in elegidas(cliente, 't-val-orden', 't-valores')] == ['LIBERTAD', 'SERVIR', 'CREAR']


def test_terminar_dos_veces_devuelve_el_registro_tal_como_esta(cliente):
    """Decisión del usuario (lote 3): sobre un registro completado, terminar no da 409."""
    avanzar(cliente, 't-cierre-inicio')
    primera = responder_todos(cliente)
    segunda = terminar(cliente, 't-expectativas')
    assert segunda['estado'] == 'COMPLETADA' and segunda['items'] == primera['items']
    assert not any(e['tipo'] == 'REGISTRO_ADECUADO' for e in segunda['eventos_registrados'])


def test_responder_un_item_que_no_es_de_la_actividad(cliente):
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/registro/responder', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'item': 't-val-orden', 'texto': TEXTO,
        'fecha_hora': FECHA}, 404)
