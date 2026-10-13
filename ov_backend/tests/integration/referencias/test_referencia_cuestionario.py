"""B07: RESPUESTA_CUESTIONARIO cita la opción elegida en un ítem del punto de partida, con datos de la cuenta."""

from soporte_ruta import FECHA, completar, pedir, responder


RUTA = '/cuentas/{cuenta}/actividades/t-lee-cuestionario/referencias'


def referencia(cliente, cuenta='est-ana'):
    resuelta, = pedir(cliente, 'GET', RUTA.format(cuenta=cuenta))['referencias']
    return resuelta


def test_se_cita_la_respuesta_cuando_la_partida_esta_completada(cliente):
    assert referencia(cliente) == {'codigo': 't-ref-cuestionario', 'tipo': 'RESPUESTA_CUESTIONARIO', 'estado': 'SIN_DATO'}
    completar(cliente, 't-inicio')
    responder(cliente, 't-partida', opcion=2)
    pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': 't-partida', 'fecha_hora': FECHA,
        'respuestas': [{'item': 'AUTO-01', 'opcion': 4}]})
    # Antes de completar, la respuesta aún puede cambiar: no se cita.
    assert referencia(cliente)['estado'] == 'SIN_DATO'
    completar(cliente, 't-partida')
    citada = referencia(cliente)
    assert citada == {'codigo': 't-ref-cuestionario', 'tipo': 'RESPUESTA_CUESTIONARIO', 'estado': 'DISPONIBLE',
                      'texto': 'Muy de acuerdo'}
    # Otra cuenta no la ve.
    assert referencia(cliente, 'est-luis')['estado'] == 'SIN_DATO'
