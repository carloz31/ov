"""Ruta corta: recorre la ruta mínima con las peticiones del front, sin `/eventos`.

B00 comprueba sobre `ruta` las HU 004, 011, 013, 014, 015, 021, 073 y 074; B02, las HU 006 y 010; B03, las HU 007
y 016; B07, la HU 094; B08, las HU 017, 041 y 051 a 056; B09, las HU 028 a 033, 035, 036 y 075. Cada lote
extiende este recorrido con su tramo.
"""

import soporte_escenarios_ruta as escenarios
from soporte_ruta import FECHA, avanzar, INTERESES, INTERESES_FINAL, MISIONES_INTERESES, actividades, completar, estado, filas_base, pedir, reglas, responder, revelar


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
        ('ACTIVIDAD', 't-cierre-inicio'), ('ACTIVIDAD', 't-batalla'), ('FICHA', 't-ficha'), ('INSIGNIA', 't-ins-1'),
        ('SECCION', 'DIARIO'), ('SECCION', 'CATALOGO'), ('SECCION', 'PLANES'), ('PREGUNTA_DIARIO', 't-diario-fija')}
    assert [(f['codigo'], f['estado']) for f in pedir(cliente, 'GET', '/cuentas/est-ana/fichas')] == [
        ('t-ficha', 'DISPONIBLE')]
    assert siguiente(cliente) == 't-partida'


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


def test_hu007_hu016_entrega_con_seguimiento_y_mision_adicional(cliente):
    """B03: Ana responde la pregunta y ve la misión adicional; Luis omite y no la ve."""
    textos = {'t-exp-ruta': 'DATO DE PRUEBA: quiero estudiar [vaga]',
              't-exp-apoyo': 'DATO DE PRUEBA: mi familia, por ejemplo mi mamá me acompaña a las ferias',
              't-exp-espera': 'DATO DE PRUEBA: esperan que termine el colegio porque confían en mí'}
    opciones = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}
    for cuenta in ('est-ana', 'est-luis'):
        avanzar(cliente, 't-cierre-inicio', cuenta)
        accion = {'cuenta': cuenta, 'actividad': 't-expectativas', 'fecha_hora': FECHA}
        for item, texto in textos.items():
            pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
                  {**accion, 'item': item, 'texto': texto, 'opciones': opciones[item]})
        entrega = pedir(cliente, 'POST', '/acciones/registro/entregar', accion)
        assert entrega['estado'] == 'EN_CURSO'
        ruta = next(r for r in entrega['respuestas'] if r['item'] == 't-exp-ruta')
        assert ruta['estado'] == 'PENDIENTE_SEGUIMIENTO' and ruta['conversacion'][-1]['tipo'] == 'pregunta'
        assert 'clasificacion' not in str(entrega)
        if cuenta == 'est-ana':
            cierre = pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                           {**accion, 'item': 't-exp-ruta', 'texto': 'Porque me gusta aprender haciendo'})
            assert cierre['items_por_ampliar'] == []
            assert ('REGISTRO_ADECUADO', 't-expectativas') in [
                (e['tipo'], e['referencia']) for e in cierre['eventos_registrados']]
            assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'
            assert siguiente(cliente) == INTERESES  # La misión adicional es opcional.
            completar(cliente, 't-adicional')
            assert actividades(cliente)['t-adicional'] == 'COMPLETADA'
        else:
            cierre = pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder',
                           {**accion, 'item': 't-exp-ruta'})
            assert [i['item'] for i in cierre['items_por_ampliar']] == ['t-exp-ruta']
            assert actividades(cliente, cuenta)['t-expectativas'] == 'COMPLETADA'
            assert actividades(cliente, cuenta)['t-adicional'] == 'BLOQUEADA'
            # B04 (HU-008): Luis consulta la consolidada, edita lo que puede ampliar y responde la pregunta.
            registro = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/t-expectativas/registro')
            assert {r['item']: r['texto_consolidado'] for r in registro['respuestas']} == textos
            assert [i['item'] for i in registro['items_por_ampliar']] == ['t-exp-ruta']
            edicion = pedir(cliente, 'POST', '/acciones/registro/editar', {**accion, 'items': [
                {'item': 't-exp-ruta', 'texto': 'DATO DE PRUEBA: quiero estudiar en un instituto [vaga]'}]})
            ruta = next(r for r in edicion['respuestas'] if r['item'] == 't-exp-ruta')
            assert ruta['estado'] == 'PENDIENTE_SEGUIMIENTO'
            cierre = pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                           {**accion, 'item': 't-exp-ruta', 'texto': 'Porque quiero trabajar pronto'})
            assert cierre['items_por_ampliar'] == []
            assert actividades(cliente, cuenta)['t-adicional'] == 'DISPONIBLE'


