"""B01 · HU-002 y HU-025: secciones con su estado, su mensaje de bloqueo y su guardia."""

import pytest
from app import models as modelos
from soporte_retiro import buscar, condicion, medir, regla
from soporte_ruta import FECHA, RECORRIDO, avanzar, completar, eventos, filas_base, pedir


SECCIONES_ESTUDIANTE = ('CATALOGO', 'CHECK_IN', 'DIARIO', 'FAMILIA', 'PLANES')


def secciones(cliente, cuenta='est-ana'):
    return {s['codigo']: s['estado'] for s in pedir(cliente, 'GET', f'/cuentas/{cuenta}/secciones')}


def test_secciones_que_se_abren_en_cada_paso(cliente):
    assert secciones(cliente) == dict.fromkeys(SECCIONES_ESTUDIANTE, 'BLOQUEADA')
    abiertas = []
    for actividad, nuevas in (('t-inicio', ('CATALOGO', 'DIARIO', 'PLANES')), ('t-partida', ()), ('t-cierre-inicio', ('CHECK_IN',)),
                              ('t-expectativas', ('FAMILIA',))):
        completar(cliente, actividad)
        abiertas += nuevas
        assert secciones(cliente) == {c: 'DISPONIBLE' if c in abiertas else 'BLOQUEADA' for c in SECCIONES_ESTUDIANTE}
    assert secciones(cliente, 'est-luis') == dict.fromkeys(SECCIONES_ESTUDIANTE, 'BLOQUEADA')


def test_seccion_bloqueada_muestra_mensaje_y_lo_que_falta(cliente):
    diario = pedir(cliente, 'GET', '/cuentas/est-ana/secciones/DIARIO')
    assert diario['estado'] == 'BLOQUEADA'
    motivo, = diario['bloqueo']
    assert (motivo['regla'], motivo['mensaje']) == ('R-SEC-DIARIO', 'Completa el inicio para abrir tu diario.')
    falta, = motivo['condiciones_faltantes']
    assert (falta['tipo_evento'], falta['referencia'], falta['actual'], falta['requerido']) == (
        'COMPLETA_ACTIVIDAD', 't-inicio', 0, 1)
    completar(cliente, 't-inicio')
    assert pedir(cliente, 'GET', '/cuentas/est-ana/secciones/DIARIO') == {
        'codigo': 'DIARIO', 'nombre': 'Diario', 'estado': 'DISPONIBLE', 'bloqueo': None}
    progreso = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/SECCION/CHECK_IN')
    assert progreso['reglas'][0]['mensaje_bloqueo'] == 'Completa el cierre del inicio para hacer tu check-in.'


@pytest.mark.parametrize('cuenta,codigo', [
    ('est-ana', 'NO-EXISTE'), ('est-ana', 'CONVERSACIONES'), ('apo-rosa', 'DIARIO'), ('ori-carmen', 'DIARIO'),
])
def test_seccion_inexistente_o_de_otra_audiencia_responde_404(cliente, cuenta, codigo):
    assert cliente.get(f'/cuentas/{cuenta}/secciones/{codigo}').status_code == 404


def test_apoderado_abre_conversaciones_al_completar_su_ruta(cliente):
    assert secciones(cliente, 'apo-rosa') == {'CONVERSACIONES': 'BLOQUEADA'}
    motivo, = pedir(cliente, 'GET', '/cuentas/apo-rosa/secciones/CONVERSACIONES')['bloqueo']
    assert motivo['condiciones_faltantes'][0]['referencia'] == 'FAMILIA'
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')
    assert secciones(cliente, 'apo-rosa') == {'CONVERSACIONES': 'DISPONIBLE'}


def test_orientadora_no_tiene_secciones(cliente):
    assert pedir(cliente, 'GET', '/cuentas/ori-carmen/secciones') == []


