"""B09: las consultas del diario y del avance por temática no crecen con las entradas ni con el catálogo."""

from datetime import datetime

from app import models as m
from soporte_retiro import buscar, medir
from soporte_ruta import FECHA, completar, pedir


RUTAS = ('/cuentas/est-ana/diario/entradas', '/cuentas/est-ana/diario/amistad', '/cuentas/est-ana/diario/preguntas',
         '/cuentas/est-ana/tematicas', '/cuentas/est-ana/logros')


def test_presupuesto_no_crece_con_entradas_ni_actividades(cliente, aplicacion):
    completar(cliente, 't-inicio')
    pedir(cliente, 'POST', '/acciones/escribir-entrada', {'cuenta': 'est-ana', 'texto': 'DATO DE PRUEBA', 'fecha_hora': FECHA})
    basales = [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in RUTAS]
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        cuenta = buscar(sesion, m.Cuenta, 'est-ana')
        ciudad = buscar(sesion, m.Bloque, 'CIUDAD')
        tematica = sesion.query(m.Tematica).filter_by(codigo='A').one()
        for n in range(60):
            # DATO DE PRUEBA: entradas, preguntas y actividades extra para medir pocas contra muchas.
            sesion.add(m.EntradaDiario(cuenta_id=cuenta.id, origen='LIBRE', numero=100 + n, numero_libre=100 + n,
                                       texto='DATO DE PRUEBA', fecha_hora=datetime.fromisoformat(FECHA)))
            sesion.add(m.PreguntaDiario(codigo=f't-extra-{n}', nombre='DATO DE PRUEBA', pregunta='¿DATO DE PRUEBA?',
                                        uso='DESBLOQUEABLE'))
            actividad = m.Actividad(codigo=f't-extra-act-{n}', titulo='DATO DE PRUEBA', tipo='INFORMATIVA',
                                    contenido=f't_extra_act_{n}', orden=100 + n, bloque_id=ciudad.id)
            sesion.add(actividad)
            sesion.flush()
            sesion.add(m.ActividadTematica(actividad_id=actividad.id, tematica_id=tematica.id))
    for _ in range(2):
        assert [medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in RUTAS] == basales
    assert len(pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')) == 61
