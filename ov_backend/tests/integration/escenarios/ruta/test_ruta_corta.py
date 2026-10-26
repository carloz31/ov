"""Ruta corta: recorre la ruta mínima con las peticiones del front, sin `/eventos`.

B00 comprueba sobre `ruta` las HU 004, 011, 013, 014, 015, 021, 073 y 074; B02, las HU 006 y 010; B03, las HU 007
y 016; B07, la HU 094; B08, las HU 017, 041 y 051 a 056; B09, las HU 028 a 033, 035, 036 y 075; B11, las HU 043
a 048, 050, 097 a 099, 109 y 110; B12, las HU 066, 068 a 071 y 078 a 080; B17, la HU 001 (el recorrido empieza con
el ingreso real, como el front). Cada lote extiende este recorrido con su tramo.
"""

import soporte_escenarios_ruta as escenarios
from soporte_ruta import FECHA, avanzar, INTERESES, INTERESES_FINAL, MISIONES_INTERESES, actividades, completar, estado, eventos, filas_base, pedir, reglas, responder, responder_registro, revelar, respuestas_batalla


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


def test_hu001_ingreso_real_como_el_front(cliente_sin_token):
    ingreso = cliente_sin_token.post('/sesion/ingresar', json={
        'usuario': 'ana.estudiante@example.com', 'contrasena': 'Ana2026!'})
    assert ingreso.status_code == 200, ingreso.text
    assert ingreso.json()['cuenta'] == {'codigo': 'est-ana', 'nombre': 'Ana', 'rol': 'ESTUDIANTE'}
    cabecera = {'Authorization': f"Bearer {ingreso.json()['token']}"}
    assert cliente_sin_token.get('/sesion', headers=cabecera).json()['cuenta']['codigo'] == 'est-ana'
    assert cliente_sin_token.post('/acciones/ingresar', headers=cabecera, json={'cuenta': 'est-ana'}).status_code == 200
    assert cliente_sin_token.get('/cuentas/est-ana/resumen').status_code == 401


def test_estado_inicial(cliente):
    escenarios.verificar_p01_estado_inicial(cliente)
    assert siguiente(cliente) == 't-inicio'
    assert pedir(cliente, 'GET', '/cuentas/est-ana/resumen')['nivel_actual']['numero'] == 1


