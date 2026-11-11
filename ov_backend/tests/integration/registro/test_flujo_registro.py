"""Ajuste registros llm (lote 3): el flujo ítem por ítem de b1-1 (`contenido`) con el cliente de prueba, sin LLM.

Responder (cada paso), guardar primero, seguimiento, avanzar sin responder, reenvío, edición y su tope. Los textos son
DATO DE PRUEBA.
"""

import pytest
from soporte_contenido import REQUERIDAS, avanzar
from soporte_llm import fallo, salida
from soporte_ruta import FECHA, item_de, leer_registro, pedir, reenviar, responder_item, seguir, terminar
from sqlalchemy import select

from app.models import ItemRegistro, RespuestaRegistro
from app.models.enums import EstadoRespuestaRegistro
from datos.fijos import TEXTOS_FIJOS

TEXTOS = dict(TEXTOS_FIJOS)
TEXTO = 'DATO DE PRUEBA: armaba castillos de cartón con mi primo en el patio.'
LOGRO = [{'codigo': 'ORGANIZAR'}]
# `estado` sí sale, pero es el de la actividad.
PROHIBIDOS = {'tipo', 'motivo', 'sensible', 'primera_tipo', 'tipo_final', 'conjunto_tipo', 'primera_motivo'}


@pytest.fixture
def llm(aplicacion_contenido):
    return aplicacion_contenido.state.cliente_llm


