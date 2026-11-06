"""B12 y F08: conversaciones familiares y cartas (HU-066, 068–071). DATO DE PRUEBA."""

from soporte_ruta import FECHA, avanzar, completar, pedir, reglas


CARTA_ESTUDIANTE = 'DATO DE PRUEBA: gracias por acompañarme.'
CARTA_APODERADO = 'DATO DE PRUEBA: estoy orgullosa de ti.'


def preparar(cliente):
    """Abre FAMILIA a Ana (t-expectativas) y CONVERSACIONES a Rosa (su ruta completa)."""
    avanzar(cliente)
    for actividad in ('t-apo-1', 't-apo-2'):
        completar(cliente, actividad, 'apo-rosa')


def carta(cliente, cuenta, texto=None, esperado=200, **extra):
    texto = texto or (CARTA_ESTUDIANTE if cuenta == 'est-ana' else CARTA_APODERADO)
    return pedir(cliente, 'POST', '/acciones/escribir-carta',
                 {'cuenta': cuenta, 'texto': texto, 'fecha_hora': FECHA, **extra}, esperado)


def responder(cliente, cuenta, conversacion, texto='DATO DE PRUEBA: mi respuesta.', esperado=200, **extra):
    return pedir(cliente, 'POST', '/acciones/responder-conversacion', {
        'cuenta': cuenta, 'conversacion': conversacion, 'texto': texto, 'fecha_hora': FECHA, **extra}, esperado)


def consultar(cliente, cuenta, esperado=200, estudiante=None):
    consulta = f'?estudiante={estudiante}' if estudiante else ''
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/conversaciones{consulta}', esperado=esperado)


def por_codigo(cliente, cuenta):
    return {c['codigo']: c for c in consultar(cliente, cuenta)['conversaciones']}


def abrir_segunda(cliente):
    """t-conv-2 se habilita con t-contraste; el evento crudo evita revelar el RIASEC."""
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-contraste',
                                        'fecha_hora': FECHA})


def conversar(cliente, conversacion, segundo='apo-rosa'):
    primero = 'est-ana' if segundo == 'apo-rosa' else 'apo-rosa'
    responder(cliente, primero, conversacion)
    return responder(cliente, segundo, conversacion)


def test_seccion_cerrada_responde_409_y_la_orientadora_404(cliente):
    detalle = consultar(cliente, 'est-ana', 409)['detail']
    assert detalle['mensaje'] == 'Completa el registro de expectativas para abrir la sección Familia.'
    assert consultar(cliente, 'apo-rosa', 409)['detail']['mensaje'] == 'Completa tus actividades para conversar en familia.'
    consultar(cliente, 'ori-carmen', 404)
    carta(cliente, 'est-ana', esperado=409)
    carta(cliente, 'apo-rosa', esperado=409)


def test_sin_carta_todas_bloqueadas_con_su_titulo_y_tema(cliente):
    preparar(cliente)
    otros = {'est-ana': {'codigo': 'apo-rosa', 'nombre': 'Rosa', 'parentesco': 'madre'},
             'apo-rosa': {'codigo': 'est-ana', 'nombre': 'Ana', 'parentesco': 'madre'}}
    for cuenta in ('est-ana', 'apo-rosa'):
        vista = consultar(cliente, cuenta)
        assert {clave: vista[clave] for clave in ('carta_pendiente', 'completadas', 'total', 'cartas_disponibles',
                                                    'carta_propia', 'carta_recibida')} == {
            'carta_pendiente': True, 'completadas': 0, 'total': 2, 'cartas_disponibles': False,
            'carta_propia': None, 'carta_recibida': None}
        assert vista['otro']['codigo'] == otros[cuenta]['codigo'] and vista['otro']['parentesco'] == 'madre'
        assert [(c['codigo'], c['orden'], c['titulo'], c['tema'], c['estado'], c['bloqueo_mensaje'])
                for c in vista['conversaciones']] == [
            ('t-conv-1', 1, 'Primera conversación', 'Expectativas', 'bloqueada',
             'Escribe tu carta para empezar las conversaciones'),
            ('t-conv-2', 2, 'Segunda conversación', 'Intereses', 'bloqueada',
             'Escribe tu carta para empezar las conversaciones')]
        rechazo = responder(cliente, cuenta, 't-conv-1', esperado=409)
        assert rechazo['detail']['mensaje'] == 'Escribe tu carta para empezar las conversaciones'


