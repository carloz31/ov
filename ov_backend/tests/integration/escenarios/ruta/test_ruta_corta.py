"""Ruta corta: recorre la ruta mínima con las peticiones del front, sin `/eventos`.

B00 comprueba sobre `ruta` las HU 004, 011, 013, 014, 015, 021, 073 y 074; B02, las HU 006 y 010. Cada lote
extiende este recorrido con su tramo.
"""

import soporte_escenarios_ruta as escenarios
from soporte_ruta import FECHA, INTERESES, INTERESES_FINAL, MISIONES_INTERESES, actividades, completar, estado, filas_base, pedir, reglas, responder


def siguiente(cliente, cuenta='est-ana'):
    """HU-011: la siguiente actividad es la primera requerida disponible del recorrido, por bloque y orden.

    B01: las opcionales (`requerida` falso) no se proponen como siguiente.
    """
    for bloque in pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades'):
        for actividad in bloque['actividades']:
            if actividad['requerida'] and actividad['estado'] in ('DISPONIBLE', 'EN_CURSO'):
                return actividad['codigo']
    return None


def historial(cliente):
    return pedir(cliente, 'GET', '/cuentas/est-ana/desbloqueos')


def test_estado_inicial(cliente):
    escenarios.verificar_p01_estado_inicial(cliente)
    assert siguiente(cliente) == 't-inicio'
    assert pedir(cliente, 'GET', '/cuentas/est-ana/resumen')['nivel_actual']['numero'] == 1