def test_hu009_eco_cita_lo_desarrollado_y_elige_por_referencia(cliente):
    """B05: t-eco retoma t-expectativas; lo poco desarrollado sale «por desarrollar» hasta que se amplía."""
    avanzar(cliente, 't-cierre-inicio')
    assert actividades(cliente)['t-eco'] == 'BLOQUEADA'
    accion = {'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA}
    otra = {'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA: aprender un oficio'}
    for item, texto, opciones in (
            ('t-exp-ruta', 'DATO DE PRUEBA: quiero estudiar porque me gusta crear', [{'codigo': 'INSTITUTO'}, otra]),
            ('t-exp-apoyo', 'DATO DE PRUEBA: mi familia, por ejemplo mi tío', [{'codigo': 'FAMILIA'}]),
            ('t-exp-espera', 'DATO DE PRUEBA: algo [vaga]', [])):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion, 'item': item, 'texto': texto, 'opciones': opciones})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion)
    pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder', {**accion, 'item': 't-exp-espera'})
    assert actividades(cliente)['t-eco'] == 'DISPONIBLE'

    # El front lee los ítems (la elección dice de qué referencia salen sus opciones) y las referencias.
    ruta_eco, _ = pedir(cliente, 'GET', '/actividades/t-eco/items-registro')
    assert ruta_eco['eleccion']['referencia'] == 't-ref-rutas' and ruta_eco['eleccion']['opciones'] == []
    resueltas = {r['codigo']: r for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')[
        'referencias']}
    assert resueltas['t-ref-espera']['estado'] == 'POR_DESARROLLAR' and 'texto' not in resueltas['t-ref-espera']
    assert resueltas['t-ref-rutas']['opciones'] == [{'codigo': 'INSTITUTO', 'texto': 'Estudiar en un instituto'}, otra]

    # Ampliar lo poco desarrollado (HU-008) hace que se cite literalmente.
    ampliada = 'DATO DE PRUEBA: esperan que estudie, por ejemplo mi mamá, porque ella no pudo'
    pedir(cliente, 'POST', '/acciones/registro/editar',
          {**accion, 'items': [{'item': 't-exp-espera', 'texto': ampliada}]})
    espera = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')['referencias'][0]
    assert espera == {'codigo': 't-ref-espera', 'tipo': 'TEXTO', 'estado': 'DISPONIBLE', 'texto': ampliada}

    eco = {'cuenta': 'est-ana', 'actividad': 't-eco', 'fecha_hora': FECHA}
    texto = 'DATO DE PRUEBA: el oficio, porque quiero empezar a trabajar pronto'
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**eco, 'item': 't-eco-ruta', 'texto': texto, 'opciones': [{'codigo': 'UNIVERSIDAD'}]}, 422)
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**eco, 'item': 't-eco-ruta', 'texto': texto, 'opciones': [{'codigo': 'OTRA'}]})
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**eco, 'item': 't-eco-espera', 'texto': 'DATO DE PRUEBA: sí, lo sigo pensando', 'opciones': []})
    entrega = pedir(cliente, 'POST', '/acciones/registro/entregar', eco)
    assert entrega['estado'] == 'COMPLETADA'
    assert actividades(cliente)['t-eco'] == 'COMPLETADA'


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
    completar(cliente, INTERESES)
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    assert siguiente(cliente) == INTERESES_FINAL
    responder(cliente, INTERESES_FINAL)
    respuesta = completar(cliente, INTERESES_FINAL)
    assert reglas(respuesta) == {'R-t-caso'}
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    assert reglas(revelar(cliente)) == {'R-t-contraste'}
    resultado = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert siguiente(cliente) == 't-caso'


def test_resultado_con_coincidencias_y_carreras(cliente):
    escenarios.verificar_p10_resultado(cliente)


def test_perfil_plano(cliente):
    for codigo in ('t-inicio', 't-partida', 't-cierre-inicio', 't-expectativas'):
        completar(cliente, codigo, cuenta='est-luis')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision, cuenta='est-luis', opcion=3)
        completar(cliente, mision, cuenta='est-luis')
    assert revelar(cliente, cuenta='est-luis')['perfil_plano'] is True
    resultado = pedir(cliente, 'GET', '/cuentas/est-luis/instrumentos/TEST-RIASEC/resultado')
    assert resultado['perfil_plano'] is True
    assert resultado['coincidencias'] == resultado['carreras_recomendadas'] == []


