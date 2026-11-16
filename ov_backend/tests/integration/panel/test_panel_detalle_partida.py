"""Ajuste color-partida-llegada §2 y §3: «Ver detalle por dimensión» de la orientadora, ya ordenado y clasificado, y
la marca de «respuesta baja» que comparte con el estudiante. Escala 1 Nada … 4 Muy de acuerdo; el ítem 4 es inverso."""

from sqlalchemy import update

from app import models as m
from soporte_panel import fijar_ahora, medicion, responder_autopercepcion

DETALLE = '/cuentas/ori-carmen/panel/estudiantes/{}/tests/partida-llegada'
ORDEN_CAMBIO = {'BAJO': 0, 'SIGUE_BAJA': 1, 'MEJORO': 2, 'IGUAL': 3}


def _detalle(cliente, estudiante='est-ana', esperado=200):
    respuesta = cliente.get(DETALLE.format(estudiante))
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def _afirmaciones(datos):
    return {a['item']: a for d in datos['dimensiones'] for a in d['afirmaciones']}


def test_sin_partida_solo_la_cabecera_con_la_lectura_de_la_orientadora(aplicacion, cliente):
    fijar_ahora(aplicacion)
    datos = _detalle(cliente)
    assert datos['estado'] == 'SIN_PARTIDA' and datos['dimensiones'] == [] and datos['conteo'] == []
    assert datos['lectura'] and datos['etiqueta'] == 'REQUISITO' and datos['opciones_bajas'] == 2


def test_solo_partida_por_atencion_con_respuestas_bajas_e_item_inverso(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-ana', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR', 'AUTO-B': 'FUERTE'})
    items = responder_autopercepcion(sesion, 'est-ana', 't-partida', {1: 1, 2: 2, 4: 4})
    sesion.commit()
    datos = _detalle(cliente)
    assert datos['estado'] == 'SOLO_PARTIDA' and datos['fecha_llegada'] is None
    # Por trabajar → En camino → Fuerte; desempate por el orden del cuestionario.
    assert [d['codigo'] for d in datos['dimensiones']] == ['AUTO-E', 'AUTO-A', 'AUTO-C', 'AUTO-D', 'AUTO-B']
    assert datos['conteo'] == [{'codigo': 'POR_TRABAJAR', 'cantidad': 1}, {'codigo': 'EN_CAMINO', 'cantidad': 3},
                               {'codigo': 'FUERTE', 'cantidad': 1}]
    assert all(d['clase'] is None for d in datos['dimensiones'])
    # Ajuste partida-llegada-liviano: el bloque de Tests llega ordenado, por trabajar primero.
    bloque = cliente.get('/cuentas/ori-carmen/panel/estudiantes/est-ana/tests').json()['partida_llegada']['resumen']
    assert [d['codigo'] for d in bloque['dimensiones']] == ['AUTO-E', 'AUTO-A', 'AUTO-C', 'AUTO-D', 'AUTO-B']
    afirmaciones = _afirmaciones(datos)
    # El ítem 4 es inverso: «Muy de acuerdo» es baja.
    assert {i for i, a in afirmaciones.items() if a['partida_baja']} == {'AUTO-01', 'AUTO-02', 'AUTO-04'}
    assert all(a['cambio'] is None and a['llegada'] is None for a in afirmaciones.values())
    dimension = next(d for d in datos['dimensiones'] if any(a['item'] == 'AUTO-01' for a in d['afirmaciones']))
    codigos = [a['item'] for a in dimension['afirmaciones']]
    # De la más baja a la más alta; desempate por número de ítem (1 y 4 valen lo mismo).
    presentes = [c for c in ('AUTO-01', 'AUTO-04', 'AUTO-02') if c in codigos]
    assert codigos[:len(presentes)] == presentes
    assert 'puntaje' not in str(datos) and 'valor' not in str(datos)
    # Cambiar el parámetro cambia la marca.
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_OPCIONES_BAJAS').values(valor='1'))
    sesion.commit()
    datos = _detalle(cliente)
    assert datos['opciones_bajas'] == 1
    assert {i for i, a in _afirmaciones(datos).items() if a['partida_baja']} == {'AUTO-01', 'AUTO-04'}
    assert len(items) == 19


