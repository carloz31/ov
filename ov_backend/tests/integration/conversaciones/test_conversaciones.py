"""B12: conversaciones familiares y cartas (HU-066, 068–071). DATO DE PRUEBA."""

from soporte_ruta import FECHA, avanzar, completar, pedir, reglas


CARTA_ESTUDIANTE = 'DATO DE PRUEBA: gracias por acompañarme.'
CARTA_APODERADO = 'DATO DE PRUEBA: estoy orgullosa de ti.'


def preparar(cliente):
    """Abre FAMILIA a Ana (t-expectativas) y CONVERSACIONES a Rosa (su ruta completa)."""
    avanzar(cliente)
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')


def carta(cliente, cuenta, texto=None, esperado=200):
    texto = texto or (CARTA_ESTUDIANTE if cuenta == 'est-ana' else CARTA_APODERADO)
    return pedir(cliente, 'POST', '/acciones/escribir-carta', {'cuenta': cuenta, 'texto': texto, 'fecha_hora': FECHA},
                 esperado)


def responder(cliente, cuenta, conversacion, texto='DATO DE PRUEBA: mi respuesta.', esperado=200):
    return pedir(cliente, 'POST', '/acciones/responder-conversacion', {
        'cuenta': cuenta, 'conversacion': conversacion, 'texto': texto, 'fecha_hora': FECHA}, esperado)


def marcar(cliente, cuenta, conversacion, esperado=200):
    return pedir(cliente, 'POST', '/acciones/completar-conversacion', {
        'cuenta': cuenta, 'conversacion': conversacion, 'fecha_hora': FECHA}, esperado)


def consultar(cliente, cuenta, esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/conversaciones', esperado=esperado)


def por_codigo(cliente, cuenta):
    return {c['codigo']: c for c in consultar(cliente, cuenta)['conversaciones']}


def abrir_segunda(cliente):
    """t-conv-2 se habilita con t-contraste; el evento crudo evita revelar el RIASEC."""
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-contraste',
                                        'fecha_hora': FECHA})


def conversar(cliente, conversacion, marca='est-ana'):
    responder(cliente, 'est-ana', conversacion)
    responder(cliente, 'apo-rosa', conversacion)
    return marcar(cliente, marca, conversacion)


def test_seccion_cerrada_responde_409_y_la_orientadora_404(cliente):
    detalle = consultar(cliente, 'est-ana', 409)['detail']
    assert detalle['mensaje'] == 'Completa el registro de expectativas para abrir la sección Familia.'
    assert consultar(cliente, 'apo-rosa', 409)['detail']['mensaje'] == 'Completa tus actividades para conversar en familia.'
    consultar(cliente, 'ori-carmen', 404)
    carta(cliente, 'est-ana', esperado=409)
    carta(cliente, 'apo-rosa', esperado=409)


def test_sin_carta_responde_carta_pendiente_y_sin_conversaciones(cliente):
    preparar(cliente)
    for cuenta in ('est-ana', 'apo-rosa'):
        assert consultar(cliente, cuenta) == {'carta_pendiente': True, 'completadas': 0, 'total': 2,
                                              'carta_propia': None, 'carta_recibida': None, 'conversaciones': []}
        rechazo = responder(cliente, cuenta, 't-conv-1', esperado=409)
        assert rechazo['detail']['mensaje'] == 'Escribe tu carta para empezar las conversaciones'


