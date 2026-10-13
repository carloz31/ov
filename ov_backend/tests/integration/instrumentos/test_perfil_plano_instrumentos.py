"""B06 · HU-095: el test de intereses se repite solo con perfil plano, y una vez."""

from soporte_ruta import INTERESES, INTERESES_FINAL, MISIONES_INTERESES, actividades, completar, filas_base, pedir, responder, revelar
from soporte_retiro import ciclo, reiniciar


def test_reinicio_con_perfil_plano_procede_una_vez(cliente, aplicacion):
    assert ciclo(cliente, opcion=3)['perfil_plano'] is True
    reinicio = reiniciar(cliente)
    assert reinicio['resultado_anulado']['aplicacion'] == 'APL-RIASEC'
    assert reinicio['actividades_reiniciadas'] == list(MISIONES_INTERESES)
    assert [e['tipo'] for e in reinicio['eventos_registrados']] == ['REINICIA_INSTRUMENTO']
    assert {a: actividades(cliente)[a] for a in MISIONES_INTERESES} == dict.fromkeys(MISIONES_INTERESES, 'EN_CURSO')
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    # Para tener de nuevo un resultado hay que completar y revelar otra vez.
    for mision in MISIONES_INTERESES:
        responder(cliente, mision, opcion=3)
        completar(cliente, mision)
    pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    assert revelar(cliente)['perfil_plano'] is True
    antes = filas_base(aplicacion)
    assert reiniciar(cliente, esperado=409)['detail']['mensaje'] == 'Ya usaste el reinicio de este cuestionario'
    assert filas_base(aplicacion) == antes


def test_sin_perfil_plano_o_sin_revelar_no_hay_reinicio(cliente, aplicacion):
    ciclo(cliente, opcion=3, cuenta='est-luis')
    ciclo(cliente)
    antes = filas_base(aplicacion)
    assert reiniciar(cliente, esperado=409)['detail']['mensaje'] == (
        'Solo se puede reiniciar un resultado revelado con perfil plano')
    assert filas_base(aplicacion) == antes
    reiniciar(cliente, cuenta='est-luis')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision, cuenta='est-luis', opcion=3)
        completar(cliente, mision, cuenta='est-luis')
    antes = filas_base(aplicacion)
    reiniciar(cliente, cuenta='est-luis', esperado=409)
    assert filas_base(aplicacion) == antes


def test_el_tope_es_por_cuenta(cliente):
    ciclo(cliente, opcion=3)
    reiniciar(cliente)
    ciclo(cliente, opcion=3, cuenta='est-luis')
    assert reiniciar(cliente, cuenta='est-luis')['resultado_anulado'] is not None
    responder(cliente, INTERESES, opcion=3)
    completar(cliente, INTERESES)
    responder(cliente, INTERESES_FINAL, opcion=3)
    completar(cliente, INTERESES_FINAL)
    revelar(cliente)
    reiniciar(cliente, esperado=409)
