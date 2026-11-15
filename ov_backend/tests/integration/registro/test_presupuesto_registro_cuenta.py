"""Auditoría plataforma (sección F): GET registro, responder y entregar no crecen con los datos de la cuenta (planes,
eventos, diario). Con la definición del registro crecen, con tope: lo fija `test_techo_registros_contenido.py`.
DATO DE PRUEBA."""

from datetime import datetime

from app import models as m
from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO, PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_planes import abrir_secciones, crear
from soporte_retiro import agregar_eventos, buscar
from soporte_ruta import FECHA, avanzar, eleccion_minima, item_de, leer_registro, responder_item, terminar

ACTIVIDAD = 't-expectativas'


def _medir(cliente, aplicacion):
    with ContadorConsultas(aplicacion.state.motor_bd) as lectura:
        registro = cliente.get(f'/cuentas/est-ana/actividades/{ACTIVIDAD}/registro').json()
    item = registro['items'][0]
    with ContadorConsultas(aplicacion.state.motor_bd) as respuesta:
        responder_item(cliente, ACTIVIDAD, item['codigo'], eleccion_minima(item), 'DATO DE PRUEBA: otra edición')
    with ContadorConsultas(aplicacion.state.motor_bd) as entrega:
        terminar(cliente, ACTIVIDAD)
    return lectura.cantidad, respuesta.cantidad, entrega.cantidad


def test_registro_no_crece_con_los_datos_de_la_cuenta(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    registro = leer_registro(cliente, ACTIVIDAD)
    while registro['item_actual'] is not None:
        item = item_de(registro, registro['item_actual'])
        registro = responder_item(cliente, ACTIVIDAD, item['codigo'], eleccion_minima(item))['registro']
    terminar(cliente, ACTIVIDAD)
    _medir(cliente, aplicacion)
    pocos = _medir(cliente, aplicacion)
    abrir_secciones(cliente, 'CONOCIMIENTO')
    for carrera in (PSICOLOGIA, PERIODISMO, ENFERMERIA):
        crear(cliente, carrera)
    fecha = datetime.fromisoformat(FECHA)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        ana = buscar(sesion, m.Cuenta, 'est-ana')
        agregar_eventos(sesion, ana, [('INGRESO', None, fecha)] * 300)
        for n in range(40):
            sesion.add(m.EntradaDiario(cuenta_id=ana.id, origen='LIBRE', numero=500 + n, numero_libre=500 + n,
                                       texto='DATO DE PRUEBA', fecha_hora=fecha))
    _medir(cliente, aplicacion)
    assert _medir(cliente, aplicacion) == pocos