def test_hu004_013_015_informativa_con_ficha_y_retroalimentacion(cliente):
    respuesta = completar(cliente, 't-inicio')
    assert respuesta['eventos_registrados'] == [
        {'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-inicio', 'fecha_hora': '2026-10-07T10:00:00'}]
    assert {(d['tipo_objetivo'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']} == {
        ('ACTIVIDAD', 't-cierre-inicio'), ('FICHA', 't-ficha'), ('INSIGNIA', 't-ins-1'),
        ('SECCION', 'DIARIO'), ('SECCION', 'CATALOGO'), ('SECCION', 'PLANES')}
    assert [(f['codigo'], f['estado']) for f in pedir(cliente, 'GET', '/cuentas/est-ana/fichas')] == [
        ('t-ficha', 'DISPONIBLE')]
    assert siguiente(cliente) == 't-cierre-inicio'


def test_saltarse_la_ruta_responde_409_sin_escribir(cliente, aplicacion):
    antes = filas_base(aplicacion)
    rechazo = completar(cliente, 't-expectativas', esperado=409)['detail']['progreso']
    assert rechazo['objetivo'] == {'tipo': 'ACTIVIDAD', 'codigo': 't-expectativas'}
    assert rechazo['disponible'] is False
    assert filas_base(aplicacion) == antes


def test_hu014_repetir_informativa_no_suma(cliente):
    completar(cliente, 't-inicio')
    concedidos = historial(cliente)
    for _ in range(2):
        respuesta = completar(cliente, 't-inicio')
        assert respuesta['nuevos_desbloqueos'] == []
        assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
            ('COMPLETA_ACTIVIDAD', 't-inicio')]
    assert historial(cliente) == concedidos
    assert actividades(cliente)['t-inicio'] == 'COMPLETADA'


def test_cierre_de_t0_abre_t1_y_sube_de_nivel(cliente):
    escenarios.verificar_p03_cierre_de_t0(cliente)
    assert siguiente(cliente) == 't-expectativas'


def test_hu006_hu010_registro_con_eleccion_borrador_y_retomar(cliente):
    escenarios.verificar_p03_cierre_de_t0(cliente)
    items = pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')
    assert [item['eleccion'] and item['eleccion']['lista'] for item in items] == [
        'RUTAS_DESPUES_COLEGIO', 't-lista-apoyos', None]
    accion = {'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA}
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
        **accion, 'item': 't-exp-ruta', 'texto': 'DATO DE PRUEBA: quiero estudiar', 'posicion': 't-exp-ruta',
        'opciones': [{'codigo': 'INSTITUTO'}, {'codigo': 'OTRA', 'texto': 'Viajar un año'}]})
    # Otra sesión: el borrador se retoma desde el servidor, con su posición y su elección.
    retomado = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    assert retomado['posicion'] == 't-exp-ruta'
    assert retomado['respuestas'][0]['opciones_elegidas'] == [
        {'codigo': 'INSTITUTO'}, {'codigo': 'OTRA', 'texto': 'Viajar un año'}]
    completar(cliente, 't-expectativas', esperado=409)
    textos = {'t-exp-ruta': 'DATO DE PRUEBA: estudiar en un instituto porque me gusta la práctica',
              't-exp-apoyo': 'DATO DE PRUEBA: mi familia, por ejemplo mi mamá', 't-exp-espera': 'DATO DE PRUEBA'}
    opciones = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [], 't-exp-espera': []}
    for item, texto in textos.items():
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion, 'item': item, 'texto': texto, 'opciones': opciones[item]})
    # La elección mínima se exige al entregar (B03 reemplaza el envío por ítem).
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion, esperado=422)
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion, 'item': 't-exp-apoyo', 'texto': textos['t-exp-apoyo'], 'opciones': [{'codigo': 'FAMILIA'}]})
    respuesta = pedir(cliente, 'POST', '/acciones/registro/entregar', accion)
    assert {r['estado'] for r in respuesta['respuestas']} == {'FINAL'}
    assert ('COMPLETA_ACTIVIDAD', 't-expectativas') in [
        (e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']]


def test_llegada_a_la_ciudad(cliente):
    escenarios.verificar_p07_llegada_a_la_ciudad(cliente)
    assert siguiente(cliente) == INTERESES


def test_hu021_cuestionario_incompleto_retomar_y_resultado(cliente, aplicacion):
    escenarios.verificar_p07_llegada_a_la_ciudad(cliente)
    respuesta = responder(cliente, INTERESES, fin=3)
    assert respuesta['progreso'] == {'estado': 'EN_CURSO', 'respondidos': 3, 'total': 30}
    antes = filas_base(aplicacion)
    faltantes = completar(cliente, INTERESES, esperado=409)['detail']['items_faltantes']
    assert faltantes == [f'RIASEC-{n:02}' for n in range(4, 31)]
    assert filas_base(aplicacion) == antes
    assert siguiente(cliente) == INTERESES
    guardadas = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{INTERESES}/respuestas')['respuestas']
    assert [(r['item'], r['opcion']['orden']) for r in guardadas] == [('RIASEC-01', 4), ('RIASEC-02', 4), ('RIASEC-03', 5)]
    responder(cliente, INTERESES, inicio=3)
    primera = completar(cliente, INTERESES)
    assert primera['resultados_generados'] == []
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    assert siguiente(cliente) == INTERESES_FINAL
    responder(cliente, INTERESES_FINAL)
    respuesta = completar(cliente, INTERESES_FINAL)
    assert respuesta['resultados_generados'] == [{'instrumento': 'TEST-RIASEC', 'aplicacion': 'APL-RIASEC'}]
    assert reglas(respuesta) == {'R-t-caso'}
    resultado = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert siguiente(cliente) == 't-caso'


def test_resultado_con_coincidencias_y_carreras(cliente):
    escenarios.verificar_p10_resultado(cliente)


def test_perfil_plano(cliente):
    for codigo in ('t-inicio', 't-cierre-inicio', 't-expectativas'):
        completar(cliente, codigo, cuenta='est-luis')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision, cuenta='est-luis', opcion=3)
        completar(cliente, mision, cuenta='est-luis')
    resultado = pedir(cliente, 'GET', '/cuentas/est-luis/instrumentos/TEST-RIASEC/resultado')
    assert resultado['perfil_plano'] is True
    assert resultado['coincidencias'] == resultado['carreras_recomendadas'] == []


def test_hu073_avisos_de_desbloqueo(cliente):
    ruta = '/cuentas/est-ana/desbloqueos?solo_no_vistos=true'
    completar(cliente, 't-inicio')
    no_vistos = pedir(cliente, 'GET', ruta)
    assert {d['regla'] for d in no_vistos} == {
        'R-t-cierre-inicio', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES'}
    assert all(d['visto'] is False for d in no_vistos)
    assert pedir(cliente, 'POST', '/cuentas/est-ana/desbloqueos/marcar-vistos')['marcados'] == 6
    assert pedir(cliente, 'GET', ruta) == []
    completar(cliente, 't-cierre-inicio')
    assert {d['regla'] for d in pedir(cliente, 'GET', ruta)} == {'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}


def test_hu074_logros_obtenidos_y_condiciones(cliente):
    logros = pedir(cliente, 'GET', '/cuentas/est-ana/logros')
    visible, oculto = logros['insignias']
    assert (visible['codigo'], visible['estado'], visible['requisito']) == ('t-ins-1', 'BLOQUEADA', 'Completa t-inicio.')
    assert (oculto['codigo'], oculto['requisito']) == ('???', None)
    condicion, = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/INSIGNIA/t-ins-1')['reglas'][0]['condiciones']
    assert (condicion['referencia'], condicion['actual'], condicion['requerido']) == ('t-inicio', 0, 1)
    assert cliente.get('/cuentas/est-ana/progreso/INSIGNIA/t-ins-oculta').status_code == 403
    completar(cliente, 't-inicio')
    completar(cliente, 't-cierre-inicio')
    logros = pedir(cliente, 'GET', '/cuentas/est-ana/logros')
    assert logros['insignias'][0]['estado'] == 'OBTENIDA'
    assert [(n['numero'], n['estado']) for n in logros['niveles']] == [(1, 'OBTENIDO'), (2, 'OBTENIDO')]
    assert estado(cliente)['nivel_actual']['numero'] == 2


def test_progreso_de_lo_bloqueado(cliente):
    completar(cliente, 't-inicio')
    ciudad = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/BLOQUE/CIUDAD')['reglas'][0]['condiciones'][0]
    assert (ciudad['tipo_evento'], ciudad['referencia'], ciudad['actual'], ciudad['requerido']) == (
        'COMPLETA_ACTIVIDAD', 't-expectativas', 0, 1)
    t1 = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/BLOQUE/T1')['reglas'][0]['condiciones'][0]
    assert (t1['tipo_evento'], t1['referencia'], t1['actual']) == ('COMPLETA_BLOQUE', 'T0', 0)


def test_hu004_ruta_del_apoderado(cliente):
    rosa = estado(cliente, 'apo-rosa')
    familia, = rosa['bloques']
    assert [(a['codigo'], a['estado']) for a in familia['actividades']] == [
        ('t-apo-1', 'DISPONIBLE'), ('t-apo-carta', 'BLOQUEADA')]
    assert [(f['codigo'], f['estado']) for f in rosa['fichas']] == [('t-ficha-apo', 'BLOQUEADA')]
    assert rosa['insignias'] == [] and rosa['nivel_actual'] is None
    assert rosa['secciones'] == {'CONVERSACIONES': 'BLOQUEADA'} and rosa['preguntas_diario'] == []
    assert siguiente(cliente, 'apo-rosa') == 't-apo-1'
    assert reglas(completar(cliente, 't-apo-1', 'apo-rosa')) == {'R-t-apo-carta', 'R-t-ficha-apo'}
    respuesta = completar(cliente, 't-apo-carta', 'apo-rosa')
    assert respuesta['eventos_registrados'][-1]['tipo'] == 'COMPLETA_BLOQUE'
    assert reglas(respuesta) == {'R-SEC-CONVERSACIONES'}
    assert estado(cliente, 'apo-rosa')['secciones'] == {'CONVERSACIONES': 'DISPONIBLE'}
    assert siguiente(cliente, 'apo-rosa') is None
    assert actividades(cliente)['t-inicio'] == 'DISPONIBLE'
