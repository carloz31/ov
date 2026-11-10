"""Capa del LLM (lote 1): llamada con cliente falso, `sin_evaluar`, coherencia, filtro y arranque."""

import json

import pytest

from app.services.registro.llm import (ClienteFalso, Entrada, LlamadaFallida, RespuestaCruda, evaluar_primera,
                                       evaluar_seguimiento, tarjeta_para)
from app.services.registro.llm.arranque import limpiar, linea, revisar
from datos.tarjetas_registros import TARJETAS

GUSTOS = TARJETAS['b1-1-gustos']


def salida(tipo='general', repregunta='¿Qué hacías cuando montabas bicicleta?', sensible=False, arranque=None, **otros):
    return json.dumps({'motivo': 'm', 'tipo': tipo, 'sensible': sensible, 'repregunta': repregunta, 'arranque': arranque, **otros})


def entrada(item=GUSTOS, opcion=None, etiquetas=(), respuesta='Montar bicicleta', **campos):
    return Entrada(tarjeta=tarjeta_para(item, opcion, etiquetas), pregunta='¿Qué te encantaba hacer?', respuesta=respuesta,
                   etiquetas=tuple(etiquetas), **campos)


def seguimiento(respuesta='En el parque con mi primo', **campos):
    return entrada(respuesta=respuesta, respuesta_anterior='Montar bicicleta', invitacion='¿Dónde montabas bicicleta?', **campos)


def primera(*respuestas, **campos):
    return evaluar_primera(entrada(**campos), ClienteFalso(respuestas))


def repregunta(texto, tipo='general', **campos):
    return primera(salida(tipo, texto), **campos)


# --- Llamada y esquema ----------------------------------------------------------------------------

def test_la_llamada_lleva_el_prompt_y_el_esquema_en_orden():
    cliente = ClienteFalso([salida()])
    evaluar_primera(entrada(), cliente)
    sistema, mensaje, esquema = cliente.llamadas[0]
    assert 'ARRANQUE' in sistema and mensaje.endswith('<respuesta>Montar bicicleta</respuesta>')
    assert list(esquema['properties']) == ['motivo', 'tipo', 'sensible', 'repregunta', 'arranque']
    assert esquema['additionalProperties'] is False


@pytest.mark.parametrize(('respuesta', 'causa'), [
    (LlamadaFallida('error', 'APIConnectionError'), 'error'),
    (LlamadaFallida('tiempo_agotado'), 'tiempo_agotado'),
    (TimeoutError(), 'tiempo_agotado'),
    (RespuestaCruda(texto='', parada='refusal'), 'rechazo'),
    (RespuestaCruda(texto='{"motivo": "m", "ti', parada='max_tokens'), 'tope_tokens'),
    (RespuestaCruda(texto=salida(), parada='pause_turn'), 'parada:pause_turn'),
    ('no es json', 'json_invalido'),
    (salida(tipo='raro'), 'fuera_de_esquema'),
    (salida(extra='x'), 'fuera_de_esquema'),
    (json.dumps({'tipo': 'general', 'sensible': False}), 'fuera_de_esquema'),
])
def test_cada_causa_de_sin_evaluar(respuesta, causa):
    resultado = primera(respuesta)
    assert resultado.sin_evaluar and resultado.causa_fallo == causa
    assert resultado.repregunta is None and resultado.tipo is None  # no se muestra ninguna base


def test_sin_evaluar_no_reintenta():
    cliente = ClienteFalso([LlamadaFallida('error'), salida()])
    evaluar_primera(entrada(), cliente)
    assert len(cliente.llamadas) == 1


# --- Coherencia -----------------------------------------------------------------------------------

@pytest.mark.parametrize(('tipo', 'sensible'), [('propio', False), ('emocional', False), ('general', True), ('vacio', True)])
def test_sin_repregunta_en_propio_emocional_y_sensible(tipo, sensible):
    resultado = primera(salida(tipo, '¿Algo más?', sensible=sensible))
    assert resultado.repregunta is None and resultado.repregunta_modelo == '¿Algo más?' and not resultado.uso_base


@pytest.mark.parametrize('vacia', [None, '', '   '])
def test_repregunta_vacia_usa_la_base_del_tipo(vacia):
    resultado = primera(salida('vacio', vacia))
    assert resultado.repregunta == GUSTOS['bases']['vacio'] and resultado.causa_base == 'base_sin_redactar'