def test_la_carta_habilita_las_conversaciones_de_cada_rol(cliente):
    preparar(cliente)
    # El estudiante las habilita una por una: la carta y t-expectativas abren solo la primera.
    assert reglas(carta(cliente, 'est-ana')) == {'R-t-conv-1'}
    vistas = consultar(cliente, 'est-ana')
    assert vistas['carta_pendiente'] is False and vistas['carta_propia'] == CARTA_ESTUDIANTE
    assert [c['codigo'] for c in vistas['conversaciones']] == ['t-conv-1']
    rechazo = responder(cliente, 'est-ana', 't-conv-2', esperado=409)['detail']
    assert rechazo['mensaje'] == 'Escribe tu carta y contrasta tu resultado de intereses para conversar.'
    # El apoderado ve todas tras su carta, por orden, cada una con la pregunta de su rol.
    carta(cliente, 'apo-rosa')
    apoderado = consultar(cliente, 'apo-rosa')['conversaciones']
    assert [(c['codigo'], c['pregunta']) for c in apoderado] == [
        ('t-conv-1', '¿Qué espera usted del futuro de su hijo después del colegio?'),
        ('t-conv-2', '¿Qué te dijo tu resultado de intereses sobre ti?')]
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['pregunta'] == '¿Qué esperas tú de tu futuro después del colegio?'
    abrir_segunda(cliente)
    estudiante = por_codigo(cliente, 'est-ana')
    assert list(estudiante) == ['t-conv-1', 't-conv-2']
    # Sin pregunta propia del apoderado, ambos responden la misma.
    assert estudiante['t-conv-2']['pregunta'] == apoderado[1]['pregunta']


