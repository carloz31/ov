"""Ajuste registros llm (lote 3), §7 y §8: la lectura del registro para el estudiante y el eco cambiado (`contenido`).

Con el cliente de prueba, sin LLM. Los textos son DATO DE PRUEBA.
"""

import pytest
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar
from soporte_llm import salida
from soporte_ruta import FECHA, eleccion_minima, item_de, leer_registro, pedir, responder_item, responder_registro

TEXTO = 'DATO DE PRUEBA: una respuesta con su ejemplo.'
PROHIBIDOS = {'tipo', 'motivo', 'sensible', 'tipo_final', 'primera_tipo', 'conjunto_tipo', 'abierto', 'intento',
              'historico', 'estado_intento'}


@pytest.fixture
def llm(aplicacion_contenido):
    return aplicacion_contenido.state.cliente_llm


def hasta(cliente, actividad):
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index(actividad) - 1])


def claves(valor):
    if isinstance(valor, dict):
        return set(valor) | set().union(*(claves(v) for v in valor.values()))
    if isinstance(valor, list):
        return set().union(*(claves(v) for v in valor)) if valor else set()
    return set()


def responder(cliente, actividad, item, texto=TEXTO, opciones=None):
    registro = leer_registro(cliente, actividad)
    return responder_item(cliente, actividad, item, eleccion_minima(item_de(registro, item)) if opciones is None
                          else opciones, texto)


def marcado(cliente, actividad, item):
    return item_de(leer_registro(cliente, actividad), item)['respuesta']['eco_cambiado']


# --- Lectura -----------------------------------------------------------------------------------

