"""Ajuste notificaciones (B2): las que llegan de otra cuenta (conversaciones e investigaciones), la consulta paginada
de la campana y el marcado de vistas."""

from app.core.parametros import FAVORITOS_LEYENDA
from soporte_investigaciones import abrir_investigaciones, accion, codigo_publicado, guia_lista, publicar
from soporte_ruta import FECHA, avanzar, completar, pedir


CARTA = 'DATO DE PRUEBA: una carta.'
FANS = ('est-mia', 'est-teo', 'est-sol')


def campana(cliente, cuenta, **consulta):
    filtro = '&'.join(f'{clave}={valor}' for clave, valor in consulta.items())
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/notificaciones?{filtro}')


def de_tipo(cliente, cuenta, tipo):
    return [n for n in campana(cliente, cuenta, limite=50)['items'] if n['tipo'] == tipo]


def marcar(cliente, cuenta, codigos=(), esperado=200):
    return pedir(cliente, 'POST', f'/cuentas/{cuenta}/notificaciones/marcar-vistas', {'codigos': list(codigos)},
                 esperado)


def preparar_familia(cliente):
    avanzar(cliente)
    for actividad in ('t-apo-1', 't-apo-2'):
        completar(cliente, actividad, 'apo-rosa')
    for cuenta in ('est-ana', 'apo-rosa'):
        pedir(cliente, 'POST', '/acciones/escribir-carta', {'cuenta': cuenta, 'texto': CARTA, 'fecha_hora': FECHA})


def responder(cliente, cuenta, texto='DATO DE PRUEBA: mi respuesta.', **extra):
    return pedir(cliente, 'POST', '/acciones/responder-conversacion', {
        'cuenta': cuenta, 'conversacion': 't-conv-1', 'texto': texto, 'fecha_hora': FECHA, **extra})


def test_respuesta_de_conversacion_avisa_al_otro_del_vinculo(cliente):
    preparar_familia(cliente)
    respuesta = responder(cliente, 'est-ana')
    assert respuesta['por_cuenta']['est-ana']['nuevas_notificaciones'] == []
    para_rosa, = respuesta['por_cuenta']['apo-rosa']['nuevas_notificaciones']
    assert (para_rosa['tipo'], para_rosa['referencia'], para_rosa['estudiante'], para_rosa['detalle']) == (
        'RESPUESTA_CONVERSACION', 't-conv-1', 'est-ana', None)
    assert para_rosa['nombre'] and de_tipo(cliente, 'apo-rosa', 'RESPUESTA_CONVERSACION') == [para_rosa]
    # Cambiar la propia respuesta antes de que el otro conteste no vuelve a avisar.
    responder(cliente, 'est-ana', texto='DATO DE PRUEBA: lo pensé mejor.')
    assert len(de_tipo(cliente, 'apo-rosa', 'RESPUESTA_CONVERSACION')) == 1
    responder(cliente, 'apo-rosa', estudiante='est-ana')
    para_ana, = de_tipo(cliente, 'est-ana', 'RESPUESTA_CONVERSACION')
    assert (para_ana['referencia'], para_ana['estudiante'], para_ana['detalle']) == ('t-conv-1', None, None)
    assert de_tipo(cliente, 'est-luis', 'RESPUESTA_CONVERSACION') == []


def publicar_con_luis(cliente):
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    return codigo_publicado(publicar(cliente, coautores=['est-luis']))


