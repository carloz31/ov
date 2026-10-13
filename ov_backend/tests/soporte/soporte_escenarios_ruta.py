"""Verificadores de la ruta mínima, compartidos entre SQLite y PostgreSQL."""

from soporte_ruta import INTERESES, INTERESES_FINAL, actividades, avanzar, completar, estado, pedir, reglas, responder


def verificar_p01_estado_inicial(cliente):
    inicial = estado(cliente)
    estados = actividades(cliente)
    assert estados['t-inicio'] == 'DISPONIBLE'
    assert all(estados[c] == 'BLOQUEADA' for c in ('t-cierre-inicio', 't-expectativas', INTERESES, INTERESES_FINAL, 't-caso'))
    assert {b['codigo']: b['estado'] for b in inicial['bloques']} == {
        'T0': 'DISPONIBLE', 'T1': 'BLOQUEADA', 'CIUDAD': 'BLOQUEADA'}
    assert [(f['codigo'], f['estado']) for f in inicial['fichas']] == [('t-ficha', 'BLOQUEADA')]
    visibles = [i for i in inicial['insignias'] if i['codigo'] != '???']
    assert [(i['codigo'], i['estado']) for i in visibles] == [('t-ins-1', 'BLOQUEADA')]
    assert visibles[0]['requisito']
    oculto, = [i for i in inicial['insignias'] if i['codigo'] == '???']
    assert oculto['estado'] == 'BLOQUEADA' and oculto['requisito'] is None
    assert inicial['secciones'] == dict.fromkeys(('CATALOGO', 'CHECK_IN', 'DIARIO', 'FAMILIA', 'PLANES'), 'BLOQUEADA')
    assert inicial['nivel_actual']['numero'] == 1
    assert inicial['testimonios'] == [] and inicial['preguntas_diario'] is None


def verificar_p02_primer_paso(cliente):
    assert reglas(completar(cliente, 't-inicio')) == {
        'R-t-cierre-inicio', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES'}
    assert estado(cliente)['secciones'] == {
        'CATALOGO': 'DISPONIBLE', 'CHECK_IN': 'BLOQUEADA', 'DIARIO': 'DISPONIBLE', 'FAMILIA': 'BLOQUEADA',
        'PLANES': 'DISPONIBLE'}


def verificar_p03_cierre_de_t0(cliente):
    respuesta = avanzar(cliente, 't-cierre-inicio')
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
        ('COMPLETA_ACTIVIDAD', 't-cierre-inicio'), ('COMPLETA_BLOQUE', 'T0'),
    ]
    assert reglas(respuesta) == {'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}
    assert estado(cliente)['secciones']['CHECK_IN'] == 'DISPONIBLE'
    assert actividades(cliente)['t-expectativas'] == 'DISPONIBLE'
    assert estado(cliente)['nivel_actual']['numero'] == 2


def verificar_p07_llegada_a_la_ciudad(cliente):
    respuesta = avanzar(cliente)
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
        ('COMPLETA_ACTIVIDAD', 't-expectativas'), ('COMPLETA_BLOQUE', 'T1'),
        # B03: al cerrar el registro, una respuesta reflexiva por ítem y REGISTRO_ADECUADO.
        ('RESPUESTA_REFLEXIVA', None), ('RESPUESTA_REFLEXIVA', None), ('RESPUESTA_REFLEXIVA', None),
        ('REGISTRO_ADECUADO', 't-expectativas'),
    ]
    # La Ciudad se abre a mitad de T1: la opcional t-opcional sigue pendiente y no impide cerrar el bloque.
    assert reglas(respuesta) == {'R-CIUDAD', 'R-t-opcional', 'R-SEC-FAMILIA', 'R-t-adicional'}
    assert estado(cliente)['secciones']['FAMILIA'] == 'DISPONIBLE'
    estados = actividades(cliente)
    assert estados['t-opcional'] == 'DISPONIBLE'
    assert estados[INTERESES] == 'DISPONIBLE'
    assert estados[INTERESES_FINAL] == estados['t-caso'] == 'BLOQUEADA'


def verificar_p10_resultado(cliente):
    avanzar(cliente)
    responder(cliente, INTERESES)
    primera = completar(cliente, INTERESES)
    assert primera['resultados_generados'] == []
    assert reglas(primera) == {'R-t-mision-intereses-2'}
    responder(cliente, INTERESES_FINAL)
    respuesta = completar(cliente, INTERESES_FINAL)
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
