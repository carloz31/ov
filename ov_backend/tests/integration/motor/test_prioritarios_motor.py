"""B07: T2 se abre, con su mensaje, solo con la partida y los cuestionarios prioritarios del salón revelados."""

from app import models as m
from soporte_retiro import buscar, medir
from soporte_ruta import INTERESES, INTERESES_FINAL, avanzar, completar, pedir, reglas, responder, revelar


MENSAJE_T2 = ('Termina el camino y revela tu punto de partida y los cuestionarios prioritarios de tu salón '
              'para abrir la decisión.')


def bloque_t2(cliente, cuenta):
    return next(b for b in pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades') if b['codigo'] == 'T2')


def revelar_partida(cliente, cuenta):
    return revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA', cuenta=cuenta)


def test_ana_del_5a_necesita_la_partida_y_el_riasec_prioritario(cliente):
    avanzar(cliente)
    t2 = bloque_t2(cliente, 'est-ana')
    motivo, = t2['bloqueo']
    assert (t2['estado'], motivo['regla'], motivo['mensaje']) == ('BLOQUEADA', 'R-T2', MENSAJE_T2)
    assert motivo['evaluador_especial'] == {'nombre': 'instrumentos_prioritarios', 'cumplido': False}
    assert [c['tipo_evento'] for c in motivo['condiciones_faltantes']] == ['REVELA_RESULTADO']
    rechazo = completar(cliente, 't-llegada', esperado=409)['detail']
    assert rechazo['mensaje'] == MENSAJE_T2
    # La partida sola no basta: el 5A tiene el RIASEC como prioritario.
    assert 'R-T2' not in reglas(revelar_partida(cliente, 'est-ana'))
    progreso = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/BLOQUE/T2')['reglas'][0]
    assert progreso['evaluador_especial'] == {'nombre': 'instrumentos_prioritarios', 'cumplido': False}
    assert all(c['cumplida'] for c in progreso['condiciones'])
    for mision in (INTERESES, INTERESES_FINAL):
        responder(cliente, mision)
        completar(cliente, mision)
    assert 'R-T2' in reglas(revelar(cliente))
    assert bloque_t2(cliente, 'est-ana')['estado'] == 'DISPONIBLE'


def test_beto_del_5b_solo_necesita_la_partida_en_cualquier_orden(cliente):
    avanzar(cliente, 't-cierre-inicio', 'est-beto')
    revelar_partida(cliente, 'est-beto')
    assert bloque_t2(cliente, 'est-beto')['estado'] == 'BLOQUEADA'
    # Cerrar T1 después de revelar también reevalúa T2.
    assert 'R-T2' in reglas(completar(cliente, 't-expectativas', 'est-beto'))
    assert bloque_t2(cliente, 'est-beto')['estado'] == 'DISPONIBLE'
    # Luis (5A) cierra T1 y revela la partida, pero le falta el prioritario.
    avanzar(cliente, cuenta='est-luis')
    assert 'R-T2' not in reglas(revelar_partida(cliente, 'est-luis'))


def test_comparacion_no_cuenta_como_prioritario_aunque_este_marcado(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        beto = buscar(sesion, m.Cuenta, 'est-beto')
        partida = buscar(sesion, m.Instrumento, 'TEST-PARTIDA-LLEGADA')
        # DATO DE PRUEBA: marca que B14 no aceptará; el evaluador la ignora y no exige la llegada.
        sesion.add(m.SalonInstrumento(salon_id=beto.salon_id, instrumento_id=partida.id, es_prioritario=True))
    avanzar(cliente, cuenta='est-beto')
    assert 'R-T2' in reglas(revelar_partida(cliente, 'est-beto'))


def test_presupuesto_no_crece_con_los_prioritarios(cliente, aplicacion):
    avanzar(cliente)
    ruta = '/cuentas/est-ana/progreso/BLOQUE/T2'
    _, basal = medir(cliente, aplicacion, 'GET', ruta, limite=8)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        ana = buscar(sesion, m.Cuenta, 'est-ana')
        for n in range(30):
            # DATO DE PRUEBA: cuestionarios prioritarios extra del 5A, cada uno con su aplicación.
            instrumento = m.Instrumento(codigo=f'TEST-PRIORITARIO-{n}', nombre='DATO DE PRUEBA',
                                        descripcion='DATO DE PRUEBA', tipo_resultado='DESTACADAS')
            sesion.add(instrumento)
            sesion.flush()
            sesion.add_all([m.Aplicacion(codigo=f'APL-PRIORITARIO-{n}', nombre='DATO DE PRUEBA',
                                         instrumento_id=instrumento.id),
                            m.SalonInstrumento(salon_id=ana.salon_id, instrumento_id=instrumento.id, es_prioritario=True)])
    _, muchos = medir(cliente, aplicacion, 'GET', ruta, limite=8)
    assert muchos.cantidad == basal.cantidad
