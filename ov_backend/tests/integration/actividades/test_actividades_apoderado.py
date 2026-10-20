"""Actividades del apoderado en la ruta mínima (§4.3)."""

from copy import deepcopy

import pytest
from soporte_acceso import ClienteConToken as TestClient
from soporte_ruta import BLOQUE_FAMILIA, FECHA, completar, estado, eventos, pedir


PROPIAS = {'R-t-apo-carta', 'R-t-ficha-apo', 'R-SEC-CONVERSACIONES'}


@pytest.fixture
def cliente_apoderado(aplicacion):
    with TestClient(aplicacion) as cliente:
        yield cliente


def actividades(cliente, cuenta='apo-rosa'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades')


def test_familia_inicial_visible_y_separada_del_estudiante(cliente_apoderado):
    cliente = cliente_apoderado
    assert actividades(cliente) == [BLOQUE_FAMILIA]
    assert [b['codigo'] for b in actividades(cliente, 'est-ana')] == ['T0', 'T1', 'T2', 'CIUDAD']
    assert eventos(cliente, 'apo-rosa') == []


def test_segunda_bloqueada_no_escribe_estado_ni_eventos(cliente_apoderado):
    cliente = cliente_apoderado
    antes = estado(cliente, 'apo-rosa')
    rechazo = completar(cliente, 't-apo-carta', 'apo-rosa', esperado=409)
    condicion, = rechazo['detail']['progreso']['reglas'][0]['condiciones']
    assert (condicion['referencia'], condicion['actual'], condicion['requerido']) == ('t-apo-1', 0, 1)
    assert estado(cliente, 'apo-rosa') == antes
    assert eventos(cliente, 'apo-rosa') == []


def test_primera_desbloquea_solo_la_segunda(cliente_apoderado):
    cliente = cliente_apoderado
    respuesta = completar(cliente, 't-apo-1', 'apo-rosa')
    assert respuesta['eventos_registrados'] == [
        {'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-apo-1', 'fecha_hora': FECHA},
    ]
    assert [(d['regla'], d['tipo_objetivo'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']] == [
        ('R-t-apo-carta', 'ACTIVIDAD', 't-apo-carta'), ('R-t-ficha-apo', 'FICHA', 't-ficha-apo'),
    ]
    esperado = deepcopy(BLOQUE_FAMILIA)
    esperado['actividades'][0]['estado'] = 'COMPLETADA'
    esperado['actividades'][1]['estado'] = 'DISPONIBLE'
    esperado['actividades'][1]['bloqueo'] = None
    assert actividades(cliente) == [esperado]


def test_segunda_completa_familia_sin_nuevos_desbloqueos(cliente_apoderado):
    cliente = cliente_apoderado
    completar(cliente, 't-apo-1', 'apo-rosa')
    respuesta = completar(cliente, 't-apo-carta', 'apo-rosa')
    assert respuesta['eventos_registrados'] == [
        {'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-apo-carta', 'fecha_hora': FECHA},
        {'tipo': 'COMPLETA_BLOQUE', 'referencia': 'FAMILIA', 'fecha_hora': FECHA},
    ]
    # B01: cerrar la ruta del apoderado abre su sección CONVERSACIONES.
    assert [d['regla'] for d in respuesta['nuevos_desbloqueos']] == ['R-SEC-CONVERSACIONES']
    assert [a['estado'] for a in actividades(cliente)[0]['actividades']] == ['COMPLETADA', 'COMPLETADA']


def test_repeticiones_no_duplican_el_evento_del_bloque(cliente_apoderado):
    cliente = cliente_apoderado
    for codigo in ('t-apo-1', 't-apo-carta'):
        completar(cliente, codigo, 'apo-rosa')
    for codigo in ('t-apo-1', 't-apo-carta'):
        respuesta = completar(cliente, codigo, 'apo-rosa')
        assert respuesta['eventos_registrados'] == [
            {'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': codigo, 'fecha_hora': FECHA},
        ]
        assert respuesta['nuevos_desbloqueos'] == []
    historial = eventos(cliente, 'apo-rosa')
    assert sum(e['tipo'] == 'COMPLETA_BLOQUE' and e['referencia'] == 'FAMILIA' for e in historial) == 1
    assert sum(e['tipo'] == 'COMPLETA_ACTIVIDAD' for e in historial) == 4
    assert [a['estado'] for a in actividades(cliente)[0]['actividades']] == ['COMPLETADA', 'COMPLETADA']


def test_otras_audiencias_se_rechazan_sin_efectos(cliente_apoderado):
    cliente = cliente_apoderado
    for cuenta, codigo in (('est-ana', 't-apo-1'), ('apo-rosa', 't-inicio')):
        antes = estado(cliente, cuenta)
        completar(cliente, codigo, cuenta, esperado=409)
        assert estado(cliente, cuenta) == antes
        assert eventos(cliente, cuenta) == []


# B01: el apoderado recibe sus propias fichas y secciones, nunca logros ni niveles.
def test_completar_no_otorga_logros_ni_niveles_ni_afecta_al_estudiante(cliente_apoderado):
    cliente = cliente_apoderado
    estudiante = estado(cliente)
    for codigo in ('t-apo-1', 't-apo-carta', 't-apo-1', 't-apo-carta'):
        respuesta = completar(cliente, codigo, 'apo-rosa')
        assert {d['regla'] for d in respuesta['nuevos_desbloqueos']} <= PROPIAS
        rosa = estado(cliente, 'apo-rosa')
        assert rosa['nivel_actual'] is None
        assert rosa['niveles'] == rosa['insignias'] == []
        assert [(f['codigo'], f['estado']) for f in rosa['fichas']] == [('t-ficha-apo', 'DISPONIBLE')]
        assert estado(cliente) == estudiante
    assert eventos(cliente) == []
    assert {d['regla'] for d in pedir(cliente, 'GET', '/cuentas/apo-rosa/desbloqueos')} == PROPIAS