def test_hu073_avisos_de_desbloqueo(cliente):
    ruta = '/cuentas/est-ana/desbloqueos?solo_no_vistos=true'
    completar(cliente, 't-inicio')
    no_vistos = pedir(cliente, 'GET', ruta)
    assert {d['regla'] for d in no_vistos} == {
        'R-t-cierre-inicio', 'R-t-batalla', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES',
        'R-t-diario-fija'}
    assert all(d['visto'] is False for d in no_vistos)
    assert pedir(cliente, 'POST', '/cuentas/est-ana/desbloqueos/marcar-vistos')['marcados'] == 8
    assert pedir(cliente, 'GET', ruta) == []
    completar(cliente, 't-partida')
    completar(cliente, 't-cierre-inicio')
    assert {d['regla'] for d in pedir(cliente, 'GET', ruta)} == {'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}


def test_hu074_logros_obtenidos_y_condiciones(cliente):
    logros = pedir(cliente, 'GET', '/cuentas/est-ana/logros')
    visible = next(i for i in logros['insignias'] if i['codigo'] == 't-ins-1')
    oculto = next(i for i in logros['insignias'] if i['codigo'] == '???')
    assert (visible['codigo'], visible['estado'], visible['requisito']) == ('t-ins-1', 'BLOQUEADA', 'Completa t-inicio.')
    assert (oculto['codigo'], oculto['requisito']) == ('???', None)
    condicion, = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/INSIGNIA/t-ins-1')['reglas'][0]['condiciones']
    assert (condicion['referencia'], condicion['actual'], condicion['requerido']) == ('t-inicio', 0, 1)
    assert cliente.get('/cuentas/est-ana/progreso/INSIGNIA/t-ins-oculta').status_code == 403
    completar(cliente, 't-inicio')
    completar(cliente, 't-partida')
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


def test_hu094_partida_llegada_prioritarios_y_apertura_de_t2(cliente):
    """B07: la partida se revela en palabras y se cita; T2 espera los prioritarios del 5A; la llegada se compara."""
    instrumento = 'TEST-PARTIDA-LLEGADA'
    completar(cliente, 't-inicio')
    assert siguiente(cliente) == 't-partida'
    responder(cliente, 't-partida', opcion=3)
    completar(cliente, 't-partida')
    revelar(cliente, instrumento=instrumento, aplicacion='APL-PARTIDA')
    partida = pedir(cliente, 'GET', f'/cuentas/est-ana/instrumentos/{instrumento}/resultado?aplicacion=APL-PARTIDA')
    assert {d['zona'] for d in partida['dimensiones']} == {'EN_CAMINO'}
    assert all(d['puntaje'] is None for d in partida['dimensiones'])
    avanzar(cliente)
    cita, = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-lee-cuestionario/referencias')['referencias']
    assert (cita['estado'], cita['texto']) == ('DISPONIBLE', 'Bastante de acuerdo')
    completar(cliente, 't-lee-cuestionario')
    t2 = next(b for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades') if b['codigo'] == 'T2')
    assert t2['estado'] == 'BLOQUEADA' and t2['bloqueo'][0]['regla'] == 'R-T2'
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    assert 'R-T2' in reglas(revelar(cliente))
    assert siguiente(cliente) == 't-llegada'
    responder(cliente, 't-llegada', opcion=4)
    completar(cliente, 't-llegada')
    revelar(cliente, instrumento=instrumento, aplicacion='APL-LLEGADA')
    comparacion = pedir(cliente, 'GET', f'/cuentas/est-ana/instrumentos/{instrumento}/comparacion')
    assert [(d['tematica'], d['zona_partida'], d['zona_llegada']) for d in comparacion['dimensiones']] == [
        ('A', 'EN_CAMINO', 'EN_CAMINO'), ('B', 'EN_CAMINO', 'FUERTE'), ('C', 'EN_CAMINO', 'FUERTE'),
        ('D', 'EN_CAMINO', 'FUERTE'), ('E', 'EN_CAMINO', 'FUERTE')]
    assert all(i['cambio'] for d in comparacion['dimensiones'] for i in d['items'])


def test_hu017_hu041_hu051_056_batalla_caso_y_testimonios(cliente):
    avanzar(cliente)
    batalla = {'cuenta': 'est-ana', 'actividad': 't-batalla', 'fecha_hora': FECHA}
    perdida = pedir(cliente, 'POST', '/acciones/resolver-batalla', {**batalla, 'victoria': False, 'aciertos': 1,
                                                                    'preguntas': 4})
    assert perdida['nuevos_desbloqueos'] == [] and actividades(cliente)['t-batalla'] == 'EN_CURSO'
    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', {**batalla, 'victoria': True, 'aciertos': 3,
                                                                   'preguntas': 4})
    assert reglas(ganada) == set()
    # B10: catálogo, vistas y favoritos. Sin resultado RIASEC, t-explorar pide vistas de dos tipos principales.
    assert [c['codigo'] for c in pedir(cliente, 'GET', '/cuentas/est-ana/catalogo/carreras?riasec=s')] == [
        'journalism', 'nursing', 'psychology']
    pedir(cliente, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': 'nursing', 'fecha_hora': FECHA})
    assert actividades(cliente)['t-explorar'] == 'BLOQUEADA'
    vista = pedir(cliente, 'POST', '/acciones/ver-ocupacion', {'cuenta': 'est-ana', 'ocupacion': 'civil-engineer',
                                                                'fecha_hora': FECHA})
    assert reglas(vista) == {'R-t-explorar-ocupacion'} and actividades(cliente)['t-explorar'] == 'DISPONIBLE'
    pedir(cliente, 'POST', '/acciones/marcar-favorito', {'cuenta': 'est-ana', 'tipo': 'CARRERA', 'codigo': 'nursing',
                                                          'fecha_hora': FECHA})
    assert [c['codigo'] for c in pedir(cliente, 'GET', '/cuentas/est-ana/favoritos')['carreras']] == ['nursing']
    fila, = pedir(cliente, 'GET', '/cuentas/est-ana/batallas')
    assert (fila['estado'], fila['intentos'], fila['primer_intento']['victoria']) == ('COMPLETADA', 2, False)

    testimonios = estado(cliente)['testimonios']
    assert testimonios[0]['pista'] and all(t['estado'] == 'BLOQUEADA' for t in testimonios)
    caso, = pedir(cliente, 'GET', '/cuentas/est-ana/casos')
    assert (caso['dimensiones'], caso['estado']) == (['R', 'S'], 'BLOQUEADA')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    datos_caso = {'cuenta': 'est-ana', 'actividad': 't-caso', 'fecha_hora': FECHA}
    fallido = pedir(cliente, 'POST', '/acciones/resolver-caso', {**datos_caso, 'puntaje': 40,
                                                                 'ocupaciones': ['firefighter']})
    assert fallido['ocupaciones_nuevas'] == [] and actividades(cliente)['t-caso'] == 'EN_CURSO'
    superado = pedir(cliente, 'POST', '/acciones/resolver-caso', {**datos_caso, 'puntaje': 80,
                                                                  'ocupaciones': ['firefighter', 'paramedic']})
    assert reglas(superado) == {'R-t-testimonio-1', 'R-t-testimonio-2'}
    assert [o['ocupacion'] for o in pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')] == ['firefighter', 'paramedic']
    pedir(cliente, 'POST', '/acciones/ver-testimonio', {'cuenta': 'est-ana', 'testimonio': 't-testimonio-1'})
    assert [(t['estado'], t['visto']) for t in estado(cliente)['testimonios']] == [
        ('DISPONIBLE', True), ('DISPONIBLE', False)]


def test_hu028_036_075_diario_check_in_y_avance(cliente):
    escribir = lambda **datos: pedir(cliente, 'POST', '/acciones/escribir-entrada',
                                     {'cuenta': 'est-ana', 'fecha_hora': FECHA, **datos})
    inicio = completar(cliente, 't-inicio')
    assert [(e['codigo'], e['texto'] is not None) for e in inicio['entradas_desbloqueadas']] == [('t-diario-fija', True)]
    escribir(pregunta='t-diario-fija', texto='DATO DE PRUEBA: lo que quiero descubrir')
    escribir(texto='DATO DE PRUEBA: una entrada libre')
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/check-in', {'cuenta': 'est-ana', 'nivel_seguridad': 3, 'fecha_hora': FECHA})
    assert pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')['dias_registrados'] == 1
    expectativas = avanzar(cliente)
    assert [(e['codigo'], e['texto']) for e in expectativas['entradas_desbloqueadas']] == [('t-diario-personal', None)]
    abierta = pedir(cliente, 'POST', '/acciones/diario/abrir-pregunta', {'cuenta': 'est-ana', 'codigo': 't-diario-personal'})
    assert abierta['texto'].startswith('Sobre «') and abierta['respondida'] is False
    escribir(pregunta='t-diario-personal', texto='DATO DE PRUEBA: tranquila')
    del_dia = pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia', {'cuenta': 'est-ana', 'fecha_hora': FECHA})
    escribir(del_dia=True, texto='DATO DE PRUEBA: hoy')
    entradas = pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')
    assert sorted(e['titulo_mostrado'] for e in entradas) == sorted(
        [abierta['texto'], del_dia['texto'], '¿Qué te gustaría descubrir de ti en este camino?', 'Entrada libre 1'])
    pedir(cliente, 'POST', '/acciones/editar-entrada', {'cuenta': 'est-ana', 'numero': 2, 'titulo': 'Mi día', 'texto': 'Editada'})
    assert pedir(cliente, 'GET', '/cuentas/est-ana/diario/amistad')['puntos'] == 3
    avance = {t['codigo']: t['completadas'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/tematicas')}
    assert avance['A'] >= 1 and avance['B'] >= 1
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == 0.0

