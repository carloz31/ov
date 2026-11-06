"""B08 · HU-041 y HU-056: testimonios con pista mientras están bloqueados y vista única. DATO DE PRUEBA."""

from app import models as m
from soporte_retiro import ciclo, medir
from soporte_ruta import filas_base, pedir


def ver(testimonio, cuenta='est-ana'):
    return {'cuenta': cuenta, 'testimonio': testimonio}


def test_hu056_bloqueado_muestra_pista_y_oculta_el_enlace(cliente):
    uno, dos, *_ = pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')
    # Bloqueado: la pista y el caso que lo regala; nada de quién lo cuenta (ajustes Central, 7).
    assert uno == {'codigo': 't-testimonio-1', 'titulo': 'Calma y cuidado en una emergencia', 'estado': 'BLOQUEADA',
                   'visto': False, 'pista': 'Resuelve el caso de prueba para conocer este testimonio.',
                   'descripcion': None, 'video_id': None, 'inicio': None, 'fin': None, 'persona': None,
                   'ocupacion': None, 'contexto': None, 'cita': None,
                   'caso': {'codigo': 't-caso', 'titulo': 'Caso de prueba'}, 'actividad': None,
                   'caso_disponible': False, 'actividad_disponible': False, 'es_favorita': False}
    assert (dos['estado'], dos['video_id'], dos['persona']) == ('BLOQUEADA', None, None)
    # t-testimonio-2 pide el caso y además completar el proyecto: su origen sigue siendo el caso.
    assert dos['actividad'] is None
    assert dos['caso'] == {'codigo': 't-caso', 'titulo': 'Caso de prueba'}
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/testimonios') == []


def test_hu041_ver_testimonio_una_sola_vez(cliente, aplicacion):
    antes = filas_base(aplicacion)
    bloqueado = pedir(cliente, 'POST', '/acciones/ver-testimonio', ver('t-testimonio-1'), 409)
    assert bloqueado['detail']['mensaje'] == 'Supera el caso de prueba para conocer este testimonio.'
    pedir(cliente, 'POST', '/acciones/ver-testimonio', ver('t-nulo'), 404)
    pedir(cliente, 'POST', '/acciones/ver-testimonio', ver('t-testimonio-1', 'apo-rosa'), 409)
    assert filas_base(aplicacion) == antes

    ciclo(cliente)
    pedir(cliente, 'POST', '/acciones/resolver-caso', {'cuenta': 'est-ana', 'actividad': 't-caso', 'puntaje': 7})
    uno, *_ = pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')
    assert {k: uno[k] for k in ('estado', 'pista', 'video_id', 'inicio', 'fin', 'persona', 'ocupacion', 'contexto')} == {
        'estado': 'DISPONIBLE', 'pista': None, 'video_id': 'ysz5S6PUM-U', 'inicio': 0, 'fin': None,
        'persona': 'Luis Mendoza', 'ocupacion': {'codigo': '19-3091.00', 'titulo': 'Antropólogo y arqueólogo'},
        'contexto': None}
    assert uno['cita'] and uno['descripcion'] and uno['caso'] == {'codigo': 't-caso', 'titulo': 'Caso de prueba'}
    vista = pedir(cliente, 'POST', '/acciones/ver-testimonio', ver('t-testimonio-1'))
    assert [(e['tipo'], e['referencia']) for e in vista['eventos_registrados']] == [
        ('VISTA_TESTIMONIO', 't-testimonio-1')]
    assert pedir(cliente, 'POST', '/acciones/ver-testimonio', ver('t-testimonio-1'))['eventos_registrados'] == []
    assert [t['visto'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')] == [True, False, False, False]


def test_caso_disponible_segun_el_caso_que_regala_la_voz(cliente):
    """Ajuste mochila: una voz bloqueada se lista solo si su llamado ya está disponible para la cuenta."""
    def disponibles():
        return {t['codigo']: t['caso_disponible'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')}

    assert set(disponibles().values()) == {False}
    ciclo(cliente)
    # Con las dos misiones de intereses, t-caso se abre; t-caso-2 espera el proyecto.
    assert disponibles() == {'t-testimonio-1': True, 't-testimonio-2': True,
                             't-testimonio-3': False, 't-testimonio-4': False}


def test_presupuesto_de_consultas_de_testimonios(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'testimonios-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                # DATO DE PRUEBA: testimonios sin regla, siempre disponibles.
                sesion.add_all(m.Testimonio(codigo=f'tes-extra-{n}', titulo='DATO DE PRUEBA', descripcion='DATO DE PRUEBA',
                                            video_id='datoPrueba1', pista='DATO DE PRUEBA') for n in range(extra))
            conteos.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/testimonios')[1].cantidad)
    assert conteos[0] == conteos[1]