def test_hu004_013_015_informativa_con_ficha_y_retroalimentacion(cliente):
    respuesta = completar(cliente, 't-inicio')
    assert respuesta['eventos_registrados'] == [
        {'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-inicio', 'fecha_hora': '2026-10-07T10:00:00'}]
    assert {(d['tipo_objetivo'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']} == {
        ('ACTIVIDAD', 't-partida'), ('ACTIVIDAD', 't-batalla'), ('FICHA', 't-ficha'), ('FICHA', 't-ficha-2'),
        ('INSIGNIA', 't-ins-1'),
        ('SECCION', 'DIARIO'), ('SECCION', 'CATALOGO'), ('SECCION', 'PLANES'), ('PREGUNTA_DIARIO', 't-diario-fija'),
        ('SECCION_PLAN', 'POR_QUE')}
    assert [(f['codigo'], f['estado']) for f in pedir(cliente, 'GET', '/cuentas/est-ana/fichas')] == [('t-ficha', 'DISPONIBLE'), ('t-ficha-2', 'DISPONIBLE')]
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

    # El front lee los ítems (F02: la lista completa y la referencia que marca lo elegido antes) y las referencias.
    ruta_eco, _ = pedir(cliente, 'GET', '/actividades/t-eco/items-registro')
    assert ruta_eco['eleccion']['referencia'] == 't-ref-rutas'
    assert ruta_eco['eleccion']['lista'] == 'RUTAS_DESPUES_COLEGIO' and ruta_eco['eleccion']['opciones']
    resueltas = {r['codigo']: r for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')[
        'referencias']}
    assert resueltas['t-ref-espera']['estado'] == 'POR_DESARROLLAR' and 'texto' not in resueltas['t-ref-espera']
    assert resueltas['t-ref-rutas']['opciones'] == [{'codigo': 'INSTITUTO', 'texto': 'Estudiar en un instituto'}, otra]

    # Ampliar lo poco desarrollado (HU-008) hace que se cite literalmente.
    ampliada = 'DATO DE PRUEBA: esperan que estudie, por ejemplo mi mamá, porque ella no pudo'
    pedir(cliente, 'POST', '/acciones/registro/editar',
          {**accion, 'items': [{'item': 't-exp-espera', 'texto': ampliada}]})
    espera = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')['referencias'][0]
    assert espera == {'codigo': 't-ref-espera', 'tipo': 'TEXTO', 'estado': 'DISPONIBLE', 'actividad': 't-expectativas',
                      'texto': ampliada}

    eco = {'cuenta': 'est-ana', 'actividad': 't-eco', 'fecha_hora': FECHA}
    texto = 'DATO DE PRUEBA: el oficio, porque quiero empezar a trabajar pronto'
    # F02: retoma la elección de t-expectativas con su lista; aquí cambia de ruta.
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**eco, 'item': 't-eco-ruta', 'texto': texto, 'opciones': [{'codigo': 'NADA'}]}, 422)
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**eco, 'item': 't-eco-ruta', 'texto': texto, 'opciones': [{'codigo': 'TRABAJAR'}]})
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
        'R-t-partida', 'R-t-batalla', 'R-t-ficha', 'R-t-ficha-2', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES',
        'R-t-diario-fija', 'R-PLAN-POR_QUE'}
    assert all(d['visto'] is False for d in no_vistos)
    assert pedir(cliente, 'POST', '/cuentas/est-ana/desbloqueos/marcar-vistos')['marcados'] == 10
    assert pedir(cliente, 'GET', ruta) == []
    completar(cliente, 't-partida')
    completar(cliente, 't-cierre-inicio')
    assert {d['regla'] for d in pedir(cliente, 'GET', ruta)} == {'R-t-cierre-inicio', 'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}


def test_hu074_logros_obtenidos_y_condiciones(cliente):
    logros = pedir(cliente, 'GET', '/cuentas/est-ana/logros')
    visible = next(i for i in logros['insignias'] if i['codigo'] == 't-ins-1')
    oculto = next(i for i in logros['insignias'] if i['codigo'] == '???')
    assert (visible['codigo'], visible['estado'], visible['requisito']) == ('t-ins-1', 'BLOQUEADA', 'Completa la introducción de tu viaje.')
    assert (oculto['codigo'], oculto['requisito']) == ('???', None)
    condicion, = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/INSIGNIA/t-ins-1')['reglas'][0]['condiciones']
    assert (condicion['referencia'], condicion['actual'], condicion['requerido']) == ('t-inicio', 0, 1)
    assert cliente.get('/cuentas/est-ana/progreso/INSIGNIA/t-ins-oculta').status_code == 403
    completar(cliente, 't-inicio')
    completar(cliente, 't-partida')
    completar(cliente, 't-cierre-inicio')
    logros = pedir(cliente, 'GET', '/cuentas/est-ana/logros')
    assert logros['insignias'][0]['estado'] == 'OBTENIDA'
    assert [(n['numero'], n['estado']) for n in logros['niveles']] == [(1, 'OBTENIDO'), (2, 'OBTENIDO'), (3, 'BLOQUEADO')]
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
    # F04b: como el front, pide las preguntas del intento y responde con ellas.
    preguntas = pedir(cliente, 'GET', '/cuentas/est-ana/batallas/t-batalla/preguntas')
    assert len(preguntas) == 7 and {p['ficha']['codigo'] for p in preguntas} <= {'t-ficha', 't-ficha-2'}
    def fallar(lista):
        return [{'pregunta': p['codigo'], 'opcion': next(o['indice'] for o in p['opciones'] if o['indice'] != p['correcta'])}
                for p in lista]
    perdida = pedir(cliente, 'POST', '/acciones/resolver-batalla',
                    {**batalla, 'respuestas': fallar(preguntas[:3])})
    assert perdida['nuevos_desbloqueos'] == [] and actividades(cliente)['t-batalla'] == 'EN_CURSO'
    preguntas = pedir(cliente, 'GET', '/cuentas/est-ana/batallas/t-batalla/preguntas')
    # Un error y cinco aciertos: el último acierto deja al enemigo sin vidas; vence sin quedar intacta.
    acertadas = fallar(preguntas[:1]) + [{'pregunta': p['codigo'], 'opcion': p['correcta']} for p in preguntas[1:6]]
    ganada = pedir(cliente, 'POST', '/acciones/resolver-batalla', {**batalla, 'respuestas': acertadas})
    assert reglas(ganada) == set()
    # F04c: el servidor decide el resultado del intento.
    assert (ganada['victoria'], ganada['practica'], ganada['aciertos'], ganada['destellos_restantes']) == (True, False, 5, 2)
    assert perdida['victoria'] is False and perdida['destellos_restantes'] == 0
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
    fallido = pedir(cliente, 'POST', '/acciones/resolver-caso', {**datos_caso, 'puntaje': 6,
                                                                 'ocupaciones': ['firefighter']})
    assert fallido['ocupaciones_nuevas'] == [] and actividades(cliente)['t-caso'] == 'EN_CURSO'
    superado = pedir(cliente, 'POST', '/acciones/resolver-caso', {**datos_caso, 'puntaje': 12,
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
    check_ins = pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')
    assert check_ins['dias_registrados'] == 1 and isinstance(check_ins['registrado_hoy'], bool)
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


def test_hu043_050_097_099_109_110_planes_de_carrera(cliente):
    """B11: la tarjeta crece con el camino; comparar y proyecto esperan los planes; T2 se cierra con el proyecto."""
    planes, guardar = '/cuentas/est-ana/planes', '/acciones/planes/guardar-seccion'
    ana = {'cuenta': 'est-ana', 'fecha_hora': FECHA}

    def seccion(carrera, codigo, datos, esperado=200):
        return pedir(cliente, 'POST', guardar, {**ana, 'carrera': carrera, 'seccion': codigo, 'datos': datos}, esperado)

    def plan(carrera):
        return next(p for p in pedir(cliente, 'GET', planes)['planes'] if p['carrera']['codigo'] == carrera)

    completar(cliente, 't-inicio')
    # La opción inicial es el primer plan, registrado antes de terminar el camino.
    for carrera in ('psychology', 'journalism'):
        pedir(cliente, 'POST', '/acciones/planes/crear', {**ana, 'carrera': carrera})
        seccion(carrera, 'POR_QUE', {'idea_origen': 'MIA', 'motivos': [{'opcion': 'AYUDAR'}],
                                     'relato': 'DATO DE PRUEBA: un día expliqué un tema y sentí que era lo mío.'})
    bloqueada = seccion('psychology', 'CONOCIMIENTO', {'respuestas': {'CURSOS': 'NO'}}, esperado=409)['detail']
    assert bloqueada['mensaje'] == 'Completa el registro de valores para revisar qué tanto conoces esta carrera.'
    assert [s['estado'] for s in plan('psychology')['secciones']] == ['LISTA', 'BLOQUEADA', 'BLOQUEADA', 'BLOQUEADA']
    avanzar(cliente)
    assert reglas(completar(cliente, 't-valores')) >= {'R-PLAN-CONOCIMIENTO'}
    seccion('psychology', 'CONOCIMIENTO', {'respuestas': {'CURSOS': 'NO'},
                                           'dudas': [{'origen': 'PROPIA', 'texto': '¿Hay trabajo en Lima?'}]})
    assert [(s['origen']['duda'], s['generada_por']) for s in plan('psychology')['sugerencias']] == [
        (1, 'LLM'), (2, 'LLM')]
    # t-explorar abre REALIDAD; con dos planes listos para comparar se abre t-comparar.
    batalla = {**ana, 'actividad': 't-batalla'}
    pedir(cliente, 'POST', '/acciones/resolver-batalla', {**batalla, 'respuestas': respuestas_batalla(True, 1)})
    pedir(cliente, 'POST', '/acciones/ver-carrera', {**ana, 'carrera': 'nursing'})
    pedir(cliente, 'POST', '/acciones/ver-ocupacion', {**ana, 'ocupacion': 'civil-engineer'})
    assert 'R-PLAN-REALIDAD' in reglas(responder_registro(cliente, 't-explorar'))
    realidad = {'institucion': 't-uni', 'camino': {'opcion': 'POSTULAR_DIRECTO'},
                'gastos': [{'rubro': 'MATRICULA', 'monto': 600, 'frecuencia': 'POR_CICLO'}],
                'financiamiento': [{'opcion': 'BECA'}], 'complicaciones': [{'opcion': 'ECONOMICAS'}]}
    assert 'R-t-comparar' not in reglas(seccion('psychology', 'REALIDAD', realidad))
    assert 'R-t-comparar' in reglas(seccion('journalism', 'REALIDAD', {**realidad, 'complicaciones': []}))
    assert plan('psychology')['total_primer_anio'] == 1200 and plan('psychology')['lista_para_comparar'] is True
    # T2 se abre con la partida y el RIASEC revelados; comparar cita los planes y abre los pasos.
    revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    assert 'R-T2' in reglas(revelar(cliente))
    planes_citados, = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-comparar/referencias')['referencias']
    assert [o['codigo'] for o in planes_citados['opciones']] == ['psychology', 'journalism']
    assert 'R-PLAN-PASOS' in reglas(responder_registro(cliente, 't-comparar'))
    pasos = seccion('psychology', 'PASOS', {'pasos': [{'sugerencia': 1}], 'sugerencias_descartadas': [2]})
    assert 'R-t-proyecto' in reglas(pasos)
    hecho = pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {
        **ana, 'carrera': 'psychology', 'paso': 1, 'hallazgo': 'DATO DE PRUEBA: estadística en segundo año.'})
    assert hecho['eventos_registrados'][0]['tipo'] == 'ACTUALIZA_PLAN'
    assert plan('psychology')['dudas'][0]['estado'] == 'CERRADA'
    proyecto = {r['tipo']: r for r in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-proyecto/referencias')[
        'referencias']}
    assert (proyecto['PLAN']['texto'], proyecto['OPCION_INICIAL']['texto']) == ('Psicología', 'Psicología')
    assert proyecto['PLAN']['cita'].startswith('DATO DE PRUEBA') and len(proyecto['PASOS_PLAN_A']['opciones']) == 1
    # El proyecto cierra T2.
    responder(cliente, 't-llegada', opcion=4)
    completar(cliente, 't-llegada')
    responder_registro(cliente, 't-proyecto')
    assert any(e['tipo'] == 'COMPLETA_BLOQUE' and e['referencia'] == 'T2' for e in eventos(cliente))
    assert pedir(cliente, 'GET', planes)['opcion_inicial']['codigo'] == 'psychology'


def test_hu066_071_078_080_familia_conversaciones_y_cartas(cliente):
    # B12: la ruta del apoderado da su diploma; las cartas habilitan las conversaciones de cada uno.
    avanzar(cliente)
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')
    familia = pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')
    assert familia['diploma']['obtenido'] is True and familia['avance']['porcentaje'] == 100.0
    assert familia['estudiante']['codigo'] == 'est-ana' and familia['estudiante']['avance']['completadas'] == 4
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/familia/resultados') == []
    assert pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')['carta_pendiente'] is True

    def carta(cuenta):
        return pedir(cliente, 'POST', '/acciones/escribir-carta',
                     {'cuenta': cuenta, 'texto': f'DATO DE PRUEBA: carta de {cuenta}.', 'fecha_hora': FECHA})

    def responder_conversacion(cuenta, conversacion):
        return pedir(cliente, 'POST', '/acciones/responder-conversacion', {
            'cuenta': cuenta, 'conversacion': conversacion, 'texto': 'DATO DE PRUEBA: mi respuesta.',
            'fecha_hora': FECHA})

    def marcar(cuenta, conversacion):
        return pedir(cliente, 'POST', '/acciones/completar-conversacion',
                     {'cuenta': cuenta, 'conversacion': conversacion, 'fecha_hora': FECHA})

    def vista(cuenta):
        return pedir(cliente, 'GET', f'/cuentas/{cuenta}/conversaciones')

    assert reglas(carta('est-ana')) == {'R-t-conv-1'}
    carta('apo-rosa')
    assert [c['codigo'] for c in vista('est-ana')['conversaciones']] == ['t-conv-1']
    assert [c['estado'] for c in vista('apo-rosa')['conversaciones']] == ['sin_responder', 'sin_responder']
    responder_conversacion('apo-rosa', 't-conv-2')
    responder_conversacion('est-ana', 't-conv-1')
    assert [c['estado'] for c in vista('apo-rosa')['conversaciones']] == ['te_toca', 'esperando_al_otro']
    responder_conversacion('apo-rosa', 't-conv-1')
    respuesta = marcar('apo-rosa', 't-conv-1')['por_cuenta']['est-ana']
    assert [e['codigo'] for e in respuesta['entradas_desbloqueadas']] == ['t-diario-tras-conversar']
    assert vista('est-ana')['carta_recibida'] is None
    # Revelar el RIASEC y contrastarlo habilita la segunda; el hijo responde la que su madre ya respondió.
    for actividad in (INTERESES, INTERESES_FINAL):
        responder(cliente, actividad)
        completar(cliente, actividad)
    revelar(cliente)
    responder_registro(cliente, 't-contraste')
    assert vista('est-ana')['conversaciones'][1]['estado'] == 'te_toca'
    responder_conversacion('est-ana', 't-conv-2')
    marcar('est-ana', 't-conv-2')
    final = vista('est-ana')
    assert (final['completadas'], final['carta_recibida']) == (2, 'DATO DE PRUEBA: carta de apo-rosa.')
    assert vista('apo-rosa')['carta_recibida'] == 'DATO DE PRUEBA: carta de est-ana.'
    assert [r['instrumento'] for r in pedir(cliente, 'GET', '/cuentas/apo-rosa/familia/resultados')] == ['TEST-RIASEC']
