"""Auditoría plataforma (sección F): lo que se pide en cada ingreso no crece con el historial de la cuenta (eventos,
notificaciones, entradas), una petición vacía cuesta una consulta y escribir la carta no crece con las cartas.
DATO DE PRUEBA."""

from datetime import datetime

from app import models as m
from soporte_consultas import ContadorConsultas
from soporte_retiro import agregar_eventos, buscar
from soporte_ruta import FECHA, completar

RUTAS = (('GET', '/sesion'), ('POST', '/acciones/ingresar'), ('GET', '/cuentas/est-ana/actividades'),
         ('GET', '/cuentas/est-ana/avance'), ('GET', '/cuentas/est-ana/resumen'), ('GET', '/cuentas/est-ana/secciones'),
         ('GET', '/cuentas/est-ana/presentaciones'), ('GET', '/cuentas/est-ana/notificaciones'),
         ('GET', '/cuentas/est-ana/conversaciones'))


def _medir(cliente, aplicacion):
    cantidades = []
    for metodo, ruta in RUTAS:
        datos = {'cuenta': 'est-ana', 'fecha_hora': FECHA} if metodo == 'POST' else None
        cliente.request(metodo, ruta, json=datos)
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            respuesta = cliente.request(metodo, ruta, json=datos)
        assert respuesta.status_code in (200, 409), (ruta, respuesta.text)
        cantidades.append((ruta, respuesta.status_code, contador.cantidad))
    return cantidades


def test_una_peticion_vacia_cuesta_una_consulta(cliente, aplicacion):
    cliente.get('/sesion')
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        assert cliente.get('/sesion').status_code == 200
    assert contador.cantidad == 1, contador.diagnostico


def test_el_arranque_no_crece_con_el_historial(cliente, aplicacion):
    completar(cliente, 't-inicio')
    pocos = _medir(cliente, aplicacion)
    fecha = datetime.fromisoformat(FECHA)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        ana = buscar(sesion, m.Cuenta, 'est-ana')
        agregar_eventos(sesion, ana, [('INGRESO', None, fecha)] * 500)
        for n in range(60):
            sesion.add(m.Notificacion(codigo=f'NOT-PRUEBA-{n}', cuenta_id=ana.id, tipo='DESBLOQUEO',
                                      referencia='t-insignia', nombre='DATO DE PRUEBA', creada_en=fecha))
            sesion.add(m.EntradaDiario(cuenta_id=ana.id, origen='LIBRE', numero=900 + n, numero_libre=900 + n,
                                       texto='DATO DE PRUEBA', fecha_hora=fecha))
    assert _medir(cliente, aplicacion) == pocos


def test_escribir_carta_no_crece_con_las_cartas(cliente, aplicacion):
    completar(cliente, 't-inicio')
    medidas = []
    for n in range(8):
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            respuesta = cliente.post('/acciones/escribir-carta', json={
                'cuenta': 'est-ana', 'texto': f'DATO DE PRUEBA carta {n}', 'fecha_hora': FECHA})
        medidas.append((respuesta.status_code, contador.cantidad))
    assert len(set(medidas[2:])) == 1, medidas