def test_en_la_primera_el_arranque_se_descarta():
    resultado = primera(salida(arranque='Lo que hacía'))
    assert resultado.arranque is None and resultado.linea is None and resultado.motivo == 'm'


# --- Filtro ---------------------------------------------------------------------------------------

def test_repregunta_que_pasa_el_filtro():
    resultado = repregunta('¿Qué hacías cuando montabas bicicleta?')
    assert resultado.repregunta == '¿Qué hacías cuando montabas bicicleta?' and not resultado.uso_base


@pytest.mark.parametrize(('texto', 'regla'), [
    ('Explica qué hacías en el parque.', 'prohibida:explica'),
    ('¿' + 'Qué hacías ' * 16 + '?', 'mas_de_30_palabras'),
    ('¿Qué hacías? ¿Con quién?', 'mas_de_una_pregunta'),
    ('¿Qué hacías en el parque', 'no_termina_en_interrogacion_ni_punto'),
    ('¿Qué hacías en el parque? 🙂', 'caracteres'),
    ('¿Qu hacías en el parque?', 'palabra_truncada:Qu'),
    ('¿Qué hacíass en el parque?', 'palabra_extrana:hacíass'),
    ('¿Qué hacías en el **parque**?', 'formato'),
    ('¿Qué hacías en el <b>parque</b>?', 'formato'),
    ('¿Qué hacías? Mira www.ejemplo.com.', 'enlace'),
    ('¿Qué hacías? Mira ejemplo.pe.', 'enlace'),
])
def test_cada_regla_del_filtro_lleva_a_la_base(texto, regla):
    resultado = repregunta(texto)
    assert regla in resultado.reglas_filtro
    assert resultado.repregunta == GUSTOS['bases']['general'] and resultado.causa_base == 'base_por_filtro'


def test_las_palabras_del_estudiante_valen_aunque_no_esten_en_el_lexico():
    resultado = repregunta('¿Qué hacías con Brayan en Chosica?', respuesta='Jugaba con Brayan en Chosica')
    assert not resultado.reglas_filtro


def test_decodifica_las_entidades_html_antes_de_filtrar():
    resultado = repregunta('&iquest;Qu&eacute; hac&iacute;as en el parque?')
    assert resultado.repregunta == '¿Qué hacías en el parque?' and not resultado.uso_base


def test_agrega_el_signo_de_apertura_y_la_mayuscula_inicial():
    resultado = repregunta('dices que montabas. qué hacías en el parque?')
    assert resultado.repregunta == 'Dices que montabas. ¿qué hacías en el parque?' and resultado.apertura
    assert repregunta('¿qué hacías en el parque?').repregunta == '¿Qué hacías en el parque?'


def test_etiqueta_de_la_opcion_solo_donde_filtrar_etiqueta_y_no_en_fuera_de_tema():
    logro = dict(item=TARJETAS['b1-1-logro'], opcion='ORGANIZAR', etiquetas=('Organizar',))
    assert 'etiqueta_opcion' in repregunta('¿Cuándo se notó que sabes organizar?', **logro).reglas_filtro
    assert not repregunta('¿Cuándo se notó que sabes organizar?', 'fuera_de_tema', **logro).reglas_filtro
    voz = dict(item=TARJETAS['b1-3-voz'], opcion='MAMA', etiquetas=('Mamá',))
    assert not repregunta('¿Qué te ha dicho tu mamá que hagas?', **voz).reglas_filtro


def test_respaldo_del_seguimiento_es_la_base_de_no_sabe():
    rechazada = salida('vacio', 'Explica más.', arranque='Donde montaba')
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([rechazada]))
    assert resultado.repregunta == GUSTOS['bases']['no_sabe'] != GUSTOS['bases']['vacio']
    primera_rechazada = primera(salida('vacio', 'Explica más.'))
    assert primera_rechazada.repregunta == GUSTOS['bases']['vacio']


def test_en_el_seguimiento_la_repregunta_vacia_usa_la_base_del_tipo():
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([salida('vacio', None)]))
    assert resultado.repregunta == GUSTOS['bases']['vacio']


# --- Arranque y línea -----------------------------------------------------------------------------

def test_arranque_que_pasa_y_su_linea():
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([salida('propio', None, arranque='donde montaba bicicleta')]))
    assert resultado.arranque == 'donde montaba bicicleta' and resultado.arranque_paso
    assert resultado.linea == 'Donde montaba bicicleta: En el parque con mi primo'


