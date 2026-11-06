"""B01 · HU-002: lo bloqueado dice por qué; requeridas, opcionales y duración en el listado."""

from datos.ruta import DESCRIPCIONES
from soporte_retiro import actividades_extra, medir
from soporte_ruta import completar, pedir


def listado(cliente, cuenta='est-ana'):
    return {bloque['codigo']: bloque for bloque in pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades')}


def actividad(cliente, codigo, cuenta='est-ana'):
    return next(a for b in listado(cliente, cuenta).values() for a in b['actividades'] if a['codigo'] == codigo)


def test_actividad_bloqueada_por_su_regla_muestra_su_mensaje(cliente):
    cierre = actividad(cliente, 't-cierre-inicio')
    motivo, = cierre['bloqueo']
    assert (motivo['regla'], motivo['mensaje']) == ('R-t-cierre-inicio', 'Completa tu punto de partida para continuar.')
    assert [(c['referencia'], c['actual'], c['requerido']) for c in motivo['condiciones_faltantes']] == [('t-partida', 0, 1)]
    partida, = actividad(cliente, 't-partida')['bloqueo']
    assert (partida['regla'], partida['mensaje']) == ('R-t-partida', 'Completa el inicio para continuar.')
    assert actividad(cliente, 't-inicio')['bloqueo'] is None


def test_actividad_de_bloque_bloqueado_muestra_el_mensaje_del_bloque(cliente):
    # Regla 2 de disponibilidad: una actividad necesita su bloque disponible.
    bloques = listado(cliente)
    ciudad, = bloques['CIUDAD']['bloqueo']
    assert ciudad['regla'] == 'R-CIUDAD'
    assert bloques['CIUDAD']['actividades'][0]['bloqueo'] == [ciudad]
    expectativas = actividad(cliente, 't-expectativas')
    assert [m['regla'] for m in expectativas['bloqueo']] == ['R-T1']
    rechazo = completar(cliente, 't-expectativas', esperado=409)['detail']
    assert rechazo['mensaje'] == 'Termina el bloque de inicio para abrir el camino.'


def test_listado_trae_requerida_duracion_y_descripcion(cliente):
    inicio = actividad(cliente, 't-inicio')
    assert (inicio['requerida'], inicio['duracion_estimada_min']) == (True, 5)
    assert inicio['descripcion'] == DESCRIPCIONES['t-inicio']
    opcional = actividad(cliente, 't-opcional')
    assert (opcional['requerida'], opcional['visibilidad'], opcional['visible']) == (False, 'AL_DESBLOQUEAR', False)
    assert opcional['descripcion'] and opcional['duracion_estimada_min'] == 5


def test_opcional_no_impide_cerrar_el_bloque_y_la_ciudad_se_abre_a_mitad_de_t1(cliente):
    for codigo in ('t-inicio', 't-partida', 't-cierre-inicio'):
        completar(cliente, codigo)
    respuesta = completar(cliente, 't-expectativas')
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [
        ('COMPLETA_ACTIVIDAD', 't-expectativas'), ('COMPLETA_BLOQUE', 'T1'),
        # B04: todo adecuado al inicio da REGISTRO_ADECUADO, pero ninguna respuesta reflexiva.
        ('REGISTRO_ADECUADO', 't-expectativas'),
    ]
    opcional = actividad(cliente, 't-opcional')
    assert (opcional['estado'], opcional['visible']) == ('DISPONIBLE', True)
    assert listado(cliente)['CIUDAD']['estado'] == 'DISPONIBLE'
    repetida = completar(cliente, 't-opcional')
    assert [e['tipo'] for e in repetida['eventos_registrados']] == ['COMPLETA_ACTIVIDAD']


def test_orientadora_no_ve_actividades_fichas_ni_logros(cliente):
    for ruta in ('actividades', 'fichas', 'testimonios', 'diario/preguntas'):
        assert pedir(cliente, 'GET', f'/cuentas/ori-carmen/{ruta}') == []
    assert pedir(cliente, 'GET', '/cuentas/ori-carmen/logros') == {'insignias': [], 'niveles': [], 'vitrina': []}
    assert pedir(cliente, 'GET', '/cuentas/ori-carmen/resumen')['nivel_actual'] is None
    assert cliente.post('/acciones/completar-actividad', json={
        'cuenta': 'ori-carmen', 'actividad': 't-inicio'}).status_code == 409


def test_presupuesto_de_motivos_no_crece_con_actividades_bloqueadas(cliente, aplicacion):
    _, antes = medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/actividades')
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        actividades_extra(sesion, 100, bloque='T0')
    bloques, despues = medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/actividades')
    assert despues.cantidad == antes.cantidad
    # t-partida y t-cierre-inicio (T0 en orden) más las 100 agregadas.
    assert sum(a['bloqueo'] is not None for a in bloques[0]['actividades']) == 102