def destacar(cliente, codigo, destacada=True):
    return accion(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': destacada}, cuenta='ori-carmen')


def test_destacada_y_leyenda_avisan_una_vez_a_cada_autor(cliente):
    codigo = publicar_con_luis(cliente)
    respuesta = destacar(cliente, codigo)
    assert respuesta['nuevas_notificaciones'] == []
    destacar(cliente, codigo, destacada=False)
    destacar(cliente, codigo)
    for autor in ('est-ana', 'est-luis'):
        destacada, = de_tipo(cliente, autor, 'ENTREVISTA_DESTACADA')
        assert (destacada['referencia'], destacada['nombre']) == (codigo, 'Un día con una electricista')
    assert de_tipo(cliente, 'ori-carmen', 'ENTREVISTA_DESTACADA') == []
    for fan in FANS[:FAVORITOS_LEYENDA]:
        abrir_investigaciones(cliente, fan)
        pedir(cliente, 'POST', '/acciones/marcar-favorito', {'cuenta': fan, 'tipo': 'ENTREVISTA', 'codigo': codigo})
    for autor in ('est-ana', 'est-luis'):
        assert [n['referencia'] for n in de_tipo(cliente, autor, 'ENTREVISTA_LEYENDA')] == [codigo]
        assert 't-ins-leyenda' in {n['referencia'] for n in de_tipo(cliente, autor, 'DESBLOQUEO')}
    assert all(de_tipo(cliente, fan, 'ENTREVISTA_LEYENDA') == [] for fan in FANS)


def test_reaccion_avisa_a_los_autores_solo_la_primera_vez(cliente):
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente))
    abrir_investigaciones(cliente, 'est-luis')
    datos = {'entrevista': codigo, 'tipo': 'APRENDI', 'comentario': 'DATO DE PRUEBA: aprendí algo.'}
    respuesta = accion(cliente, 'reaccionar-entrevista', datos, cuenta='est-luis')
    assert respuesta['nuevas_notificaciones'] == []
    reaccion, = de_tipo(cliente, 'est-ana', 'REACCION_ENTREVISTA')
    assert reaccion['referencia'] == codigo and reaccion['detalle']
    accion(cliente, 'reaccionar-entrevista', {**datos, 'tipo': 'CURIOSIDAD'}, cuenta='est-luis')
    assert len(de_tipo(cliente, 'est-ana', 'REACCION_ENTREVISTA')) == 1
    assert de_tipo(cliente, 'est-luis', 'REACCION_ENTREVISTA') == []


def test_paginado_de_la_mas_reciente_y_tope(cliente):
    avanzar(cliente)
    todas = campana(cliente, 'est-ana', limite=50)
    assert todas['total'] == todas['no_vistas'] == len(todas['items']) >= 4
    fechas = [(n['creada_en'], n['codigo']) for n in todas['items']]
    pagina = campana(cliente, 'est-ana', limite=2, desde=1)
    assert [n['codigo'] for n in pagina['items']] == [n['codigo'] for n in todas['items'][1:3]]
    assert pagina['total'] == todas['total']
    assert len(campana(cliente, 'est-ana')['items']) == min(20, todas['total']) and fechas
    for consulta in ({'limite': 51}, {'limite': 0}, {'desde': -1}):
        filtro = '&'.join(f'{c}={v}' for c, v in consulta.items())
        pedir(cliente, 'GET', f'/cuentas/est-ana/notificaciones?{filtro}', esperado=422)


def test_marcado_parcial_total_e_idempotente(cliente):
    avanzar(cliente)
    items = campana(cliente, 'est-ana')['items']
    primera = items[0]['codigo']
    completar(cliente, 't-apo-1', 'apo-rosa')
    ajena = campana(cliente, 'apo-rosa')['items'][0]['codigo']
    assert marcar(cliente, 'est-ana', [primera, ajena, 'NOT-no-existe']) == {'marcadas': 1}
    assert marcar(cliente, 'est-ana', [primera]) == {'marcadas': 0}
    despues = campana(cliente, 'est-ana')
    assert despues['no_vistas'] == len(items) - 1
    assert [n['vista'] for n in despues['items'] if n['codigo'] == primera] == [True]
    assert campana(cliente, 'apo-rosa')['no_vistas'] == 1
    assert marcar(cliente, 'est-ana') == {'marcadas': len(items) - 1}
    assert campana(cliente, 'est-ana')['no_vistas'] == 0