def test_la_carta_habilita_las_conversaciones_de_cada_rol(cliente):
    preparar(cliente)
    # El estudiante las habilita una por una: la carta y t-expectativas abren solo la primera.
    assert reglas(carta(cliente, 'est-ana')) == {'R-t-conv-1'}
    vistas = consultar(cliente, 'est-ana')
    assert vistas['carta_pendiente'] is False and vistas['carta_propia'] == CARTA_ESTUDIANTE
    # La segunda sigue listada, bloqueada con el mensaje de su regla («Por abrir»).
    assert [(c['codigo'], c['estado'], c['bloqueo_mensaje']) for c in vistas['conversaciones']] == [
        ('t-conv-1', 'sin_responder', None),
        ('t-conv-2', 'bloqueada', 'Escribe tu carta y contrasta tu resultado de intereses para conversar.')]
    rechazo = responder(cliente, 'est-ana', 't-conv-2', esperado=409)['detail']
    assert rechazo['mensaje'] == 'Escribe tu carta y contrasta tu resultado de intereses para conversar.'
    # El apoderado ve todas tras su carta, por orden, cada una con la pregunta de su rol.
    carta(cliente, 'apo-rosa')
    apoderado = consultar(cliente, 'apo-rosa')['conversaciones']
    assert [(c['codigo'], c['pregunta']) for c in apoderado] == [
        ('t-conv-1', '¿Qué espera usted del futuro de su hijo después del colegio?'),
        ('t-conv-2', '¿Qué te dijo tu resultado de intereses sobre ti?')]
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['pregunta'] == '¿Qué esperas tú de tu futuro después del colegio?'
    assert [c['abierta_para_hijo'] for c in apoderado] == [True, False]
    abrir_segunda(cliente)
    estudiante = por_codigo(cliente, 'est-ana')
    assert estudiante['t-conv-2']['estado'] == 'sin_responder' and estudiante['t-conv-2']['abierta_para_hijo'] is None
    # Sin pregunta propia del apoderado, ambos responden la misma.
    assert estudiante['t-conv-2']['pregunta'] == apoderado[1]['pregunta']


