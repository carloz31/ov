"""Ajuste carga-casos: los seis casos de la Central en `contenido`, con las peticiones del front (cliente de prueba del LLM)."""

from soporte_ruta import FECHA, eventos, pedir, responder, responder_registro

from datos import contenido


HASTA_LA_CIUDAD = ('b0-1', 'b0-2', 'b0-3', 'b0-4', 'b0-5', 'b0-6', 'b1-1', 'b1-2', 'b1-3')
CASOS = ('c1', 'c2', 'c3', 'c4', 'c5', 'c6')
TIPOS = {c: t for c, _, _, t, *_ in contenido.ACTIVIDADES}
# Necesidades de hidden-plaza, el caso que juega c1.
ARQUEOLOGO, CONSERVADOR, INGENIERO_CIVIL = '19-3091.00', '25-4013.00', '17-2051.00'
BASE_OCUPACIONES = '/cuentas/est-ana/catalogo/ocupaciones-caso'


def completar(cliente, codigo):
    if TIPOS[codigo] == 'REGISTRO':
        return responder_registro(cliente, codigo)
    if TIPOS[codigo] == 'CUESTIONARIO':
        responder(cliente, codigo, opcion=3)
    return pedir(cliente, 'POST', '/acciones/completar-actividad',
                 {'cuenta': 'est-ana', 'actividad': codigo, 'fecha_hora': FECHA})


def casos(cliente):
    return {c['actividad']: c for c in pedir(cliente, 'GET', '/cuentas/est-ana/casos')}


def llegar_a_la_ciudad(cliente):
    for codigo in HASTA_LA_CIUDAD:
        completar(cliente, codigo)


def resolver(cliente, puntaje, ocupaciones, esperado=200):
    return pedir(cliente, 'POST', '/acciones/resolver-caso', {
        'cuenta': 'est-ana', 'actividad': 'c1', 'puntaje': puntaje, 'ocupaciones': ocupaciones,
        'fecha_hora': FECHA}, esperado)


def test_los_casos_se_abren_con_la_ciudad(cliente_contenido):
    cliente = cliente_contenido
    for codigo in HASTA_LA_CIUDAD[:-1]:
        completar(cliente, codigo)
    antes = casos(cliente)
    assert list(antes) == list(CASOS) and {c['estado'] for c in antes.values()} == {'BLOQUEADA'}
    assert [(c['puntaje_minimo'], c['puntaje_maximo']) for c in antes.values()] == [
        (5, 8), (7, 10), (5, 8), (5, 8), (5, 8), (7, 10)]
    # La regla de cada caso pide lo mismo que la del bloque; mientras la ciudad está cerrada, el motor responde con
    # el mensaje del bloque.
    bloqueo = resolver(cliente, 6, [], esperado=409)
    assert bloqueo['detail']['mensaje'] == 'Completa la misión «Las voces y la mía», en el camino.'
    assert {r[2]: r[3] for r in contenido.REGLAS if r[1] == 'ACTIVIDAD' and r[2] in CASOS} == {
        c: 'Completa la misión «Las voces y la mía», en el camino.' for c in CASOS}
    completar(cliente, 'b1-3')
    assert {c['estado'] for c in casos(cliente).values()} == {'DISPONIBLE'}


def test_superar_c1_abre_sus_dos_voces_y_solo_esas(cliente_contenido):
    cliente = cliente_contenido
    llegar_a_la_ciudad(cliente)
    fallido = resolver(cliente, 4, [ARQUEOLOGO])
    assert fallido['nuevos_desbloqueos'] == [] and fallido['ocupaciones_nuevas'] == []
    assert pedir(cliente, 'GET', '/cuentas/est-ana/coleccion') == []
    superado = resolver(cliente, 5, [ARQUEOLOGO, CONSERVADOR])
    assert {d['regla'] for d in superado['nuevos_desbloqueos']} == {'R-tc1-1', 'R-tc1-2'}
    assert [(o['ocupacion'], o['caso']) for o in pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')] == [
        (ARQUEOLOGO, 'c1'), (CONSERVADOR, 'c1')]
    estados = {t['codigo']: t['estado'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')}
    assert {c for c, e in estados.items() if e == 'DISPONIBLE'} == {'tc1-1', 'tc1-2'}
    despues = casos(cliente)
    assert despues['c1']['superado'] and not despues['c2']['superado']


def test_cada_caso_abre_solo_sus_voces(cliente_contenido):
    """Ajuste testimonios: El festival da una sola voz; El torneo, dos."""
    cliente = cliente_contenido
    llegar_a_la_ciudad(cliente)
    def superar(caso):
        cuerpo = {'cuenta': 'est-ana', 'actividad': caso, 'puntaje': 6, 'ocupaciones': [], 'fecha_hora': FECHA}
        return {d['objetivo']['codigo'] for d in pedir(cliente, 'POST', '/acciones/resolver-caso', cuerpo)['nuevos_desbloqueos']
                if d['tipo_objetivo'] == 'TESTIMONIO'}
    assert superar('c4') == {'tc4-1'}
    assert superar('c5') == {'tc5-1', 'tc5-2'}
    voces = {t['codigo']: t for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')}
    assert {c for c, t in voces.items() if t['estado'] == 'DISPONIBLE'} == {'tc4-1', 'tc5-1', 'tc5-2'}
    assert (voces['tc4-1']['video_id'], voces['tc4-1']['inicio'], voces['tc4-1']['fin']) == ('ayxDpxdNOjc', 180, 480)
    assert voces['tc4-1']['contexto'] == 'Cineasta con productora propia'
    assert voces['tc4-1']['actividad'] is None and voces['tc4-1']['caso']['codigo'] == 'c4'


def test_ocupaciones_del_caso_en_el_orden_pedido(cliente_contenido):
    cliente = cliente_contenido
    llegar_a_la_ciudad(cliente)
    ocupaciones = pedir(cliente, 'GET', f'{BASE_OCUPACIONES}?codigos={INGENIERO_CIVIL},{ARQUEOLOGO}')
    assert [o['codigo'] for o in ocupaciones] == [INGENIERO_CIVIL, ARQUEOLOGO]
    assert set(ocupaciones[0]) == {'codigo', 'titulo', 'descripcion', 'conocimientos', 'aptitudes'}
    assert ocupaciones[1]['titulo'] == 'Antropólogo y arqueólogo'
    assert ocupaciones[1]['descripcion'] and ocupaciones[1]['conocimientos'] and ocupaciones[1]['aptitudes']
    # Abrir un caso no cuenta como explorar el catálogo.
    assert not [e for e in eventos(cliente) if e['tipo'] == 'VISTA_OCUPACION']


def test_ocupaciones_del_caso_responden_422(cliente_contenido):
    cliente = cliente_contenido
    llegar_a_la_ciudad(cliente)
    pedir(cliente, 'GET', BASE_OCUPACIONES, esperado=422)
    inexistente = pedir(cliente, 'GET', f'{BASE_OCUPACIONES}?codigos={ARQUEOLOGO},33-2011.00', esperado=422)
    assert '33-2011.00' in inexistente['detail']['mensaje']
    codigos = [o['codigo'] for o in pedir(cliente, 'GET', '/cuentas/est-ana/catalogo/ocupaciones?limite=31')['items']]
    assert len(codigos) == 31
    pedir(cliente, 'GET', f'{BASE_OCUPACIONES}?codigos={",".join(codigos)}', esperado=422)
