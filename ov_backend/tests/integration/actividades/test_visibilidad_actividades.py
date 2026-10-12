"""Visibilidad AL_DESBLOQUEAR: se envía siempre y solo se muestra al desbloquearse; DATO DE PRUEBA."""

from sqlalchemy import update
from app import models as m
from soporte_ruta import MISIONES_INTERESES, avanzar, completar, pedir, responder


def caso(cliente):
    ciudad = next(b for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades') if b['codigo'] == 'CIUDAD')
    return next(a for a in ciudad['actividades'] if a['codigo'] == 't-caso')


def test_al_desbloquear_se_envia_oculta_hasta_su_regla(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.execute(update(m.Actividad).where(m.Actividad.codigo == 't-caso')
                       .values(visibilidad=m.Visibilidad.AL_DESBLOQUEAR))
    oculto = caso(cliente)
    assert (oculto['contenido'], oculto['visibilidad']) == ('t_caso', 'AL_DESBLOQUEAR')
    assert oculto['estado'] == 'BLOQUEADA' and oculto['visible'] is False
    avanzar(cliente)
    assert caso(cliente)['visible'] is False
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    visible = caso(cliente)
    assert visible['estado'] == 'DISPONIBLE' and visible['visible'] is True
