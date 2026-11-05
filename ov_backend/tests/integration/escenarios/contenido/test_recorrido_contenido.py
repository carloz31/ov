"""Ajuste carga-actividades: el camino del estudiante y la ruta del apoderado del conjunto `contenido`, de punta a
punta, con las peticiones del front (evaluador falso)."""

from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_planes import crear, guardar, por_que_lista, realidad_lista
from soporte_ruta import FECHA, eventos, pedir, responder, responder_registro, revelar

from datos import contenido


CAMINO = ('B0', 'B1', 'B2', 'B3', 'B4', 'B5')
REQUERIDAS = tuple(c for c, b, *_ in contenido.ACTIVIDADES
                   if b in CAMINO and contenido.PROPIEDADES.get(c, {}).get('requerida', True))
ULTIMAS = {'b0-6': 'B1', 'b1-7': 'B2', 'b2-5': 'B3', 'b3-10': 'B4', 'b4-5': 'B5'}
TIPOS = {c: t for c, _, _, t, *_ in contenido.ACTIVIDADES}
PODIOS = ('b2-3-valores', 'b4-2-criterios')
TITULOS = {c: t for c, _, t, *_ in contenido.ACTIVIDADES}
VOCES_DE_ACTIVIDAD = {'b3-1': 'tb3-1', 'b3-8': 'tb3-8', 'b3-10': 'tb3-10'}


def voz_de(cliente, codigo):
    return next(t for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios') if t['codigo'] == codigo)


def estados(cliente, cuenta='est-ana'):
    bloques = pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades')
    return ({b['codigo']: b['estado'] for b in bloques},
            {a['codigo']: a['estado'] for b in bloques for a in b['actividades']})


def ganar_batalla(cliente, codigo):
    vidas, _, _ = contenido.CONFIGURACION_BATALLAS[codigo]
    pool = [p for p in contenido.PREGUNTAS_BATALLA if p[1] == codigo]
    respuestas = [{'pregunta': p[0], 'opcion': p[5]} for p in pool[:vidas]]
    return pedir(cliente, 'POST', '/acciones/resolver-batalla',
                 {'cuenta': 'est-ana', 'actividad': codigo, 'fecha_hora': FECHA, 'respuestas': respuestas})


def completar(cliente, codigo, cuenta='est-ana'):
    tipo = TIPOS[codigo]
    if tipo == 'BATALLA':
        return ganar_batalla(cliente, codigo)
    if tipo == 'REGISTRO':
        if any(i[1] in PODIOS for i in contenido.ITEMS_REGISTRO if i[0] == codigo):
            podio, = [i for i in pedir(cliente, 'GET', f'/actividades/{codigo}/items-registro') if i['eleccion']]
            # El podio se completa eligiendo exactamente tres opciones (`eleccion_minima` toma las tres primeras).
            assert (podio['eleccion']['minima'], podio['eleccion']['maxima']) == (3, 3)
        return responder_registro(cliente, codigo, cuenta)
    if tipo == 'CUESTIONARIO':
        responder(cliente, codigo, cuenta, opcion=3 if codigo in ('b0-3', 'b5-2') else None)
    return pedir(cliente, 'POST', '/acciones/completar-actividad',
                 {'cuenta': cuenta, 'actividad': codigo, 'fecha_hora': FECHA})


def preparar_planes(cliente):
    """Dos planes desde favoritos, con «Por qué» y «Qué tan real es» listos (REALIDAD se abre con b3-8)."""
    for carrera in (PSICOLOGIA, PERIODISMO):
        crear(cliente, carrera)
        guardar(cliente, carrera, 'POR_QUE', por_que_lista())
        guardar(cliente, carrera, 'REALIDAD', realidad_lista())


def revelar_para_b4(cliente):
    """B4 pide el punto de partida y los instrumentos prioritarios del salón (5A: intereses) revelados."""
    revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA')
    for parte in range(1, 7):
        completar(cliente, f'h-intereses-{parte}')
    revelar(cliente)


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
