"""R17, R20 y R22: edición, historia y reinicio selectivo."""

from soporte_datos_ports import preparar_respuesta_ajena
from soporte_ruta import INTERESES, INTERESES_FINAL, MISIONES_INTERESES, actividades, avanzar, completar, filas_base, pedir, responder, revelar
from soporte_retiro import ciclo, reiniciar, resultado


def test_r17_editar_hasta_resultado_y_repetir_sin_recalcular(cliente, aplicacion):
    avanzar(cliente)
    responder(cliente, INTERESES)
    completar(cliente, INTERESES)
    responder(cliente, INTERESES, opcion=1)
    assert actividades(cliente)[INTERESES] == 'COMPLETADA'
    assert all(r['opcion']['orden'] == 1 for r in pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{INTERESES}/respuestas')['respuestas'])
    responder(cliente, INTERESES_FINAL)
    completar(cliente, INTERESES_FINAL)
    revelar(cliente)
    obtenido = resultado(cliente)
    antes = filas_base(aplicacion)
    datos = {'cuenta': 'est-ana', 'actividad': INTERESES, 'respuestas': [{'item': 'RIASEC-01', 'opcion': 5}]}
    pedir(cliente, 'POST', '/acciones/responder-items', datos, 409)
    assert filas_base(aplicacion) == antes
    assert [e['tipo'] for e in completar(cliente, INTERESES_FINAL)['eventos_registrados']] == ['COMPLETA_ACTIVIDAD']
    revelar(cliente, esperado=409)
    assert resultado(cliente) == obtenido
    assert filas_base(aplicacion)['resultado_instrumento'] == antes['resultado_instrumento']


def test_r20_ciclos_planos_historial_vigentes_y_otra_cuenta(cliente, aplicacion):
    ciclo(cliente, cuenta='est-luis')
    ajeno = resultado(cliente, cuenta='est-luis')
    ciclo(cliente, opcion=3)
    grants = filas_base(aplicacion)['desbloqueo']
    # B06: el perfil plano se reinicia una sola vez (MAXIMO_REINICIOS_PERFIL_PLANO).
    for n in range(2):
        historial = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/historial')
        assert len(historial) == n+1 and sum(r['anulado_en'] is None for r in historial) == 1
        assert all(r['perfil_plano'] and r['coincidencias'] == [] for r in historial)
        assert resultado(cliente, cuenta='est-luis') == ajeno
        if n == 0:
            reinicio = reiniciar(cliente)
            assert reinicio['resultado_anulado'] is not None
            assert reinicio['actividades_reiniciadas'] == list(MISIONES_INTERESES)
            pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
            ciclo(cliente, opcion=3, abrir=False)
    assert filas_base(aplicacion)['desbloqueo'] == grants
    antes = filas_base(aplicacion)
    reiniciar(cliente, esperado=409)
    assert filas_base(aplicacion) == antes


def test_r22_reinicio_parcial_conserva_respuesta_ajena_y_no_abre(cliente, aplicacion):
    avanzar(cliente)
    responder(cliente, INTERESES, fin=2)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        preparar_respuesta_ajena(sesion)
    antes = filas_base(aplicacion)
    estados = actividades(cliente)
    # B06: sin resultado revelado con perfil plano no hay reinicio, ni siquiera parcial.
    reiniciar(cliente, esperado=409)
    assert filas_base(aplicacion) == antes
    assert actividades(cliente) == estados
    assert actividades(cliente)[INTERESES_FINAL] == 'BLOQUEADA'