def test_con_llegada_un_solo_cambio_por_afirmacion_y_orden_por_atencion(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {'AUTO-D': 'FUERTE', 'AUTO-E': 'POR_TRABAJAR',
                                                 'AUTO-A': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {'AUTO-D': 'EN_CAMINO', 'AUTO-E': 'POR_TRABAJAR', 'AUTO-A': 'FUERTE'})
    # 1 baja de Bastante a Nada; 2 sigue en Poco; 3 sube de Nada a Poco (sube y sigue baja); 4 (inverso) mejora;
    # 5 baja de Bastante a Poco; el resto, igual en Bastante.
    responder_autopercepcion(sesion, 'est-luis', 't-partida', {1: 3, 2: 2, 3: 1, 4: 4, 5: 3})
    responder_autopercepcion(sesion, 'est-luis', 't-llegada', {1: 1, 2: 2, 3: 2, 4: 1, 5: 2})
    sesion.commit()
    datos = _detalle(cliente, 'est-luis')
    assert datos['estado'] == 'CON_LLEGADA' and datos['fecha_partida'] and datos['fecha_llegada']
    # Bajó → sigue por trabajar → subió → igual.
    assert [d['codigo'] for d in datos['dimensiones']] == ['AUTO-D', 'AUTO-E', 'AUTO-A', 'AUTO-B', 'AUTO-C']
    assert [(d['zona_partida'], d['zona_llegada'], d['cambio']) for d in datos['dimensiones'][:3]] == [
        ('FUERTE', 'EN_CAMINO', 'BAJO'), ('POR_TRABAJAR', 'POR_TRABAJAR', 'IGUAL'),
        ('POR_TRABAJAR', 'FUERTE', 'SUBIO')]
    # Ajuste partida-llegada-liviano: la clase de cada dimensión y «sigue por trabajar» aparte de «igual».
    assert [d['clase'] for d in datos['dimensiones']] == ['BAJO', 'SIGUE_POR_TRABAJAR', 'SUBIO', 'IGUAL', 'IGUAL']
    assert datos['conteo'] == [{'codigo': 'BAJO', 'cantidad': 1}, {'codigo': 'SIGUE_POR_TRABAJAR', 'cantidad': 1},
                               {'codigo': 'SUBIO', 'cantidad': 1}, {'codigo': 'IGUAL', 'cantidad': 2}]
    # El bloque de Tests llega en el mismo orden que el detalle.
    bloque = cliente.get('/cuentas/ori-carmen/panel/estudiantes/est-luis/tests').json()['partida_llegada']['resumen']
    assert [d['codigo'] for d in bloque['dimensiones']] == ['AUTO-D', 'AUTO-E', 'AUTO-A', 'AUTO-B', 'AUTO-C']
    assert [d['clase'] for d in bloque['dimensiones']] == ['BAJO', 'SIGUE_POR_TRABAJAR', 'SUBIO', 'IGUAL', 'IGUAL']
    afirmaciones = _afirmaciones(datos)
    cambios = {i: a['cambio'] for i, a in afirmaciones.items()}
    assert {i: c for i, c in cambios.items() if c != 'IGUAL'} == {
        'AUTO-01': 'BAJO', 'AUTO-02': 'SIGUE_BAJA', 'AUTO-03': 'SIGUE_BAJA', 'AUTO-04': 'MEJORO', 'AUTO-05': 'BAJO'}
    assert afirmaciones['AUTO-03'] | {'enunciado': ''} == {
        'item': 'AUTO-03', 'enunciado': '', 'partida': 'Nada de acuerdo', 'llegada': 'Poco de acuerdo',
        'partida_baja': True, 'llegada_baja': True, 'cambio': 'SIGUE_BAJA'}
    for dimension in datos['dimensiones']:
        claves = [ORDEN_CAMBIO[a['cambio']] for a in dimension['afirmaciones']]
        assert claves == sorted(claves), dimension['codigo']
    # La caída más grande primero (1 baja dos opciones, 5 una), si están en la misma dimensión.
    bajaron = [a['item'] for d in datos['dimensiones'] for a in d['afirmaciones'] if a['cambio'] == 'BAJO']
    assert set(bajaron) == {'AUTO-01', 'AUTO-05'}
    assert 'puntaje' not in str(datos)


def test_afirmaciones_para_conversar_una_que_sube_y_sigue_baja_solo_en_siguen_bajas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {})
    # El ítem 4 es inverso: en «Poco de acuerdo» no es bajo (el resto, «Bastante», tampoco).
    responder_autopercepcion(sesion, 'est-luis', 't-partida', {3: 1, 4: 2})
    responder_autopercepcion(sesion, 'est-luis', 't-llegada', {3: 2, 4: 2})
    sesion.commit()
    respuesta = cliente.get('/cuentas/ori-carmen/panel/estudiantes/est-luis/tests')
    grupos = {g['codigo']: [a['item'] for a in g['afirmaciones']] for g in respuesta.json()['partida_llegada']['grupos']}
    assert grupos == {'SIGUEN_BAJAS': ['AUTO-03']}

