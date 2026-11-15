"""Auditoría plataforma (sección F): GET planes no crece con los planes, las dudas ni los pasos; guardar-seccion solo
crece en INSERT (SQLite escribe una fila por sentencia; PostgreSQL las agrupa), no en SELECT. DATO DE PRUEBA."""

from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO, PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_planes import abrir_planes, abrir_secciones, crear, guardar


def _medir(cliente, aplicacion, metodo, ruta, datos=None):
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        respuesta = cliente.request(metodo, ruta, json=datos)
    assert respuesta.status_code == 200, respuesta.text
    return contador


def _dudas(n, desde=0):
    return {'dudas': [{'origen': 'PROPIA', 'texto': f'DATO DE PRUEBA duda {desde + i}'} for i in range(n)]}


def _pasos(n):
    return {'pasos': [{'tipo': 'conversar', 'texto': f'DATO DE PRUEBA paso {i}'} for i in range(n)]}


def test_get_planes_no_crece_con_planes_dudas_ni_pasos(cliente, aplicacion):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, PSICOLOGIA)
    cliente.get('/cuentas/est-ana/planes')
    pocos = _medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/planes').cantidad
    for carrera in (PERIODISMO, ENFERMERIA):
        crear(cliente, carrera)
    for carrera in (PSICOLOGIA, PERIODISMO, ENFERMERIA):
        guardar(cliente, carrera, 'CONOCIMIENTO', _dudas(8))
        guardar(cliente, carrera, 'PASOS', _pasos(10))
    muchos = _medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/planes')
    assert muchos.cantidad == pocos, muchos.diagnostico


def test_guardar_seccion_no_crece_en_select_con_dudas_ni_pasos(cliente, aplicacion):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'PASOS')
    crear(cliente, PSICOLOGIA)

    def selects(datos, seccion):
        contador = _medir(cliente, aplicacion, 'POST', '/acciones/planes/guardar-seccion', {
            'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'seccion': seccion, 'datos': datos})
        return contador.por_tipo.get('SELECT', 0)

    una = selects(_dudas(1), 'CONOCIMIENTO')
    assert selects(_dudas(8, desde=1), 'CONOCIMIENTO') == una
    # El primer guardado de PASOS lee una vez más (rama); después, 1, 10 o 20 pasos leen lo mismo.
    selects(_pasos(1), 'PASOS')
    assert selects(_pasos(10), 'PASOS') == selects(_pasos(1), 'PASOS')
