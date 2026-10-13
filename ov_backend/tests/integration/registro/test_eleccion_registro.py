"""HU-006: la elección de un ítem se valida al enviar y se guarda con el texto."""

import pytest
from soporte_ruta import FECHA, avanzar, pedir


TEXTO = 'DATO DE PRUEBA: una respuesta con su ejemplo y su razón.'


def enviar(cliente, item, opciones, actividad='t-expectativas', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/enviar', {
        'cuenta': 'est-ana', 'actividad': actividad, 'item': item, 'fecha_hora': FECHA,
        'texto': TEXTO, 'opciones': opciones}, esperado)


def elegidas(cliente, item, actividad='t-expectativas'):
    registro = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')
    return next(r['opciones_elegidas'] for r in registro['respuestas'] if r['item'] == item)


@pytest.mark.parametrize(('item', 'opciones', 'mensaje'), [
    ('t-exp-ruta', [], 'al menos 1'),
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'INSTITUTO'}, {'codigo': 'TRABAJAR'}], 'como máximo 2'),
    ('t-exp-ruta', [{'codigo': 'FAMILIA'}], 'no pertenece'),
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'UNIVERSIDAD'}], 'dos veces'),
    ('t-exp-ruta', [{'codigo': 'OTRA'}], 'necesita un texto'),
    ('t-exp-ruta', [{'codigo': 'OTRA', 'texto': '  '}], 'necesita un texto'),
    ('t-exp-ruta', [{'codigo': 'UNIVERSIDAD', 'texto': 'Algo'}], 'Solo la opción «otra»'),
    ('t-exp-apoyo', [{'codigo': 'OTRA', 'texto': 'Mi tía'}], 'no admite la opción «otra»'),
    ('t-exp-espera', [{'codigo': 'UNIVERSIDAD'}], 'no tiene opciones'),
])
def test_eleccion_invalida_responde_422_sin_escribir(cliente, item, opciones, mensaje):
    avanzar(cliente, 't-cierre-inicio')
    respuesta = enviar(cliente, item, opciones, esperado=422)
    assert mensaje in respuesta['detail']['mensaje']
    assert pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')['respuestas'] == []


def test_otra_con_texto_y_eleccion_no_ordenada_en_el_orden_de_la_lista(cliente):
    avanzar(cliente, 't-cierre-inicio')
    enviar(cliente, 't-exp-ruta', [{'codigo': 'OTRA', 'texto': 'Viajar un año'}, {'codigo': 'TRABAJAR'}])
    assert elegidas(cliente, 't-exp-ruta') == [{'codigo': 'TRABAJAR'}, {'codigo': 'OTRA', 'texto': 'Viajar un año'}]


def test_eleccion_ordenada_conserva_el_orden_elegido(cliente):
    avanzar(cliente, 't-cierre-inicio')
    orden = [{'codigo': 'LIBERTAD'}, {'codigo': 'SERVIR'}, {'codigo': 'CREAR'}]
    enviar(cliente, 't-val-orden', orden, actividad='t-valores')
    assert elegidas(cliente, 't-val-orden', 't-valores') == orden


def test_editar_en_final_reemplaza_la_eleccion(cliente):
    avanzar(cliente, 't-cierre-inicio')
    assert enviar(cliente, 't-exp-apoyo', [{'codigo': 'FAMILIA'}])['estado'] == 'FINAL'
    enviar(cliente, 't-exp-apoyo', [{'codigo': 'AMIGOS'}])
    assert elegidas(cliente, 't-exp-apoyo') == [{'codigo': 'AMIGOS'}]
    enviar(cliente, 't-exp-apoyo', [], esperado=422)
    assert elegidas(cliente, 't-exp-apoyo') == [{'codigo': 'AMIGOS'}]