@pytest.fixture
def cliente(cliente_contenido):
    avanzar(cliente_contenido, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b1-1') - 1])
    return cliente_contenido


def intentos(sesion, item):
    codigo = sesion.scalar(select(ItemRegistro.id).where(ItemRegistro.codigo == item))
    return sesion.scalars(select(RespuestaRegistro).where(RespuestaRegistro.item_registro_id == codigo)
                          .order_by(RespuestaRegistro.intento).execution_options(populate_existing=True)).all()


def vigente(sesion, item):
    return next(r for r in intentos(sesion, item) if r.vigente)


def claves(valor):
    """Todas las claves de un JSON, a cualquier profundidad."""
    if isinstance(valor, dict):
        return set(valor) | set().union(*(claves(v) for v in valor.values()))
    if isinstance(valor, list):
        return set().union(*(claves(v) for v in valor)) if valor else set()
    return set()


def logro(cliente, opciones=None, texto=TEXTO, esperado=200):
    return responder_item(cliente, 'b1-1', 'b1-1-logro', LOGRO if opciones is None else opciones, texto,
                          esperado=esperado)


def gustos(cliente, texto=TEXTO, esperado=200):
    return responder_item(cliente, 'b1-1', 'b1-1-gustos', [], texto, esperado=esperado)


# --- Responder un ítem -------------------------------------------------------------------------

def test_propio_pasa_al_siguiente_y_queda_cerrado_con_texto_citable(cliente, llm, sesion_contenido):
    paso = gustos(cliente)
    assert (paso['paso'], paso['repregunta'], paso['mensaje']) == ('SIGUIENTE', None, None)
    assert len(llm.llamadas) == 1 and TEXTO in llm.llamadas[0][1]
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert (intento.estado, intento.tipo_final, intento.texto_citable) == (EstadoRespuestaRegistro.CERRADO, 'propio',
                                                                           [TEXTO])
    assert intento.valores_contexto['pregunta'].startswith('¿Qué te encantaba hacer')
    assert paso['registro']['item_actual'] == 'b1-1-logro'
    assert not claves(paso) & PROHIBIDOS


def test_general_devuelve_la_repregunta_filtrada(cliente, llm, sesion_contenido):
    llm.encolar(salida('general', '¿Qué hacías exactamente con esos castillos?'))
    paso = gustos(cliente)
    assert paso['paso'] == 'REPREGUNTA' and paso['repregunta'] == '¿Qué hacías exactamente con esos castillos?'
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    # El ítem queda cerrado con su primera respuesta; la repregunta queda como pista.
    assert (intento.estado, intento.tipo_final, intento.pista) == (
        EstadoRespuestaRegistro.CERRADO, 'general', '¿Qué hacías exactamente con esos castillos?')


@pytest.mark.parametrize(('respuesta', 'texto'), [
    (salida('emocional'), 'LUMI_EMOCIONAL'),
    (salida('emocional', sensible=True), 'LUMI_SENSIBLE'),
    (salida('no_sabe', sensible=True), 'LUMI_SENSIBLE'),
    (fallo(), 'LUMI_SIN_EVALUAR'),
])
def test_mensajes_de_lumi(cliente, llm, sesion_contenido, respuesta, texto):
    llm.encolar(respuesta)
    paso = gustos(cliente)
    assert (paso['paso'], paso['mensaje'], paso['repregunta']) == ('MENSAJE', TEXTOS[texto], None)
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    if texto == 'LUMI_SIN_EVALUAR':
        assert intento.estado == EstadoRespuestaRegistro.SIN_EVALUAR and intento.texto_citable == []
    if texto == 'LUMI_SENSIBLE':
        # Un ítem sensible queda CERRADO, sea cual sea su tipo.
        assert intento.estado == EstadoRespuestaRegistro.CERRADO and intento.sensible
    assert not claves(paso) & PROHIBIDOS


def test_guardar_primero_si_el_cliente_revienta_la_respuesta_queda(cliente, llm, sesion_contenido):
    llm.encolar(RuntimeError('se cayó el proceso'))
    with pytest.raises(RuntimeError):
        gustos(cliente)
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert (intento.estado, intento.primera_respuesta) == (EstadoRespuestaRegistro.SIN_EVALUAR, TEXTO)
    leido = item_de(leer_registro(cliente, 'b1-1'), 'b1-1-gustos')['respuesta']
    assert leido['reenviable'] and leido['primera_respuesta'] == TEXTO


def test_texto_vacio_y_largo(cliente, llm):
    gustos(cliente, '   ', esperado=422)
    gustos(cliente, 'a' * 1001, esperado=422)
    # No hay mínimo de caracteres.
    assert gustos(cliente, 'Sí')['paso'] == 'SIGUIENTE'


def test_eleccion_invalida(cliente, llm):
    logro(cliente, [{'codigo': 'NO_EXISTE'}], esperado=422)
    logro(cliente, [{'codigo': 'NINGUNO'}, {'codigo': 'ORGANIZAR'}], esperado=422)
    logro(cliente, [], esperado=422)
    assert llm.llamadas == []


# --- Seguimiento -------------------------------------------------------------------------------

def test_seguimiento_que_mejora_arma_la_linea_y_cita_las_dos(cliente, llm, sesion_contenido):
    llm.encolar(salida('general', '¿Qué hacías exactamente con esos castillos?'))
    gustos(cliente)
    llm.encolar(salida('propio', arranque='Lo que hacía con los castillos'))
    paso = seguir(cliente, 'b1-1', 'b1-1-gustos', 'DATO DE PRUEBA: les ponía puentes y torres')
    assert (paso['paso'], paso['repregunta']) == ('SIGUIENTE', None)
    sistema, mensaje, _ = llm.llamadas[-1]
    assert TEXTO in mensaje and '¿Qué hacías exactamente con esos castillos?' in mensaje
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    linea = 'Lo que hacía con los castillos: DATO DE PRUEBA: les ponía puentes y torres'
    assert (intento.conjunto_tipo, intento.tipo_final, intento.linea_registro) == ('propio', 'propio', linea)
    assert intento.texto_citable == [TEXTO, linea]
    leido = item_de(paso['registro'], 'b1-1-gustos')['respuesta']
    assert (leido['primera_respuesta'], leido['linea_seguimiento']) == (TEXTO, linea)


def test_seguimiento_que_no_mejora_y_sensible_en_la_segunda(cliente, llm, sesion_contenido):
    llm.encolar(salida('general'), salida('general'))
    gustos(cliente)
    assert seguir(cliente, 'b1-1', 'b1-1-gustos')['paso'] == 'SIGUIENTE'
    assert vigente(sesion_contenido, 'b1-1-gustos').texto_citable == [TEXTO]
    llm.encolar(salida('general'), salida('emocional', sensible=True))
    gustos(cliente)
    paso = seguir(cliente, 'b1-1', 'b1-1-gustos')
    assert (paso['paso'], paso['mensaje']) == ('MENSAJE', TEXTOS['LUMI_SENSIBLE'])
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert intento.sensible and intento.texto_citable == [] and intento.estado == EstadoRespuestaRegistro.CERRADO


def test_seguimiento_que_falla_conserva_el_tipo_de_la_primera(cliente, llm, sesion_contenido):
    llm.encolar(salida('general'), fallo('tiempo_agotado'))
    gustos(cliente)
    paso = seguir(cliente, 'b1-1', 'b1-1-gustos', 'DATO DE PRUEBA: con torres')
    assert (paso['paso'], paso['mensaje']) == ('MENSAJE', TEXTOS['LUMI_SIN_EVALUAR'])
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert (intento.tipo_final, intento.seguimiento_sin_evaluar, intento.linea_registro) == (
        'general', True, 'DATO DE PRUEBA: con torres')
    assert intento.texto_citable == [TEXTO]
    assert item_de(paso['registro'], 'b1-1-gustos')['respuesta']['reenviable']


def test_seguimiento_sin_repregunta_pendiente_se_rechaza(cliente, llm):
    seguir(cliente, 'b1-1', 'b1-1-gustos', esperado=409)
    gustos(cliente)  # propio: sin repregunta
    seguir(cliente, 'b1-1', 'b1-1-gustos', esperado=409)
    llm.encolar(salida('general'), 'propio')
    gustos(cliente)
    seguir(cliente, 'b1-1', 'b1-1-gustos', '  ', esperado=422)
    seguir(cliente, 'b1-1', 'b1-1-gustos')
    # No hay segunda repregunta.
    seguir(cliente, 'b1-1', 'b1-1-gustos', esperado=409)


def test_avanzar_sin_responder_la_repregunta(cliente, llm, sesion_contenido):
    llm.encolar(salida('general', '¿Qué hacías exactamente con esos castillos?'))
    gustos(cliente)
    logro(cliente)
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert (intento.tipo_final, intento.segunda_respuesta) == ('general', None)
    leido = item_de(leer_registro(cliente, 'b1-1'), 'b1-1-gustos')['respuesta']
    assert leido['pista'] == '¿Qué hacías exactamente con esos castillos?' and not leido['reenviable']


# --- Cierre de la repregunta (ajuste front de registros, lote 1) -------------------------------

REPREGUNTA = '¿Qué hacías exactamente con esos castillos?'


def test_responder_otro_item_cierra_la_repregunta_y_la_pista_no_cambia(cliente, llm, sesion_contenido):
    llm.encolar(salida('general', REPREGUNTA))
    gustos(cliente)
    logro(cliente)
    seguir(cliente, 'b1-1', 'b1-1-gustos', esperado=409)
    intento = vigente(sesion_contenido, 'b1-1-gustos')
    assert (intento.repregunta_cerrada, intento.pista, intento.segunda_respuesta) == (True, REPREGUNTA, None)
    assert not vigente(sesion_contenido, 'b1-1-logro').repregunta_cerrada


def test_entregar_cierra_la_repregunta(cliente, llm, sesion_contenido):
    gustos(cliente)
    logro(cliente)
    llm.encolar(salida('general', REPREGUNTA))
    responder_item(cliente, 'b1-1', 'b1-1-dificultad', [], TEXTO)
    terminar(cliente, 'b1-1')
    seguir(cliente, 'b1-1', 'b1-1-dificultad', esperado=409)
    assert vigente(sesion_contenido, 'b1-1-dificultad').pista == REPREGUNTA


def test_antes_de_cerrarse_la_repregunta_se_responde_y_una_edicion_nace_abierta(cliente, llm, sesion_contenido):
    llm.encolar(salida('general', REPREGUNTA))
    gustos(cliente)
    logro(cliente)
    # Editar el ítem crea un intento nuevo, con su repregunta abierta, y no cierra la de él mismo.
    llm.encolar(salida('general', REPREGUNTA))
    gustos(cliente, 'DATO DE PRUEBA: hacía casas de cartón')
    assert not vigente(sesion_contenido, 'b1-1-gustos').repregunta_cerrada
    assert seguir(cliente, 'b1-1', 'b1-1-gustos')['paso'] == 'SIGUIENTE'


def test_reenviar_el_seguimiento_no_mira_el_cierre(cliente, llm, sesion_contenido):
    llm.encolar(salida('general'), fallo(), 'propio')
    gustos(cliente)
    seguir(cliente, 'b1-1', 'b1-1-gustos', 'DATO DE PRUEBA: con torres')
    logro(cliente)
    assert vigente(sesion_contenido, 'b1-1-gustos').repregunta_cerrada
    assert reenviar(cliente, 'b1-1', 'b1-1-gustos')['paso'] == 'SIGUIENTE'


def test_texto_de_lumi_sin_evaluar(cliente, llm):
    llm.encolar(fallo())
    assert gustos(cliente)['mensaje'] == ('Esta vez no llegué a escucharte bien. Tu respuesta quedó guardada; más '
                                          'adelante puedes volver a enviarla, por si tengo algo que decirte.')


# --- Reenvío -----------------------------------------------------------------------------------

def test_reenvio_de_la_primera_puede_traer_repregunta_y_no_crea_intento(cliente, llm, sesion_contenido):
    llm.encolar(fallo())
    gustos(cliente)
    llm.encolar(salida('general', '¿Qué hacías exactamente con esos castillos?'))
    paso = reenviar(cliente, 'b1-1', 'b1-1-gustos')
    assert (paso['paso'], paso['repregunta']) == ('REPREGUNTA', '¿Qué hacías exactamente con esos castillos?')
    todos = intentos(sesion_contenido, 'b1-1-gustos')
    assert len(todos) == 1 and todos[0].estado == EstadoRespuestaRegistro.CERRADO
    # Reenvía con lo guardado, no con el contexto de hoy: el mismo mensaje que la primera vez.
    assert llm.llamadas[0][1] == llm.llamadas[1][1]


def test_reenvio_del_seguimiento(cliente, llm, sesion_contenido):
    llm.encolar(salida('general'), fallo(), 'propio')
    gustos(cliente)
    seguir(cliente, 'b1-1', 'b1-1-gustos', 'DATO DE PRUEBA: con torres')
    assert reenviar(cliente, 'b1-1', 'b1-1-gustos')['paso'] == 'SIGUIENTE'
    intento, = intentos(sesion_contenido, 'b1-1-gustos')
    assert (intento.tipo_final, intento.seguimiento_sin_evaluar, intento.conjunto_tipo) == ('propio', False, 'propio')


def test_reenvio_sin_nada_que_reenviar(cliente, llm):
    reenviar(cliente, 'b1-1', 'b1-1-gustos', esperado=409)
    gustos(cliente)
    reenviar(cliente, 'b1-1', 'b1-1-gustos', esperado=409)


def test_reenvio_que_vuelve_a_fallar_deja_el_intento_igual(cliente, llm, sesion_contenido):
    llm.encolar(fallo(), fallo())
    gustos(cliente)
    paso = reenviar(cliente, 'b1-1', 'b1-1-gustos')
    assert (paso['paso'], paso['mensaje']) == ('MENSAJE', TEXTOS['LUMI_SIN_EVALUAR'])
    assert vigente(sesion_contenido, 'b1-1-gustos').estado == EstadoRespuestaRegistro.SIN_EVALUAR


# --- Edición -----------------------------------------------------------------------------------

def test_edicion_antes_y_despues_de_terminar_conserva_el_historico(cliente, llm, sesion_contenido):
    gustos(cliente)
    gustos(cliente, 'DATO DE PRUEBA: dibujaba mapas')
    primero, segundo = intentos(sesion_contenido, 'b1-1-gustos')
    assert (primero.vigente, primero.primera_respuesta, primero.tipo_final) == (False, TEXTO, 'propio')
    assert (segundo.vigente, segundo.intento) == (True, 2)
    logro(cliente)
    responder_item(cliente, 'b1-1', 'b1-1-dificultad', [], TEXTO)
    assert terminar(cliente, 'b1-1')['estado'] == 'COMPLETADA'
    llm.encolar(salida('general'))
    assert gustos(cliente, 'DATO DE PRUEBA: tercera')['paso'] == 'REPREGUNTA'
    assert [i.vigente for i in intentos(sesion_contenido, 'b1-1-gustos')] == [False, False, True]


def test_tope_de_diez_intentos(cliente, llm, sesion_contenido):
    for n in range(10):
        gustos(cliente, f'DATO DE PRUEBA: intento {n + 1}')
    gustos(cliente, 'DATO DE PRUEBA: once', esperado=409)
    assert vigente(sesion_contenido, 'b1-1-gustos').primera_respuesta == 'DATO DE PRUEBA: intento 10'


def test_responder_exige_actividad_disponible_e_item_de_la_actividad(cliente_contenido):
    pedir(cliente_contenido, 'POST', '/acciones/registro/responder', {
        'cuenta': 'est-ana', 'actividad': 'b1-1', 'item': 'b1-1-gustos', 'texto': TEXTO, 'fecha_hora': FECHA}, 409)