ACCIONES = {
    'DIARIO': ('escribir-entrada', {'origen': 'LIBRE', 'texto': 'DATO DE PRUEBA'}, 't-inicio'),
    'CHECK_IN': ('check-in', {'nivel_seguridad': 3}, 't-cierre-inicio'),
    'FAMILIA': ('escribir-carta', {'texto': 'DATO DE PRUEBA'}, 't-expectativas'),
}


@pytest.mark.parametrize('seccion', ACCIONES)
def test_escribir_sin_la_seccion_abierta_responde_409_sin_efectos(cliente, aplicacion, seccion):
    accion, cuerpo, abre = ACCIONES[seccion]
    datos = {'cuenta': 'est-ana', 'fecha_hora': FECHA, **cuerpo}
    # Se avanza hasta la actividad anterior a la que abre la sección.
    anteriores = RECORRIDO
    for actividad in anteriores[:anteriores.index(abre)]:
        completar(cliente, actividad)
    antes = filas_base(aplicacion)
    rechazo = pedir(cliente, 'POST', f'/acciones/{accion}', datos, 409)['detail']
    regla_seccion = rechazo['progreso']['reglas'][0]
    assert rechazo['mensaje'] == regla_seccion['mensaje_bloqueo']
    assert rechazo['progreso']['objetivo'] == {'tipo': 'SECCION', 'codigo': seccion}
    assert regla_seccion['condiciones'][0]['referencia'] == abre
    assert filas_base(aplicacion) == antes
    completar(cliente, abre)
    assert pedir(cliente, 'POST', f'/acciones/{accion}', datos)['eventos_registrados']


def test_conversacion_exige_la_seccion_del_apoderado(cliente):
    avanzar(cliente)
    datos = {'cuenta': 'est-ana', 'conversacion': 't-conv-1', 'fecha_hora': FECHA}
    rechazo = pedir(cliente, 'POST', '/acciones/completar-conversacion', datos, 409)['detail']
    assert rechazo['mensaje'] == 'Completa tus actividades para conversar en familia.'
    assert not any(e['tipo'] == 'COMPLETA_CONVERSACION' for e in eventos(cliente))
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')
    respuesta = pedir(cliente, 'POST', '/acciones/completar-conversacion', datos)
    assert set(respuesta['por_cuenta']) == {'est-ana', 'apo-rosa'}


def test_leer_el_diario_bloqueado_responde_409_con_su_mensaje(cliente):
    respuesta = cliente.get('/cuentas/est-ana/diario/preguntas')
    assert respuesta.status_code == 409
    assert respuesta.json()['detail']['mensaje'] == 'Completa el inicio para abrir tu diario.'
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/diario/preguntas') == []
    completar(cliente, 't-inicio')
    assert pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas') == []


def test_presupuesto_de_secciones_no_crece_con_el_catalogo(cliente, aplicacion):
    rutas = ('/cuentas/est-ana/secciones', '/cuentas/est-ana/secciones/DIARIO')
    basales = [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in rutas]
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        inicio = buscar(sesion, modelos.Actividad, 't-inicio').id
        diario = buscar(sesion, modelos.Seccion, 'DIARIO').id
        for n in range(100):
            # DATO DE PRUEBA: secciones y reglas extra para medir pocas contra muchas.
            seccion = modelos.Seccion(codigo=f'SEC-EXTRA-{n}', nombre='DATO DE PRUEBA', audiencia='ESTUDIANTE')
            sesion.add(seccion)
            sesion.flush()
            regla(sesion, f'R-SEC-EXTRA-{n}', 'SECCION', seccion.id, [condicion('COMPLETA_ACTIVIDAD', referencia=inicio)])
            regla(sesion, f'R-SEC-DIARIO-EXTRA-{n}', 'SECCION', diario, [condicion('INGRESO', 1000)])
    for _ in range(2):
        assert [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in rutas] == basales
    assert len(pedir(cliente, 'GET', '/cuentas/est-ana/secciones')) == len(SECCIONES_ESTUDIANTE) + 100