def test_el_apoderado_responde_una_que_el_hijo_no_tiene_y_espera(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    responder(cliente, 'apo-rosa', 't-conv-2')
    assert por_codigo(cliente, 'apo-rosa')['t-conv-2']['estado'] == 'esperando_al_otro'
    assert por_codigo(cliente, 'est-ana')['t-conv-2']['estado'] == 'bloqueada'
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
        assert vista['pregunta_otro'] is None and vista['algo_que_saben'] is None and vista['entrada_diario'] is None
    responder(cliente, 'apo-rosa', 't-conv-1', 'DATO DE PRUEBA: que sea feliz.')
    ana, rosa = estados()
    # Con las dos respuestas queda conversada: no hay marca aparte (F08).
    assert (ana['estado'], rosa['estado']) == ('conversada', 'conversada')
    assert ana['conversada_en'] == rosa['conversada_en'] == FECHA
    assert ana['respuesta_otro'] == 'DATO DE PRUEBA: que sea feliz.'
    assert ana['pregunta_otro'] == '¿Qué espera usted del futuro de su hijo después del colegio?'
    assert rosa['pregunta_otro'] == '¿Qué esperas tú de tu futuro después del colegio?'
    assert ana['algo_que_saben'] == rosa['algo_que_saben'] and ana['algo_que_saben'].startswith('Recuerden')
    assert rosa['respuesta_otro'] == 'DATO DE PRUEBA: estudiar ingeniería.'
    assert ana['preguntas_guia'] == rosa['preguntas_guia'] == [
        '¿En qué coinciden sus respuestas?', '¿Qué les sorprendió de la respuesta del otro?']
    assert rosa['mensaje_diferencias'].startswith('Si sus respuestas son distintas')
    # La entrada del diario es del estudiante; el apoderado no la ve.
    assert ana['entrada_diario']['codigo'] == 't-diario-tras-conversar' and rosa['entrada_diario'] is None
    assert consultar(cliente, 'est-ana')['completadas'] == 1


def test_la_respuesta_se_edita_hasta_que_responde_el_otro(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    responder(cliente, 'est-ana', 't-conv-1', 'DATO DE PRUEBA: primera.')
    editada = responder(cliente, 'est-ana', 't-conv-1', 'DATO DE PRUEBA: editada.')['por_cuenta']
    assert all(r['eventos_registrados'] == [] for r in editada.values())
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['mi_respuesta'] == 'DATO DE PRUEBA: editada.'
    responder(cliente, 'apo-rosa', 't-conv-1')
    for cuenta in ('est-ana', 'apo-rosa'):
        rechazo = responder(cliente, cuenta, 't-conv-1', 'DATO DE PRUEBA: tarde.', esperado=409)
        assert rechazo['detail']['mensaje'] == 'La otra persona ya respondió; tu respuesta ya no se puede cambiar'
    assert por_codigo(cliente, 'est-ana')['t-conv-1']['mi_respuesta'] == 'DATO DE PRUEBA: editada.'
    responder(cliente, 'est-ana', 't-conv-1', '   ', esperado=422)


def test_responder_el_segundo_la_conversa_en_ambas_cuentas(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana')
    carta(cliente, 'apo-rosa')
    primera = responder(cliente, 'est-ana', 't-conv-1')['por_cuenta']
    assert all(r['eventos_registrados'] == [] for r in primera.values())
    preguntas = {p['codigo']: p['estado'] for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    assert preguntas['t-diario-tras-conversar'] == 'BLOQUEADA'
    # Responde el apoderado, segundo: el evento va a las dos cuentas y abre la entrada de diario del estudiante.
    respuesta = responder(cliente, 'apo-rosa', 't-conv-1')['por_cuenta']
    for cuenta in ('est-ana', 'apo-rosa'):
        assert [(e['tipo'], e['referencia']) for e in respuesta[cuenta]['eventos_registrados']] == [
            ('COMPLETA_CONVERSACION', 't-conv-1')]
    assert reglas(respuesta['est-ana']) == {'R-t-diario-tras-conversar'}
    assert [e['codigo'] for e in respuesta['est-ana']['entradas_desbloqueadas']] == ['t-diario-tras-conversar']
    assert respuesta['apo-rosa']['nuevos_desbloqueos'] == []
    preguntas = {p['codigo']: p for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}
    assert preguntas['t-diario-tras-conversar']['estado'] == 'DISPONIBLE'
    # Ajuste del diario (F05): la abrió una conversación, no una actividad: no tiene remitente.
    assert preguntas['t-diario-tras-conversar']['actividad'] is None
    for cuenta in ('est-ana', 'apo-rosa'):
        eventos = pedir(cliente, 'GET', f'/cuentas/{cuenta}/eventos')
        assert sum(e['tipo'] == 'COMPLETA_CONVERSACION' for e in eventos) == 1


def test_completar_conversacion_ya_no_existe(cliente):
    preparar(cliente)
    pedir(cliente, 'POST', '/acciones/completar-conversacion',
          {'cuenta': 'est-ana', 'conversacion': 't-conv-1'}, 404)


def test_el_apoderado_elige_el_hijo_del_vinculo(cliente):
    preparar(cliente)
    carta(cliente, 'apo-rosa')
    # Sin parámetro, el primer vínculo (Ana); con Luis, su propio vínculo, todavía sin carta.
    assert consultar(cliente, 'apo-rosa')['otro']['codigo'] == 'est-ana'
    luis = consultar(cliente, 'apo-rosa', estudiante='est-luis')
    assert luis['carta_pendiente'] is True and luis['otro']['codigo'] == 'est-luis'
    carta(cliente, 'apo-rosa', 'DATO DE PRUEBA: para Luis.', estudiante='est-luis')
    assert consultar(cliente, 'apo-rosa', estudiante='est-luis')['carta_propia'] == 'DATO DE PRUEBA: para Luis.'
    assert consultar(cliente, 'apo-rosa')['carta_propia'] == CARTA_APODERADO
    responder(cliente, 'apo-rosa', 't-conv-1', estudiante='est-luis')
    assert por_codigo(cliente, 'apo-rosa')['t-conv-1']['estado'] == 'sin_responder'
    # Un estudiante que no es su hijo: 404.
    consultar(cliente, 'apo-rosa', 404, estudiante='est-beto')
    carta(cliente, 'apo-rosa', esperado=404, estudiante='est-beto')
    responder(cliente, 'apo-rosa', 't-conv-1', esperado=404, estudiante='est-beto')


def test_las_cartas_se_entregan_al_completar_todas_las_conversaciones(cliente):
    preparar(cliente)
    carta(cliente, 'est-ana', 'DATO DE PRUEBA: borrador.')
    assert carta(cliente, 'est-ana')['eventos_registrados'] == []
    carta(cliente, 'apo-rosa')
    conversar(cliente, 't-conv-1')
    for cuenta in ('est-ana', 'apo-rosa'):
        vista = consultar(cliente, cuenta)
        assert (vista['completadas'], vista['cartas_disponibles'], vista['carta_recibida']) == (1, False, None)
    abrir_segunda(cliente)
    conversar(cliente, 't-conv-2', segundo='est-ana')
    estudiante, apoderado = consultar(cliente, 'est-ana'), consultar(cliente, 'apo-rosa')
    assert (estudiante['completadas'], estudiante['total']) == (2, 2)
    assert estudiante['cartas_disponibles'] is apoderado['cartas_disponibles'] is True
    assert estudiante['carta_recibida'] == CARTA_APODERADO and estudiante['carta_propia'] == CARTA_ESTUDIANTE
    assert apoderado['carta_recibida'] == CARTA_ESTUDIANTE
    # Entregada, la carta ya no se edita.
    for cuenta in ('est-ana', 'apo-rosa'):
        assert carta(cliente, cuenta, 'DATO DE PRUEBA: otra.', 409)['detail']['mensaje'] == (
            'La carta ya se entregó y no se puede cambiar')
