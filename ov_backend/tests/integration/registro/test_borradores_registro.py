"""HU-010: los borradores guardan texto, elección y posición, y se retoman desde el servidor."""

from soporte_ruta import FECHA, avanzar, pedir


def borrador(cliente, item, texto, opciones=(), posicion=None, esperado=200):
    datos = {'cuenta': 'est-ana', 'actividad': 't-expectativas', 'item': item, 'fecha_hora': FECHA,
             'texto': texto, 'opciones': list(opciones)}
    if posicion is not None:
        datos['posicion'] = posicion
    return pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', datos, esperado)


def registro(cliente):
    return pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')


def test_borrador_con_eleccion_y_posicion_se_retoma(cliente):
    avanzar(cliente, 't-cierre-inicio')
    assert borrador(cliente, 't-exp-ruta', 'DATO DE PRUEBA: a medias', [{'codigo': 'INSTITUTO'}],
                    posicion='t-exp-ruta') == {'item': 't-exp-ruta', 'estado': 'BORRADOR'}
    borrador(cliente, 't-exp-ruta', 'DATO DE PRUEBA: a medias, ahora más',
             [{'codigo': 'OTRA', 'texto': 'Viajar'}, {'codigo': 'UNIVERSIDAD'}], posicion='t-exp-apoyo')
    retomado = registro(cliente)
    assert retomado['posicion'] == 't-exp-apoyo' and retomado['estado'] == 'EN_CURSO'
    assert retomado['respuestas'] == [{
        'item': 't-exp-ruta', 'estado': 'BORRADOR',
        'opciones_elegidas': [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'OTRA', 'texto': 'Viajar'}],
        'conversacion': [{'tipo': 'respuesta', 'texto': 'DATO DE PRUEBA: a medias, ahora más'}],
    }]


def test_borrador_no_exige_el_minimo_pero_si_lo_demas(cliente):
    avanzar(cliente, 't-cierre-inicio')
    borrador(cliente, 't-exp-apoyo', '', [])
    assert registro(cliente)['respuestas'][0]['opciones_elegidas'] == []
    for opciones in ([{'codigo': 'FAMILIA'}, {'codigo': 'AMIGOS'}], [{'codigo': 'UNIVERSIDAD'}],
                     [{'codigo': 'OTRA', 'texto': 'Mi tía'}]):
        borrador(cliente, 't-exp-apoyo', '', opciones, esperado=422)
    assert registro(cliente)['respuestas'][0]['opciones_elegidas'] == []


def test_borrador_en_seguimiento_no_acepta_eleccion(cliente):
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/registro/enviar', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'item': 't-exp-ruta', 'fecha_hora': FECHA,
        'texto': 'DATO DE PRUEBA [vaga]', 'opciones': [{'codigo': 'UNIVERSIDAD'}]})
    assert registro(cliente)['respuestas'][0]['estado'] == 'PENDIENTE_SEGUIMIENTO'
    borrador(cliente, 't-exp-ruta', 'Respuesta al seguimiento', [{'codigo': 'TRABAJAR'}], esperado=422)
    borrador(cliente, 't-exp-ruta', 'Respuesta al seguimiento')
    respuesta, = registro(cliente)['respuestas']
    assert respuesta['opciones_elegidas'] == [{'codigo': 'UNIVERSIDAD'}]
    assert respuesta['conversacion'][-1] == {
        'tipo': 'respuesta', 'orden': 1, 'texto': 'Respuesta al seguimiento', 'borrador': True}


def test_registro_bloqueado_no_guarda_borrador(cliente):
    borrador(cliente, 't-exp-ruta', 'DATO DE PRUEBA', esperado=409)
