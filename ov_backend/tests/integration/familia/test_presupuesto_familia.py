"""Auditoría plataforma (D-B3): las lecturas del apoderado no crecen con los hijos vinculados; DATO DE PRUEBA."""

from sqlalchemy import update

from app import models as m
from soporte_consultas import ContadorConsultas
from soporte_retiro import buscar
from soporte_ruta import completar


RUTAS = ('/cuentas/apo-rosa/familia', '/cuentas/apo-rosa/familia/resultados',
         '/cuentas/apo-rosa/conversaciones?estudiante=est-ana')


def _consultas(cliente, aplicacion):
    cantidades = []
    for ruta in RUTAS:
        cliente.get(ruta)
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            respuesta = cliente.get(ruta)
        assert respuesta.status_code in (200, 409), respuesta.text
        cantidades.append((respuesta.status_code, contador.cantidad))
    return cantidades


def test_familia_resultados_y_conversaciones_no_crecen_con_los_hijos(cliente, aplicacion):
    completar(cliente, 't-inicio')
    completar(cliente, 't-inicio', cuenta='est-luis')
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.execute(update(m.VinculoFamiliar).where(m.VinculoFamiliar.codigo == 'VIN-LUIS').values(es_activo=False))
    con_uno = _consultas(cliente, aplicacion)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.execute(update(m.VinculoFamiliar).where(m.VinculoFamiliar.codigo == 'VIN-LUIS').values(es_activo=True))
        rosa = buscar(sesion, m.Cuenta, 'apo-rosa')
        for n, hijo in enumerate(('est-beto', 'est-mia', 'est-teo')):
            sesion.add(m.VinculoFamiliar(codigo=f'VIN-PRUEBA-{n}', estudiante_id=buscar(sesion, m.Cuenta, hijo).id,
                                         apoderado_id=rosa.id, parentesco='madre'))
    con_cinco = _consultas(cliente, aplicacion)
    assert con_cinco == con_uno
    familia = cliente.get('/cuentas/apo-rosa/familia').json()
    assert len(familia['estudiantes']) == 5
