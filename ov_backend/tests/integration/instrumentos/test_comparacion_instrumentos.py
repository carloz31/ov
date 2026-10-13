"""R27–R28: comparación por momentos y reinicio de salida (B07: la comparación exige ambas reveladas)."""

from app import models as m
from soporte_ruta import filas_base, pedir, revelar
from soporte_retiro import buscar, contestar_minimo, instrumento_minimo, reiniciar


def test_r27_comparacion_generica_sin_resultado_y_momentos_requeridos(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        entrada, salida = instrumento_minimo(sesion, 'COMPARACION')
    ruta = '/cuentas/est-ana/instrumentos/TEST-PRUEBA/comparacion'
    pedir(cliente, 'GET', ruta, esperado=409)
    for actividad, opciones in [(entrada, [1, 2, 3]), (salida, [4, 3, 5])]:
        contestar_minimo(cliente, actividad, opciones)
    # B07: sin dimensiones no hay resultado que revelar, y sin revelar no hay comparación.
    revelar(cliente, instrumento='TEST-PRUEBA', aplicacion='APL-PRUEBA-SALIDA', esperado=409)
    pedir(cliente, 'GET', ruta, esperado=409)
    assert filas_base(aplicacion)['resultado_instrumento'] == []
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/comparacion', esperado=404)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        buscar(sesion, m.Aplicacion, 'APL-PRUEBA-SALIDA').momento = 'UNICA'
    pedir(cliente, 'GET', ruta, esperado=422)


def test_r28_reiniciar_salida_conserva_entrada_y_exige_seleccion(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        entrada, salida = instrumento_minimo(sesion, 'COMPARACION')
    for actividad in (entrada, salida):
        contestar_minimo(cliente, actividad)
    antes = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{entrada}/respuestas')
    reiniciar(cliente, instrumento='TEST-PRUEBA', esperado=422)
    # B06: una COMPARACION no tiene perfil plano, así que no se reinicia.
    base = filas_base(aplicacion)
    reiniciar(cliente, instrumento='TEST-PRUEBA', seleccion='APL-PRUEBA-SALIDA', esperado=409)
    assert filas_base(aplicacion) == base
    assert pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{entrada}/respuestas') == antes
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-PRUEBA/comparacion', esperado=409)
