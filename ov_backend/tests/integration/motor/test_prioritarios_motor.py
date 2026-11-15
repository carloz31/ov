"""B07: T2 se abre, con su mensaje, solo con los cuestionarios obligatorios revelados (la partida y el de intereses;
de partida y llegada, solo la partida)."""

from app import models as m
from soporte_retiro import buscar, medir
from soporte_ruta import INTERESES, INTERESES_FINAL, avanzar, completar, pedir, reglas, responder, revelar


MENSAJE_T2 = ('Termina el camino y revela tu punto de partida y los cuestionarios prioritarios de tu salón '
              'para abrir la decisión.')


def bloque_t2(cliente, cuenta):
    return next(b for b in pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades') if b['codigo'] == 'T2')


def revelar_partida(cliente, cuenta):
    return revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA', cuenta=cuenta)


def test_ana_necesita_la_partida_y_el_riasec_obligatorio(cliente):
    avanzar(cliente)
    t2 = bloque_t2(cliente, 'est-ana')
    motivo, = t2['bloqueo']
    assert (t2['estado'], motivo['regla'], motivo['mensaje']) == ('BLOQUEADA', 'R-T2', MENSAJE_T2)
    assert motivo['evaluador_especial'] == {'nombre': 'instrumentos_prioritarios', 'cumplido': False}
    assert [c['tipo_evento'] for c in motivo['condiciones_faltantes']] == ['REVELA_RESULTADO']
    rechazo = completar(cliente, 't-llegada', esperado=409)['detail']
    assert rechazo['mensaje'] == MENSAJE_T2
    # La partida sola no basta: el RIASEC también es obligatorio.
    assert 'R-T2' not in reglas(revelar_partida(cliente, 'est-ana'))
    progreso = pedir(cliente, 'GET', '/cuentas/est-ana/progreso/BLOQUE/T2')['reglas'][0]
    assert progreso['evaluador_especial'] == {'nombre': 'instrumentos_prioritarios', 'cumplido': False}
    assert all(c['cumplida'] for c in progreso['condiciones'])
    for mision in (INTERESES, INTERESES_FINAL):
        responder(cliente, mision)
        completar(cliente, mision)
    assert 'R-T2' in reglas(revelar(cliente))
    assert bloque_t2(cliente, 'est-ana')['estado'] == 'DISPONIBLE'


def _intereses(cliente, cuenta):
    for mision in (INTERESES, INTERESES_FINAL):
        responder(cliente, mision, cuenta=cuenta)
        completar(cliente, mision, cuenta=cuenta)
    return revelar(cliente, cuenta=cuenta)


def test_beto_del_5b_tambien_necesita_intereses_en_cualquier_orden(cliente):
    # Ajuste panel-entrevistas-configuracion: los obligatorios son los mismos para todos los salones.
    avanzar(cliente, 't-cierre-inicio', 'est-beto')
    revelar_partida(cliente, 'est-beto')
    # Cerrar T1 después de revelar reevalúa T2, pero falta intereses (sus misiones están en la Ciudad, tras T1).
    assert 'R-T2' not in reglas(completar(cliente, 't-expectativas', 'est-beto'))
    assert bloque_t2(cliente, 'est-beto')['estado'] == 'BLOQUEADA'
    assert 'R-T2' in reglas(_intereses(cliente, 'est-beto'))
    assert bloque_t2(cliente, 'est-beto')['estado'] == 'DISPONIBLE'
    # Luis cierra T1 y revela la partida, pero le falta intereses.
    avanzar(cliente, cuenta='est-luis')
    assert 'R-T2' not in reglas(revelar_partida(cliente, 'est-luis'))


def test_de_partida_y_llegada_solo_cuenta_la_partida(cliente):
    avanzar(cliente, cuenta='est-beto')
    revelar_partida(cliente, 'est-beto')
    assert 'R-T2' in reglas(_intereses(cliente, 'est-beto'))


def test_presupuesto_no_crece_con_los_obligatorios(cliente, aplicacion):
    avanzar(cliente)
    ruta = '/cuentas/est-ana/progreso/BLOQUE/T2'
    _, basal = medir(cliente, aplicacion, 'GET', ruta, limite=8)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        for n in range(30):
            # DATO DE PRUEBA: cuestionarios obligatorios extra, cada uno con su aplicación.
            instrumento = m.Instrumento(codigo=f'TEST-OBLIGATORIO-{n}', nombre='DATO DE PRUEBA',
                                        descripcion='DATO DE PRUEBA', tipo_resultado='DESTACADAS', obligatorio=True,
                                        visibilidad_apoderado='NUNCA')
            sesion.add(instrumento)
            sesion.flush()
            sesion.add(m.Aplicacion(codigo=f'APL-OBLIGATORIO-{n}', nombre='DATO DE PRUEBA',
                                    instrumento_id=instrumento.id))
    _, muchos = medir(cliente, aplicacion, 'GET', ruta, limite=8)
    assert muchos.cantidad == basal.cantidad
