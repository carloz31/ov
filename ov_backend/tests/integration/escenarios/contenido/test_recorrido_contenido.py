"""Ajuste carga-actividades: el camino del estudiante y la ruta del apoderado del conjunto `contenido`, de punta a
punta, con las peticiones del front (cliente de prueba del LLM)."""

from soporte_catalogo_ruta import PSICOLOGIA
from soporte_contenido import CAMINO, REQUERIDAS, avanzar, completar, preparar_planes, revelar_para_b4
from soporte_planes import guardar
from soporte_ruta import FECHA, eventos, pedir

from datos import contenido


ULTIMAS = {'b0-6': 'B1', 'b1-7': 'B2', 'b2-5': 'B3', 'b3-10': 'B4', 'b4-5': 'B5'}
TITULOS = {c: t for c, _, t, *_ in contenido.ACTIVIDADES}
VOCES_DE_ACTIVIDAD = {'b3-1': 'tb3-1', 'b3-8': 'tb3-8', 'b3-10': 'tb3-10'}


def voz_de(cliente, codigo):
    return next(t for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios') if t['codigo'] == codigo)


def estados(cliente, cuenta='est-ana'):
    bloques = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades')
    return ({b['codigo']: b['estado'] for b in bloques},
            {a['codigo']: a['estado'] for b in bloques for a in b['actividades']})










def test_el_libro_de_helena_se_abre_con_mi_punto_de_partida(cliente_contenido):
    cliente = cliente_contenido
    libro = lambda: pedir(cliente, 'GET', '/cuentas/est-ana/secciones/LIBRO_HELENA')['estado']
    assert libro() == 'BLOQUEADA'
    for codigo in ('b0-1', 'b0-2'):
        completar(cliente, codigo)
        assert libro() == 'BLOQUEADA'
    respuesta = completar(cliente, 'b0-3')
    assert 'R-SEC-LIBRO_HELENA' in {d['regla'] for d in respuesta['nuevos_desbloqueos']}
    assert libro() == 'DISPONIBLE'


def test_camino_del_estudiante_de_punta_a_punta(cliente_contenido):
    cliente = cliente_contenido
    bloques, actividades = estados(cliente)
    assert actividades['b0-1'] == 'DISPONIBLE' and bloques['B1'] == 'BLOQUEADA'
    assert not voz_de(cliente, 'tb3-1')['actividad_disponible']
    for actual, siguiente in zip(REQUERIDAS, (*REQUERIDAS[1:], None)):
        if actual == 'b3-10':
            revelar_para_b4(cliente)
        bloques, actividades = estados(cliente)
        assert actividades[actual] == 'DISPONIBLE', actual
        if siguiente:
            assert actividades[siguiente] == 'BLOQUEADA', siguiente
        if actual in ULTIMAS:
            assert bloques[ULTIMAS[actual]] == 'BLOQUEADA', actual
        if actual in VOCES_DE_ACTIVIDAD:
            # Ajuste testimonios: bloqueada se lista por su actividad disponible; todavía sin video.
            voz = voz_de(cliente, VOCES_DE_ACTIVIDAD[actual])
            assert (voz['estado'], voz['actividad_disponible'], voz['video_id']) == ('BLOQUEADA', True, None)
        completar(cliente, actual)
        if actual in VOCES_DE_ACTIVIDAD:
            voz = voz_de(cliente, VOCES_DE_ACTIVIDAD[actual])
            assert (voz['estado'], voz['caso']) == ('DISPONIBLE', None) and voz['video_id']
            assert voz['actividad'] == {'codigo': actual, 'titulo': TITULOS[actual]}
        if actual == 'b3-8':
            preparar_planes(cliente)
        bloques, actividades = estados(cliente)
        assert actividades[actual] == 'COMPLETADA', actual
        if actual in ULTIMAS:
            # El tramo se abre exactamente al completar su última requerida.
            assert bloques[ULTIMAS[actual]] == 'DISPONIBLE', actual
        if actual == 'b4-5':
            # b5-1 pide además un paso en el Plan A (PASOS se abre con b4-5).
            assert actividades['b5-1'] == 'BLOQUEADA'
            guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con una psicóloga.'}]})
            continue
        if siguiente:
            assert actividades[siguiente] == 'DISPONIBLE', siguiente
    assert len(REQUERIDAS) == 38 and estados(cliente)[1]['b5-5'] == 'COMPLETADA'
    completos = {e['referencia'] for e in eventos(cliente) if e['tipo'] == 'COMPLETA_BLOQUE'}
    assert completos >= set(CAMINO)


def test_ruta_del_apoderado(cliente_contenido):
    cliente = cliente_contenido
    rutas = [f'p{n}' for n in range(1, 9)]
    for actual, siguiente in zip(rutas, (*rutas[1:], None)):
        _, actividades = estados(cliente, 'apo-rosa')
        assert actividades[actual] == 'DISPONIBLE', actual
        if siguiente:
            assert actividades[siguiente] == 'BLOQUEADA', siguiente
        completar(cliente, actual, cuenta='apo-rosa')
    secciones = {s['codigo']: s['estado'] for s in pedir(cliente, 'GET', '/cuentas/apo-rosa/secciones')}
    assert secciones['CONVERSACIONES'] == 'DISPONIBLE'
    fichas = {f['codigo']: f for f in pedir(cliente, 'GET', '/cuentas/apo-rosa/fichas')}
    assert sorted(c for c, f in fichas.items() if f['obtenida_en']) == [f'FP0{n}' for n in range(1, 9)]
    assert all(fichas[f'FP0{n}']['actividad']['codigo'] == f'p{n}' for n in range(1, 9))


# Ajuste conversaciones: se abren con la carta y el camino; el regalo pide las diez.


def apoderado_listo(cliente):
    for n in range(1, 9):
        completar(cliente, f'p{n}', cuenta='apo-rosa')
    escribir_carta(cliente, 'apo-rosa', 'Carta de Rosa')


def escribir_carta(cliente, cuenta, texto):
    return pedir(cliente, 'POST', '/acciones/escribir-carta', {'cuenta': cuenta, 'texto': texto, 'fecha_hora': FECHA})


def responder_tema(cliente, cuenta, conversacion):
    return pedir(cliente, 'POST', '/acciones/responder-conversacion',
                 {'cuenta': cuenta, 'conversacion': conversacion, 'texto': f'Respuesta de {cuenta}', 'fecha_hora': FECHA})


def conversaciones(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/conversaciones')


def por_codigo(datos):
    return {c['codigo']: c for c in datos['conversaciones']}


def test_las_conversaciones_se_abren_con_la_carta_y_el_camino(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-3')
    assert all(c['estado'] == 'bloqueada' for c in conversaciones(cliente)['conversaciones'])
    escribir_carta(cliente, 'est-ana', 'Carta de Ana')
    mensajes = {r[2]: r[3] for r in contenido.REGLAS if r[1] == 'CONVERSACION'}
    temas = por_codigo(conversaciones(cliente))
    assert temas['conv-1']['estado'] == temas['conv-2']['estado'] == 'sin_responder'
    for n in range(3, 11):
        tema = temas[f'conv-{n}']
        assert (tema['estado'], tema['bloqueo_mensaje']) == ('bloqueada', mensajes[f'conv-{n}'])

    avanzar(cliente, 'b1-4', 'b1-6')
    temas = por_codigo(conversaciones(cliente))
    assert temas['conv-3']['estado'] == 'sin_responder' and temas['conv-4']['estado'] == 'bloqueada'
    avanzar(cliente, 'b1-7', 'b1-7')
    assert por_codigo(conversaciones(cliente))['conv-4']['estado'] == 'sin_responder'

    apoderado_listo(cliente)
    for conversacion in ('conv-1', 'conv-4'):
        responder_tema(cliente, 'est-ana', conversacion)
        responder_tema(cliente, 'apo-rosa', conversacion)
    temas = por_codigo(conversaciones(cliente))
    assert temas['conv-1']['estado'] == temas['conv-4']['estado'] == 'conversada'
    # Ajuste cartas-diario: conv-4 ya no abre una carta del diario.
    assert temas['conv-1']['entrada_diario'] is None and temas['conv-4']['entrada_diario'] is None
    preguntas = {p['codigo']: p for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    assert 'd-conv-futuro' not in preguntas
    assert preguntas['d-conv-fortalezas']['estado'] == 'BLOQUEADA'


def test_responder_conv_6_los_dos_deja_lo_que_vieron_en_mi(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b2-4')
    escribir_carta(cliente, 'est-ana', 'Carta de Ana')
    apoderado_listo(cliente)
    responder_tema(cliente, 'est-ana', 'conv-6')
    responder_tema(cliente, 'apo-rosa', 'conv-6')
    tema = por_codigo(conversaciones(cliente))['conv-6']
    assert tema['estado'] == 'conversada' and tema['entrada_diario']['codigo'] == 'd-conv-fortalezas'
    preguntas = {p['codigo']: p for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    fortalezas = preguntas['d-conv-fortalezas']
    assert (fortalezas['estado'], fortalezas['actividad'], fortalezas['texto']) == (
        'DISPONIBLE', None, 'Tu familia te contó lo que ve en ti. A veces uno se reconoce, y a veces se sorprende. ¿Qué sentiste al leerlo?')


def test_las_cartas_se_entregan_con_las_diez_y_no_con_nueve(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b5-1')
    escribir_carta(cliente, 'est-ana', 'Carta de Ana')
    apoderado_listo(cliente)
    for n in range(1, 10):
        responder_tema(cliente, 'est-ana', f'conv-{n}')
        responder_tema(cliente, 'apo-rosa', f'conv-{n}')
    datos = conversaciones(cliente)
    assert (datos['completadas'], datos['total'], datos['cartas_disponibles'], datos['carta_recibida']) == (9, 10, False, None)
    responder_tema(cliente, 'est-ana', 'conv-10')
    responder_tema(cliente, 'apo-rosa', 'conv-10')
    datos = conversaciones(cliente)
    assert (datos['completadas'], datos['cartas_disponibles'], datos['carta_recibida']) == (10, True, 'Carta de Rosa')
