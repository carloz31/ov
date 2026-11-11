"""Ajuste registros llm (lote 3), §5 y §6: terminar el registro y emitir REGISTRO_ADECUADO (b1-1 de `contenido`).

Con el cliente de prueba, sin LLM. Los textos son DATO DE PRUEBA.
"""

import pytest
from soporte_contenido import REQUERIDAS, avanzar
from soporte_llm import fallo, salida
from soporte_ruta import FECHA, pedir, reenviar, responder_item, terminar

TEXTO = 'DATO DE PRUEBA: armaba castillos de cartón con mi primo.'
ITEMS = (('b1-1-gustos', []), ('b1-1-logro', [{'codigo': 'ORGANIZAR'}]), ('b1-1-dificultad', []))


@pytest.fixture
def llm(aplicacion_contenido):
    return aplicacion_contenido.state.cliente_llm


@pytest.fixture
def cliente(cliente_contenido):
    avanzar(cliente_contenido, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b1-1') - 1])
    return cliente_contenido


def responder_todo(cliente, *saltar):
    for item, opciones in ITEMS:
        if item not in saltar:
            responder_item(cliente, 'b1-1', item, opciones, TEXTO)


def adecuados(respuesta):
    return [e for e in respuesta['eventos_registrados'] if e['tipo'] == 'REGISTRO_ADECUADO']


def test_faltan_items_lista_los_que_faltan(cliente, llm):
    responder_todo(cliente, 'b1-1-dificultad')
    respuesta = cliente.post('/acciones/registro/entregar', json={'cuenta': 'est-ana', 'actividad': 'b1-1',
                                                                  'fecha_hora': FECHA})
    assert respuesta.status_code == 409 and respuesta.json()['detail']['items_faltantes'] == ['b1-1-dificultad']


def test_registro_adecuado_completa_y_emite(cliente, llm):
    llm.encolar('propio', salida('no_sabe'), 'emocional')
    responder_todo(cliente)
    cierre = terminar(cliente, 'b1-1')
    assert cierre['estado'] == 'COMPLETADA' and len(adecuados(cierre)) == 1
    assert cierre['item_actual'] is None
    # Terminar otra vez devuelve el registro tal como está y no emite dos veces.
    otra = terminar(cliente, 'b1-1')
    assert otra['estado'] == 'COMPLETADA' and adecuados(otra) == []


def test_completar_actividad_rechaza_un_registro(cliente, llm):
    responder_todo(cliente)
    pedir(cliente, 'POST', '/acciones/completar-actividad', {'cuenta': 'est-ana', 'actividad': 'b1-1',
                                                             'fecha_hora': FECHA}, 409)


@pytest.mark.parametrize('malas', [
    (salida('vacio'),), (salida('fuera_de_tema'),), (fallo(),), (salida('no_sabe'), salida('no_sabe')),
])
def test_no_adecuado_igual_completa_sin_emitir(cliente, llm, malas):
    llm.encolar(*malas)
    responder_todo(cliente)
    cierre = terminar(cliente, 'b1-1')
    assert cierre['estado'] == 'COMPLETADA' and adecuados(cierre) == []
    # La siguiente actividad se abre igual.
    assert any(e['tipo'] == 'COMPLETA_ACTIVIDAD' for e in cierre['eventos_registrados'])


def test_se_emite_despues_por_una_edicion_y_no_se_revoca(cliente, llm):
    llm.encolar(salida('vacio'))
    responder_todo(cliente)
    assert adecuados(terminar(cliente, 'b1-1')) == []
    edicion = responder_item(cliente, 'b1-1', 'b1-1-gustos', [], TEXTO)
    assert len(adecuados(edicion)) == 1
    llm.encolar(salida('vacio'))
    peor = responder_item(cliente, 'b1-1', 'b1-1-gustos', [], 'DATO DE PRUEBA: nada')
    assert adecuados(peor) == [] and peor['registro']['estado'] == 'COMPLETADA'
    # Volver a dejarlo adecuado no emite otra vez.
    assert adecuados(responder_item(cliente, 'b1-1', 'b1-1-gustos', [], TEXTO)) == []


def test_se_emite_despues_por_un_reenvio(cliente, llm):
    llm.encolar(fallo())
    responder_todo(cliente)
    assert adecuados(terminar(cliente, 'b1-1')) == []
    assert len(adecuados(reenviar(cliente, 'b1-1', 'b1-1-gustos'))) == 1


def test_antes_de_terminar_no_se_emite(cliente, llm):
    responder_todo(cliente)
    assert adecuados(responder_item(cliente, 'b1-1', 'b1-1-gustos', [], TEXTO)) == []
