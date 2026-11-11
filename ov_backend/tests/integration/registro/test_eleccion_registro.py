"""HU-006: la elección de un ítem se valida al entregarla y se guarda con el texto tal como se mostró.

Ajuste registros llm (lote 2): la entrega es provisional (sin LLM) y trae todos los ítems; en un ítem de varias
opciones cada «Otra» lleva su número (`OTRA-1`, `OTRA-2`).
"""

import pytest
from soporte_ruta import FECHA, avanzar, pedir


TEXTO = 'DATO DE PRUEBA: una respuesta con su ejemplo y su razón.'
BASE = {'t-exp-ruta': [{'codigo': 'UNIVERSIDAD'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}


def entregar(cliente, opciones=None, actividad='t-expectativas', esperado=200):
    opciones = {**BASE, **(opciones or {})} if actividad == 't-expectativas' else opciones
    return pedir(cliente, 'POST', '/acciones/registro/entregar', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'items': [{'item': item, 'texto': TEXTO, 'opciones': elegidas} for item, elegidas in opciones.items()]},
        esperado)


def elegidas(cliente, item, actividad='t-expectativas'):
    registro = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')
    return next(r['opciones_elegidas'] for r in registro['respuestas'] if r['item'] == item)


@pytest.mark.parametrize(('item', 'opciones', 'mensaje'), [
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'INSTITUTO'}, {'codigo': 'TRABAJAR'}], 'como máximo 2'),
    ('t-exp-ruta', [{'codigo': 'FAMILIA'}], 'no pertenece'),
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
    respuesta = entregar(cliente, {item: opciones}, esperado=422)
    assert mensaje in respuesta['detail']['mensaje']
    assert pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')['respuestas'] == []


def test_faltan_items_obligatorios_y_texto_vacio(cliente):
    avanzar(cliente, 't-cierre-inicio')
    respuesta = pedir(cliente, 'POST', '/acciones/registro/entregar', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA,
        'items': [{'item': 't-exp-espera', 'texto': TEXTO}]}, 409)
    assert respuesta['detail']['items_faltantes'] == ['t-exp-ruta', 't-exp-apoyo']
    vacio = pedir(cliente, 'POST', '/acciones/registro/entregar', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA,
        'items': [{'item': i, 'texto': ' ', 'opciones': o} for i, o in BASE.items()]}, 422)
    assert 'vacía' in vacio['detail']['mensaje']


def test_otras_con_texto_y_eleccion_no_ordenada_en_el_orden_de_la_lista(cliente):
    avanzar(cliente, 't-cierre-inicio')
    entregar(cliente, {'t-exp-ruta': [{'codigo': 'OTRA-1', 'texto': 'Viajar un año'}, {'codigo': 'TRABAJAR'}]})
    assert elegidas(cliente, 't-exp-ruta') == [{'codigo': 'TRABAJAR', 'texto': 'Trabajar'},
                                               {'codigo': 'OTRA-1', 'texto': 'Viajar un año'}]


def test_eleccion_ordenada_conserva_el_orden_elegido_al_entregar(cliente):
    avanzar(cliente, 't-cierre-inicio')
    orden = [{'codigo': 'LIBERTAD'}, {'codigo': 'SERVIR'}, {'codigo': 'CREAR'}]
    respuesta = entregar(cliente, {'t-val-orden': orden, 't-val-libre': [], 't-val-breve': []}, actividad='t-valores')
    assert respuesta['estado'] == 'COMPLETADA'
    assert [e['codigo'] for e in elegidas(cliente, 't-val-orden', 't-valores')] == ['LIBERTAD', 'SERVIR', 'CREAR']


def test_entregar_dos_veces_responde_409(cliente):
    avanzar(cliente, 't-cierre-inicio')
    entregar(cliente)
    assert 'ya fue entregado' in entregar(cliente, esperado=409)['detail']['mensaje']
