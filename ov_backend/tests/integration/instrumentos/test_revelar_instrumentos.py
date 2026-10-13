"""B06: revelar calcula el resultado y abre el registro de contraste (HU-022 a HU-024 y HU-027)."""

from soporte_ruta import INTERESES, INTERESES_FINAL, actividades, avanzar, completar, filas_base, pedir, responder, revelar
from soporte_retiro import preparar_ultimo, resultado


def avance(cliente, cuenta='est-ana'):
    instrumento, = pedir(cliente, 'GET', f'/cuentas/{cuenta}/instrumentos')
    aplicacion, = instrumento['aplicaciones']
    return aplicacion['estado'], aplicacion['hay_resultado_vigente']


def test_completar_ya_no_calcula_y_nada_es_visible_antes_de_revelar(cliente, aplicacion):
    preparar_ultimo(cliente)
    respuesta = completar(cliente, INTERESES_FINAL)
    assert 'resultados_generados' not in respuesta
    assert [e['tipo'] for e in respuesta['eventos_registrados']] == ['COMPLETA_ACTIVIDAD']
    assert filas_base(aplicacion)['resultado_instrumento'] == []
    assert avance(cliente) == ('COMPLETADO', False)
    assert pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado', esperado=409)
    assert pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/historial') == []
    assert actividades(cliente)['t-contraste'] == 'BLOQUEADA'


def test_revelar_incompleto_responde_409_con_las_misiones_faltantes(cliente, aplicacion):
    avanzar(cliente)
    faltantes = revelar(cliente, esperado=409)['detail']['items_faltantes']
    assert faltantes == [INTERESES, INTERESES_FINAL]
    responder(cliente, INTERESES)
    completar(cliente, INTERESES)
    responder(cliente, INTERESES_FINAL)
    antes = filas_base(aplicacion)
    assert revelar(cliente, esperado=409)['detail']['items_faltantes'] == [INTERESES_FINAL]
    assert filas_base(aplicacion) == antes


def test_revelar_calcula_abre_el_contraste_y_muestra_ambas_vistas(cliente):
    preparar_ultimo(cliente)
    completar(cliente, INTERESES_FINAL)
    respuesta = revelar(cliente)
    assert {k: respuesta[k] for k in ('cuenta', 'instrumento', 'aplicacion', 'perfil_plano')} == {
        'cuenta': 'est-ana', 'instrumento': 'TEST-RIASEC', 'aplicacion': 'APL-RIASEC', 'perfil_plano': False}
    assert [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']] == [('REVELA_RESULTADO', 'APL-RIASEC')]
    assert [(d['regla'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']] == [
        ('R-t-contraste', 't-contraste')]
    assert actividades(cliente)['t-contraste'] == 'DISPONIBLE'
    assert avance(cliente) == ('COMPLETADO', True)
    obtenido = resultado(cliente)
    assert obtenido['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert all(d['descripcion'] for d in obtenido['dimensiones'])
    assert pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{INTERESES}/respuestas')['respuestas']
    pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': INTERESES, 'respuestas': [{'item': 'RIASEC-01', 'opcion': 5}]}, 409)


def test_revelar_dos_veces_responde_409_sin_escribir(cliente, aplicacion):
    preparar_ultimo(cliente)
    completar(cliente, INTERESES_FINAL)
    revelar(cliente)
    antes = filas_base(aplicacion)
    assert revelar(cliente, esperado=409)['detail']['mensaje'] == 'Resultado ya revelado'
    assert filas_base(aplicacion) == antes


def test_revelar_es_solo_del_estudiante_y_de_instrumentos_existentes(cliente):
    preparar_ultimo(cliente)
    completar(cliente, INTERESES_FINAL)
    revelar(cliente, cuenta='apo-rosa', esperado=404)
    revelar(cliente, instrumento='NO-EXISTE', esperado=404)
    revelar(cliente, aplicacion='APL-NO-EXISTE', esperado=404)
    revelar(cliente, cuenta='est-luis', esperado=409)
    assert avance(cliente, 'est-luis') == ('NO_INICIADO', False)
