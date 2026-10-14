"""Verificadores de la ruta mínima, compartidos entre SQLite y PostgreSQL."""

from soporte_ruta import INTERESES, INTERESES_FINAL, actividades, avanzar, completar, estado, pedir, reglas, responder, revelar


def verificar_p01_estado_inicial(cliente):
    inicial = estado(cliente)
    estados = actividades(cliente)
    assert estados['t-inicio'] == estados['t-partida'] == 'DISPONIBLE'
    assert all(estados[c] == 'BLOQUEADA' for c in ('t-cierre-inicio', 't-expectativas', INTERESES, INTERESES_FINAL, 't-caso'))
    assert {b['codigo']: b['estado'] for b in inicial['bloques']} == {
        'T0': 'DISPONIBLE', 'T1': 'BLOQUEADA', 'T2': 'BLOQUEADA', 'CIUDAD': 'BLOQUEADA'}
    assert [(f['codigo'], f['estado']) for f in inicial['fichas']] == [('t-ficha', 'BLOQUEADA')]
    visibles = [i for i in inicial['insignias'] if i['codigo'] != '???']
    assert [(i['codigo'], i['estado']) for i in visibles] == [('t-ins-1', 'BLOQUEADA')]
    assert visibles[0]['requisito']
    ocultos = [i for i in inicial['insignias'] if i['codigo'] == '???']
    assert len(ocultos) == 4 and all(o['estado'] == 'BLOQUEADA' and o['requisito'] is None for o in ocultos)
    assert inicial['secciones'] == dict.fromkeys(('CATALOGO', 'CHECK_IN', 'DIARIO', 'FAMILIA', 'PLANES'), 'BLOQUEADA')
    assert inicial['nivel_actual']['numero'] == 1
    assert [(t['codigo'], t['estado']) for t in inicial['testimonios']] == [
        ('t-testimonio-1', 'BLOQUEADA'), ('t-testimonio-2', 'BLOQUEADA')]
    assert inicial['preguntas_diario'] is None


def verificar_p02_primer_paso(cliente):
    assert reglas(completar(cliente, 't-inicio')) == {
        'R-t-cierre-inicio', 'R-t-batalla', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES'}
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
        # B04: todo adecuado al inicio da REGISTRO_ADECUADO, pero ninguna respuesta reflexiva.
        ('REGISTRO_ADECUADO', 't-expectativas'),
    ]
    # La Ciudad se abre a mitad de T1: la opcional t-opcional sigue pendiente y no impide cerrar el bloque.
    # B05: también se abre t-eco, que retoma las respuestas de t-expectativas.
    # B09: también deja en el diario la pregunta personalizada, por redactar.
    assert reglas(respuesta) == {'R-CIUDAD', 'R-t-opcional', 'R-SEC-FAMILIA', 'R-t-adicional', 'R-t-eco',
                                 'R-t-diario-personal'}
    assert respuesta['entradas_desbloqueadas'] == [{'codigo': 't-diario-personal', 'nombre': 'Lo que espero',
                                                    'personalizada': True, 'texto': None}]
    assert estado(cliente)['secciones']['FAMILIA'] == 'DISPONIBLE'
    estados = actividades(cliente)
    assert estados['t-opcional'] == 'DISPONIBLE'
    assert estados[INTERESES] == 'DISPONIBLE'
    assert estados[INTERESES_FINAL] == estados['t-caso'] == 'BLOQUEADA'


def verificar_p10_resultado(cliente):
    avanzar(cliente)
    responder(cliente, INTERESES)
    primera = completar(cliente, INTERESES)
    assert reglas(primera) == {'R-t-mision-intereses-2'}
    responder(cliente, INTERESES_FINAL)
    respuesta = completar(cliente, INTERESES_FINAL)
    assert reglas(respuesta) == {'R-t-caso'}
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    revelado = revelar(cliente)
    assert revelado['perfil_plano'] is False
    assert [e['tipo'] for e in revelado['eventos_registrados']] == ['REVELA_RESULTADO']
    assert revelado['eventos_registrados'][0]['referencia'] == 'APL-RIASEC'
    assert reglas(revelado) == {'R-t-contraste'}
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
    # B06: revelar abre t-contraste, que cita el resultado y las coincidencias.
    assert actividades(cliente)['t-contraste'] == 'DISPONIBLE'
    citas = {r['codigo']: r for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-contraste/referencias')['referencias']}
    assert [o['codigo'] for o in citas['t-ref-resultado']['opciones']] == ['I', 'R', 'A']
    assert citas['t-ref-coincidencias']['opciones'][0]['codigo'] == 'geologist'