def test_el_apoderado_responde_una_que_el_hijo_no_tiene_y_espera(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    responder(cliente, 'apo-rosa', 't-conv-2')
    assert por_codigo(cliente, 'apo-rosa')['t-conv-2']['estado'] == 'esperando_al_otro'
    assert 't-conv-2' not in por_codigo(cliente, 'est-ana')
    abrir_segunda(cliente)
    assert por_codigo(cliente, 'est-ana')['t-conv-2']['estado'] == 'te_toca'


def test_recorrido_de_estados_desde_cada_rol(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')

    def estados():
        return por_codigo(cliente, 'est-ana')['t-conv-1'], por_codigo(cliente, 'apo-rosa')['t-conv-1']

    ana, rosa = estados()
    assert (ana['estado'], rosa['estado']) == ('sin_responder', 'sin_responder')
    responder(cliente, 'est-ana', 't-conv-1', 'DATO DE PRUEBA: estudiar ingeniería.')
    ana, rosa = estados()
    assert (ana['estado'], rosa['estado']) == ('esperando_al_otro', 'te_toca')
    assert ana['mi_respuesta'] == 'DATO DE PRUEBA: estudiar ingeniería.' and rosa['mi_respuesta'] is None
    # Antes de que respondan ambos no se ve la respuesta del otro ni la guía.
    for vista in (ana, rosa):
        assert vista['respuesta_otro'] is None and vista['preguntas_guia'] is None
        assert vista['mensaje_diferencias'] is None and vista['conversada_en'] is None
    responder(cliente, 'apo-rosa', 't-conv-1', 'DATO DE PRUEBA: que sea feliz.')
    ana, rosa = estados()
    assert (ana['estado'], rosa['estado']) == ('por_conversar', 'por_conversar')
    assert ana['respuesta_otro'] == 'DATO DE PRUEBA: que sea feliz.'
    assert rosa['respuesta_otro'] == 'DATO DE PRUEBA: estudiar ingeniería.'
    assert ana['preguntas_guia'] == rosa['preguntas_guia'] == [
        '¿En qué coinciden sus respuestas?', '¿Qué les sorprendió de la respuesta del otro?']
    assert rosa['mensaje_diferencias'].startswith('Si sus respuestas son distintas')
    marcar(cliente, 'apo-rosa', 't-conv-1')
    ana, rosa = estados()
    assert (ana['estado'], rosa['estado']) == ('conversada', 'conversada')
    assert ana['conversada_en'] == rosa['conversada_en'] == FECHA
    assert consultar(cliente, 'est-ana')['completadas'] == 1


def test_la_respuesta_se_edita_hasta_que_responde_el_otro(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    responder(cliente, 'est-ana', 't-conv-1', 'DATO DE PRUEBA: primera.')
    assert responder(cliente, 'est-ana', 't-conv-1', 'DATO DE PRUEBA: editada.')['eventos_registrados'] == []
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['mi_respuesta'] == 'DATO DE PRUEBA: editada.'
    responder(cliente, 'apo-rosa', 't-conv-1')
    for cuenta in ('est-ana', 'apo-rosa'):
        rechazo = responder(cliente, cuenta, 't-conv-1', 'DATO DE PRUEBA: tarde.', esperado=409)
        assert rechazo['detail']['mensaje'] == 'La otra persona ya respondió; tu respuesta ya no se puede cambiar'
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['mi_respuesta'] == 'DATO DE PRUEBA: editada.'
    responder(cliente, 'est-ana', 't-conv-1', '   ', esperado=422)


def test_se_marca_con_las_dos_respuestas_y_basta_una_marca(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    mensaje = 'Los dos deben responder la pregunta antes de marcar la conversación'
    assert marcar(cliente, 'apo-rosa', 't-conv-1', 409)['detail']['mensaje'] == mensaje
    responder(cliente, 'est-ana', 't-conv-1')
    assert marcar(cliente, 'est-ana', 't-conv-1', 409)['detail']['mensaje'] == mensaje
    preguntas = {p['codigo']: p['estado'] for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    assert preguntas['t-diario-tras-conversar'] == 'BLOQUEADA'
    responder(cliente, 'apo-rosa', 't-conv-1')
    # La marca del apoderado basta; el evento y la entrada de diario son solo del estudiante.
    respuesta = marcar(cliente, 'apo-rosa', 't-conv-1')['por_cuenta']
    assert [(e['tipo'], e['referencia']) for e in respuesta['est-ana']['eventos_registrados']] == [
        ('COMPLETA_CONVERSACION', 't-conv-1')]
    assert reglas(respuesta['est-ana']) == {'R-t-diario-tras-conversar'}
    assert [e['codigo'] for e in respuesta['est-ana']['entradas_desbloqueadas']] == ['t-diario-tras-conversar']
    assert respuesta['apo-rosa']['eventos_registrados'] == respuesta['apo-rosa']['nuevos_desbloqueos'] == []
    preguntas = {p['codigo']: p['estado'] for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    assert preguntas['t-diario-tras-conversar'] == 'DISPONIBLE'
    # Marcar de nuevo, desde cualquiera de los dos, no cambia nada.
    repetida = marcar(cliente, 'est-ana', 't-conv-1')['por_cuenta']
    assert all(r['eventos_registrados'] == r['nuevos_desbloqueos'] == [] for r in repetida.values())
    eventos = pedir(cliente, 'GET', '/cuentas/est-ana/eventos')
    assert sum(e['tipo'] == 'COMPLETA_CONVERSACION' for e in eventos) == 1
    assert not any(e['tipo'] == 'COMPLETA_CONVERSACION' for e in pedir(cliente, 'GET', '/cuentas/apo-rosa/eventos'))


def test_las_cartas_se_entregan_al_completar_todas_las_conversaciones(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana', 'DATO DE PRUEBA: borrador.')
    assert carta(cliente, 'est-ana')['eventos_registrados'] == []
    carta(cliente, 'apo-rosa')
    conversar(cliente, 't-conv-1')
    for cuenta in ('est-ana', 'apo-rosa'):
        vista = consultar(cliente, cuenta)
        assert (vista['completadas'], vista['carta_recibida']) == (1, None)
    abrir_segunda(cliente)
    conversar(cliente, 't-conv-2', marca='apo-rosa')
    estudiante, apoderado = consultar(cliente, 'est-ana'), consultar(cliente, 'apo-rosa')
    assert (estudiante['completadas'], estudiante['total']) == (2, 2)
    assert estudiante['carta_recibida'] == CARTA_APODERADO and estudiante['carta_propia'] == CARTA_ESTUDIANTE
    assert apoderado['carta_recibida'] == CARTA_ESTUDIANTE
    # Entregada, la carta ya no se edita.
    for cuenta in ('est-ana', 'apo-rosa'):
        assert carta(cliente, cuenta, 'DATO DE PRUEBA: otra.', 409)['detail']['mensaje'] == (
            'La carta ya se entregó y no se puede cambiar')