@pytest.mark.parametrize(('arranque', 'causa'), [
    ('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece', 'mas_de_12_palabras'),
    ('Jugaba en el parque con mi primo', 'palabras_de_la_respuesta'),
    ('Lo que vi en www.ejemplo.com', 'enlace'),
    ('Lo que <b>vi</b>', 'formato'),
    ('Qué me hizo verlo distinto?', 'signo_de_pregunta'),
    ('¿Lo que me hizo verlo distinto', 'signo_de_pregunta'),
    ('«»:', 'vacio'),
    (None, 'sin_arranque'),
])
def test_arranque_que_cae(arranque, causa):
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([salida('propio', None, arranque=arranque)]))
    assert resultado.arranque is None and resultado.causa_arranque == causa
    assert resultado.linea == 'En el parque con mi primo'


def test_se_le_quitan_los_dos_puntos_finales_y_las_comillas():
    assert limpiar('«Lo que me hizo verlo distinto»:') == 'Lo que me hizo verlo distinto'
    assert revisar('"Lo que me gustaba" : ') == ('Lo que me gustaba', None)


@pytest.mark.parametrize(('crudo', 'limpio'), [
    ('El punto en el que chocamos es', 'El punto en el que chocamos'),
    ('Lo que me da seguridad es que', 'Lo que me da seguridad'),
    ('Lo que decidí fue:', 'Lo que decidí'),
    ('Lo que me exigiría más sería', 'Lo que me exigiría más'),
    ('Empecé a verlo distinto cuando', 'Empecé a verlo distinto'),
    ('No me haría falta nada porque', 'No me haría falta nada'),
    ('Lo que pienso es, porque', 'Lo que pienso'),
    ('Cuando empecé a verlo distinto', 'Cuando empecé a verlo distinto'),  # solo se quita del final
])
def test_se_quitan_las_colas_del_final(crudo, limpio):
    assert limpiar(crudo) == limpio


def test_doce_palabras_pasan():
    assert revisar('uno dos tres cuatro cinco seis siete ocho nueve diez once doce')[1] is None


def test_palabras_de_la_respuesta_que_no_estan_en_la_repregunta_ni_en_la_opcion():
    respuestas = ('Jugaba a la pelota', 'Con mis primos en la calle')
    # Dos palabras de contenido de las respuestas: cae.
    assert revisar('Jugaba a la pelota con mis primos', respuestas, '¿A qué jugabas y con quién?')[1] == 'palabras_de_la_respuesta'
    # Una sola, o las que también están en la repregunta o en la opción, no cuentan.
    assert revisar('Lo que jugaba', respuestas, '¿A qué jugabas y con quién?')[1] is None
    assert revisar('A lo que jugaba con la pelota', respuestas, '¿Jugabas a la pelota?')[1] is None
    assert revisar('Mi pelota y mis primos', respuestas, '¿Con quién?', ('Pelota', 'Primos'))[1] is None
    # Las palabras de función no cuentan.
    assert revisar('Lo que es para mí', ('Es para mí',), '¿Qué buscas?')[1] is None


def test_linea_con_y_sin_arranque():
    assert linea('lo que me hizo verlo distinto', 'fui a un taller de cocina y me gusto') == \
        'Lo que me hizo verlo distinto: fui a un taller de cocina y me gusto'
    assert linea(None, 'fui a un taller') == 'fui a un taller'


def test_el_arranque_se_genera_tambien_con_sensible():
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([salida('general', '¿Algo más?', sensible=True, arranque='Donde montaba')]))
    assert resultado.sensible and resultado.repregunta is None
    assert resultado.linea == 'Donde montaba: En el parque con mi primo'


def test_seguimiento_que_falla_deja_la_segunda_respuesta_sola():
    resultado = evaluar_seguimiento(seguimiento(), ClienteFalso([LlamadaFallida('tiempo_agotado')]))
    assert resultado.sin_evaluar and resultado.causa_fallo == 'tiempo_agotado'
    assert resultado.linea == 'En el parque con mi primo'


def test_el_seguimiento_exige_la_primera_respuesta_y_la_invitacion():
    with pytest.raises(ValueError):
        evaluar_seguimiento(entrada(), ClienteFalso([salida()]))