def test_lectura_trae_contexto_resuelto_respuesta_e_item_actual(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b1-1')
    registro = leer_registro(cliente, 'b1-1')
    assert (registro['estado'], registro['item_actual']) == (None, 'b1-1-gustos')
    gustos, logro, _ = registro['items']
    assert gustos['consigna']['pregunta_texto'].startswith('¿Qué te encantaba hacer')
    assert gustos['respuesta'] is None and gustos['disponible'] and gustos['con_llm']
    assert logro['eleccion']['maxima'] == 2 and any(o['codigo'] == 'NINGUNO' for o in logro['opciones'])
    ninguno, = [o for o in logro['opciones'] if o['codigo'] == 'NINGUNO']
    # Cada opción trae su pregunta: la de NINGUNO es la suya, no la del ítem.
    assert ninguno['pregunta'].startswith('Está bien, a veces cuesta')
    llm.encolar(salida('general', '¿Qué hacías exactamente con esos castillos?'))
    paso = responder(cliente, 'b1-1', 'b1-1-gustos')
    leido = item_de(paso['registro'], 'b1-1-gustos')['respuesta']
    assert leido == {'opciones_elegidas': [], 'primera_respuesta': TEXTO, 'linea_seguimiento': None,
                     'pista': '¿Qué hacías exactamente con esos castillos?', 'reenviable': False,
                     'eco_cambiado': False}
    assert paso['registro']['item_actual'] == 'b1-1-logro'
    assert not claves(leer_registro(cliente, 'b1-1')) & PROHIBIDOS


def test_sin_pista_en_propio_ni_en_sensible(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b1-1')
    responder(cliente, 'b1-1', 'b1-1-gustos')
    llm.encolar(salida('general', sensible=True))
    responder(cliente, 'b1-1', 'b1-1-dificultad')
    registro = leer_registro(cliente, 'b1-1')
    assert item_de(registro, 'b1-1-gustos')['respuesta']['pista'] is None
    assert item_de(registro, 'b1-1-dificultad')['respuesta']['pista'] is None
    assert registro['item_actual'] == 'b1-1-logro'


def test_pregunta_de_la_opcion_en_los_items_con_pregunta_por_opcion(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b2-4')
    responder(cliente, 'b2-4', 'b2-4-bien')
    responder(cliente, 'b2-4', 'b2-4-cuesta')
    cruce = item_de(leer_registro(cliente, 'b2-4'), 'b2-4-cruce')
    preguntas = {o['codigo']: o['pregunta'] for o in cruce['opciones']}
    assert len(set(preguntas.values())) == len(preguntas) > 1


# --- Eco cambiado ------------------------------------------------------------------------------

def test_editar_b2_4_bien_marca_b2_4_cruce_y_editar_cruce_la_quita(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b2-4')
    bien = item_de(leer_registro(cliente, 'b2-4'), 'b2-4-bien')
    codigos = [o['codigo'] for o in bien['opciones'] if not o['exclusiva']]
    responder(cliente, 'b2-4', 'b2-4-bien', opciones=[{'codigo': c} for c in codigos[:3]])
    responder(cliente, 'b2-4', 'b2-4-cuesta')
    responder(cliente, 'b2-4', 'b2-4-cruce')
    assert not marcado(cliente, 'b2-4', 'b2-4-cruce')
    responder(cliente, 'b2-4', 'b2-4-bien', opciones=[{'codigo': c} for c in (codigos[3], codigos[0], codigos[1])])
    assert marcado(cliente, 'b2-4', 'b2-4-cruce')
    # La respuesta no se borra ni se reabre, y la consigna que se sirve es la de hoy.
    cruce = item_de(leer_registro(cliente, 'b2-4'), 'b2-4-cruce')
    assert cruce['respuesta']['primera_respuesta'] == TEXTO
    responder(cliente, 'b2-4', 'b2-4-cruce')
    assert not marcado(cliente, 'b2-4', 'b2-4-cruce')
    # Un ítem sin marcadores, ecos ni piezas nunca la tiene.
    assert not marcado(cliente, 'b2-4', 'b2-4-bien')


def test_cambiar_el_plan_a_marca_b4_1(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b4-1')
    responder_registro(cliente, 'b4-1')
    respalda = item_de(leer_registro(cliente, 'b4-1'), 'b4-1-respalda')
    assert not respalda['respuesta']['eco_cambiado']
    pedir(cliente, 'POST', '/acciones/planes/ordenar', {'cuenta': 'est-ana', 'carreras': [PERIODISMO, PSICOLOGIA],
                                                        'fecha_hora': FECHA})
    assert marcado(cliente, 'b4-1', 'b4-1-respalda')


def test_una_pieza_que_cambia_de_texto_marca_el_item(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b4-1')
    registro = leer_registro(cliente, 'b4-1')
    respalda = item_de(registro, 'b4-1-respalda')
    gusto = next((o for o in respalda['opciones'] if o['codigo'] == 'GUSTO'), None)
    assert gusto is not None
    responder_item(cliente, 'b4-1', 'b4-1-respalda', [{'codigo': 'GUSTO', 'texto': gusto['texto']}], TEXTO)
    assert not marcado(cliente, 'b4-1', 'b4-1-respalda')
    # Editar b1-1-gustos cambia el texto de la pieza GUSTO.
    responder_item(cliente, 'b1-1', 'b1-1-gustos', [], 'DATO DE PRUEBA: dibujaba mapas del barrio')
    assert marcado(cliente, 'b4-1', 'b4-1-respalda')


def test_completar_un_paso_del_plan_a_no_marca_b5_1(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b5-1')
    responder_registro(cliente, 'b5-1')
    assert not marcado(cliente, 'b5-1', 'b5-1-seguridad')
    pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1,
                                                           'fecha_hora': FECHA})
    assert not marcado(cliente, 'b5-1', 'b5-1-seguridad')


# --- Referencias (§11): lo respondido por el flujo se cita en la actividad siguiente ------------

def test_un_item_propio_aparece_como_eco_en_la_actividad_siguiente(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b1-7')
    dia = 'DATO DE PRUEBA: me despierto en Arequipa y voy al taller'
    registro = leer_registro(cliente, 'b1-7')
    while registro['item_actual'] is not None:
        item = item_de(registro, registro['item_actual'])
        texto = dia if item['codigo'] == 'b1-7-dia' else TEXTO
        registro = responder_item(cliente, 'b1-7', item['codigo'], eleccion_minima(item), texto)['registro']
    pedir(cliente, 'POST', '/acciones/registro/entregar', {'cuenta': 'est-ana', 'actividad': 'b1-7',
                                                           'fecha_hora': FECHA})
    ecos = [e for i in leer_registro(cliente, 'ma3')['items'] for e in i['ecos']]
    assert any(e.get('texto') == dia for e in ecos)


def test_un_item_vacio_no_se_cita(cliente_contenido, llm):
    cliente = cliente_contenido
    hasta(cliente, 'b1-7')
    registro = leer_registro(cliente, 'b1-7')
    while registro['item_actual'] is not None:
        item = item_de(registro, registro['item_actual'])
        if item['codigo'] == 'b1-7-dia':
            llm.encolar(salida('vacio'))
        registro = responder_item(cliente, 'b1-7', item['codigo'], eleccion_minima(item), TEXTO)['registro']
    referencias = {r['codigo']: r for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/ma3/referencias')[
        'referencias']}
    assert 'texto' not in referencias['ma3-ref-dia']
