"""Verificadores de la ruta mínima, compartidos entre SQLite y PostgreSQL."""

from soporte_ruta import INTERESES, actividades, avanzar, completar, estado, pedir, reglas, responder


def verificar_p01_estado_inicial(cliente):
    inicial = estado(cliente)
    estados = actividades(cliente)
    assert estados['t-inicio'] == 'DISPONIBLE'
    assert all(estados[c] == 'BLOQUEADA' for c in ('t-cierre-inicio', 't-expectativas', INTERESES, 't-caso'))
    assert {b['codigo']: b['estado'] for b in inicial['bloques']} == {
        'T0': 'DISPONIBLE', 'T1': 'BLOQUEADA', 'CIUDAD': 'BLOQUEADA'}
    assert [(f['codigo'], f['estado']) for f in inicial['fichas']] == [('t-ficha', 'BLOQUEADA')]
    visibles = [i for i in inicial['insignias'] if i['codigo'] != '???']
    assert [(i['codigo'], i['estado']) for i in visibles] == [('t-ins-1', 'BLOQUEADA')]
    assert visibles[0]['requisito']
    oculto, = [i for i in inicial['insignias'] if i['codigo'] == '???']
    assert oculto['estado'] == 'BLOQUEADA' and oculto['requisito'] is None
    assert inicial['conversaciones']['estado'] == 'BLOQUEADA'
    assert inicial['nivel_actual']['numero'] == 1
    assert inicial['testimonios'] == inicial['preguntas_diario'] == []


def verificar_p02_primer_paso(cliente):
    assert reglas(completar(cliente, 't-inicio')) == {'R-t-cierre-inicio', 'R-t-ficha', 'R-t-ins-1'}


def verificar_p03_cierre_de_t0(cliente):
    respuesta = avanzar(cliente, 't-cierre-inicio')
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
        ('COMPLETA_ACTIVIDAD', 't-cierre-inicio'), ('COMPLETA_BLOQUE', 'T0'),
    ]
    assert reglas(respuesta) == {'R-T1', 'R-NIV-2', 'R-FAM-ESTUDIANTE'}
    assert actividades(cliente)['t-expectativas'] == 'DISPONIBLE'
    assert estado(cliente)['nivel_actual']['numero'] == 2


def verificar_p07_llegada_a_la_ciudad(cliente):
    respuesta = avanzar(cliente)
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
        ('COMPLETA_ACTIVIDAD', 't-expectativas'), ('COMPLETA_BLOQUE', 'T1'),
    ]
    assert reglas(respuesta) == {'R-CIUDAD'}
    estados = actividades(cliente)
    assert estados[INTERESES] == 'DISPONIBLE' and estados['t-caso'] == 'BLOQUEADA'


def verificar_p10_resultado(cliente):
    avanzar(cliente)
    responder(cliente, INTERESES)
    respuesta = completar(cliente, INTERESES)
    assert respuesta['resultados_generados'] == [{'instrumento': 'TEST-RIASEC', 'aplicacion': 'APL-RIASEC'}]
    assert reglas(respuesta) == {'R-t-caso'}
    resultado = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    assert {d['codigo']: d['porcentaje'] for d in resultado['dimensiones']} == {'I': 100, 'R': 75, 'A': 50, 'S': 0, 'E': 0, 'C': 0}
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    coincidencias = resultado['coincidencias']
    assert len(coincidencias) == 10 and all(c['codigo'] for c in coincidencias)
    assert [c['posicion'] for c in coincidencias] == list(range(1, 11))
    assert [c['correlacion'] for c in coincidencias] == sorted((c['correlacion'] for c in coincidencias), reverse=True)
    assert coincidencias[0]['codigo'] == 'geologist' and coincidencias[0]['ajuste'] == 'BEST_FIT'
    carreras = resultado['carreras_recomendadas']
    assert {c['codigo'] for c in carreras} == {'environmental-engineering', 'civil-engineering', 'veterinary-medicine'}
    assert all(c['via'] and all(v in coincidencias for v in c['via']) for c in carreras)
