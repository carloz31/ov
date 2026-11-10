"""Capa del LLM (lote 1): estado final del ítem, pista y texto citable (§8), sin llamadas."""

import pytest

from app.services.registro.llm import Evaluacion, estado_final

PRIMERA = 'Montar bicicleta'
LINEA = 'Lo que hacía: en el parque con mi primo'


def ev(tipo, repregunta='¿Qué hacías?', sensible=False):
    con_repregunta = tipo not in ('propio', 'emocional') and not sensible
    return Evaluacion(sin_evaluar=False, motivo='m', tipo=tipo, sensible=sensible, repregunta=repregunta if con_repregunta else None)


def seg(tipo, repregunta='¿Y dónde?', sensible=False):
    e = ev(tipo, repregunta, sensible)
    return Evaluacion(sin_evaluar=False, motivo='m', tipo=e.tipo, sensible=e.sensible, repregunta=e.repregunta, linea=LINEA)


FALLIDO = Evaluacion(sin_evaluar=True, causa_fallo='tiempo_agotado', linea='en el parque con mi primo')


@pytest.mark.parametrize(('primera', 'conjunto', 'final', 'adecuado', 'abierto'), [
    ('propio', None, 'propio', True, False),
    ('general', None, 'general', True, False),
    ('emocional', None, 'emocional', True, False),
    ('no_sabe', None, 'no_sabe', True, True),
    ('vacio', None, 'vacio', False, False),
    ('fuera_de_tema', None, 'fuera_de_tema', False, False),
    ('general', 'propio', 'propio', True, False),
    ('general', 'general', 'general', True, False),
    ('general', 'emocional', 'general', True, False),
    ('general', 'vacio', 'general', True, False),
    ('vacio', 'emocional', 'emocional', True, False),
    ('vacio', 'no_sabe', 'no_sabe', True, True),
    ('vacio', 'vacio', 'vacio', False, False),
    ('no_sabe', 'propio', 'propio', True, False),
    ('fuera_de_tema', 'general', 'general', True, False),
    ('fuera_de_tema', 'fuera_de_tema', 'fuera_de_tema', False, False),
])
def test_tabla_de_tipos(primera, conjunto, final, adecuado, abierto):
    estado = estado_final(ev(primera), PRIMERA, seg(conjunto) if conjunto else None)
    assert (estado.tipo, estado.adecuado, estado.abierto, estado.sensible) == (final, adecuado, abierto, False)


def test_sensible_en_la_segunda_manda_sobre_todo():
    estado = estado_final(ev('vacio'), PRIMERA, seg('general', sensible=True))
    assert estado.sensible and estado.adecuado and estado.pista is None and estado.texto_citable == ()
    assert estado.linea_registro == LINEA  # el estudiante ve siempre lo que respondió


def test_sensible_en_la_primera():
    estado = estado_final(ev('propio', sensible=True), PRIMERA)
    assert estado.sensible and estado.adecuado and estado.texto_citable == () and estado.pista is None


def test_primera_sin_evaluar():
    estado = estado_final(Evaluacion(sin_evaluar=True, causa_fallo='rechazo'), PRIMERA)
    assert estado.sin_evaluar and not estado.adecuado and estado.pista is None and estado.texto_citable == ()


# --- Pista ----------------------------------------------------------------------------------------

def test_pista_si_respondio_es_la_repregunta_del_seguimiento():
    assert estado_final(ev('general'), PRIMERA, seg('general', '¿Con quién?')).pista == '¿Con quién?'


def test_pista_si_no_respondio_es_la_repregunta_que_vio():
    assert estado_final(ev('vacio', '¿Una tarde a los ocho?'), PRIMERA).pista == '¿Una tarde a los ocho?'


def test_sin_pista_con_tipo_final_propio_o_emocional():
    assert estado_final(ev('general'), PRIMERA, seg('propio')).pista is None
    assert estado_final(ev('vacio'), PRIMERA, seg('emocional')).pista is None
    assert estado_final(ev('emocional'), PRIMERA).pista is None


def test_pista_si_el_seguimiento_no_genero_repregunta():
    """Conjunto `emocional` con primera `general`: final `general`, la pista es la repregunta que vio."""
    assert estado_final(ev('general', '¿Qué hacías?'), PRIMERA, seg('emocional')).pista == '¿Qué hacías?'


# --- Texto citable --------------------------------------------------------------------------------

@pytest.mark.parametrize(('primera', 'conjunto', 'citable'), [
    ('propio', None, (PRIMERA,)),
    ('general', 'propio', (PRIMERA, LINEA)),
    ('general', None, (PRIMERA,)),
    ('general', 'general', (PRIMERA,)),
    ('general', 'vacio', (PRIMERA,)),
    ('no_sabe', 'propio', (LINEA,)),
    ('vacio', 'general', (LINEA,)),
    ('fuera_de_tema', 'propio', (LINEA,)),
    ('vacio', 'no_sabe', ()),
    ('no_sabe', None, ()),
    ('emocional', None, ()),
    ('vacio', 'emocional', ()),
])
def test_cada_fila_del_texto_citable(primera, conjunto, citable):
    assert estado_final(ev(primera), PRIMERA, seg(conjunto) if conjunto else None).texto_citable == citable


def test_sensible_en_alguna_no_cita_nada():
    assert estado_final(ev('general'), PRIMERA, seg('propio', sensible=True)).texto_citable == ()


def test_linea_del_registro_siempre_que_respondio():
    assert estado_final(ev('general'), PRIMERA, seg('vacio')).linea_registro == LINEA
    assert estado_final(ev('general'), PRIMERA).linea_registro is None


# --- Seguimiento que falla ------------------------------------------------------------------------

def test_primera_general_y_seguimiento_fallido():
    estado = estado_final(ev('general', '¿Qué hacías?'), PRIMERA, FALLIDO)
    assert (estado.tipo, estado.adecuado, estado.sin_evaluar) == ('general', True, False)
    assert estado.pista == '¿Qué hacías?' and estado.linea_registro == 'en el parque con mi primo'
    assert estado.texto_citable == (PRIMERA,)  # la línea del seguimiento no se cita
    assert estado.seguimiento_sin_evaluar and estado.causa_seguimiento == 'tiempo_agotado'


def test_primera_vacio_y_seguimiento_fallido():
    estado = estado_final(ev('vacio', '¿Una tarde a los ocho?'), PRIMERA, FALLIDO)
    assert (estado.tipo, estado.adecuado) == ('vacio', False)
    assert estado.pista == '¿Una tarde a los ocho?' and estado.linea_registro == 'en el parque con mi primo'
    assert estado.texto_citable == () and estado.seguimiento_sin_evaluar
