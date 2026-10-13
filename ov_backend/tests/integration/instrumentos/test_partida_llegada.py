"""B07 · HU-094: partida y llegada se revelan por aplicación, con zonas en palabras y comparación por dimensión."""

import json

from soporte_ruta import FECHA, MISIONES_INTERESES, avanzar, completar, pedir, responder, revelar


INSTRUMENTO = 'TEST-PARTIDA-LLEGADA'
RUTA = f'/cuentas/est-ana/instrumentos/{INSTRUMENTO}'


def responder_partida(cliente, actividad, opcion, distintas=None):
    responder(cliente, actividad, opcion=opcion)
    if distintas:
        pedir(cliente, 'POST', '/acciones/responder-items', {
            'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
            'respuestas': [{'item': item, 'opcion': o} for item, o in distintas.items()]})
    return completar(cliente, actividad)


def sin_numeros(datos):
    """Ninguna clave de puntaje con valor; las zonas van en palabras."""
    texto = json.dumps(datos)
    assert '"diferencia"' not in texto
    for dimension in datos.get('dimensiones', []):
        assert dimension.get('puntaje') is None and dimension.get('porcentaje') is None
        assert dimension.get('puntaje_maximo') is None


def abrir_llegada(cliente):
    """Partida toda en «Bastante de acuerdo» (3, la de `completar`); T1 cerrado con t-expectativas (A y B) y la misión de intereses (B) completada."""
    avanzar(cliente)
    revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-PARTIDA')
    # B07 · F3: el 5A tiene el RIASEC como prioritario, requisito de T2.
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    revelar(cliente)


def test_partida_se_revela_con_zonas_en_palabras(cliente):
    completar(cliente, 't-inicio')
    responder(cliente, 't-partida', opcion=2, fin=5)
    revelar(cliente, instrumento=INSTRUMENTO, esperado=422)
    rechazo = revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-PARTIDA', esperado=409)['detail']
    assert rechazo['items_faltantes'] == ['t-partida']
    responder_partida(cliente, 't-partida', 2)
    revelado = revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-PARTIDA')
    assert revelado['perfil_plano'] is False
    assert [(e['tipo'], e['referencia']) for e in revelado['eventos_registrados']] == [('REVELA_RESULTADO', 'APL-PARTIDA')]
    resultado = pedir(cliente, 'GET', f'{RUTA}/resultado?aplicacion=APL-PARTIDA')
    sin_numeros(resultado)
    # A tiene un ítem inverso: 2, 2, 2 y 5 − 2 = 3 dan 2,25.
    assert [(d['codigo'], d['tematica'], d['zona']) for d in resultado['dimensiones']] == [
        ('AUTO-A', 'A', 'POR_TRABAJAR'), ('AUTO-B', 'B', 'POR_TRABAJAR'), ('AUTO-C', 'C', 'POR_TRABAJAR'),
        ('AUTO-D', 'D', 'POR_TRABAJAR'), ('AUTO-E', 'E', 'POR_TRABAJAR')]
    pedir(cliente, 'GET', f'{RUTA}/resultado?aplicacion=APL-LLEGADA', esperado=409)
    revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-PARTIDA', esperado=409)
    historial, = pedir(cliente, 'GET', f'{RUTA}/historial')
    sin_numeros(historial)
    # Las respuestas quedan fijas y no hay reinicio: no es perfil plano.
    pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': 't-partida', 'fecha_hora': FECHA,
        'respuestas': [{'item': 'AUTO-01', 'opcion': 4}]}, esperado=409)
    pedir(cliente, 'POST', '/acciones/reiniciar-instrumento', {
        'cuenta': 'est-ana', 'instrumento': INSTRUMENTO, 'aplicacion': 'APL-PARTIDA'}, esperado=409)


def test_comparacion_por_dimension_con_items_y_actividades_de_la_tematica(cliente):
    pedir(cliente, 'GET', f'{RUTA}/comparacion', esperado=409)
    abrir_llegada(cliente)
    pendiente = pedir(cliente, 'GET', f'{RUTA}/comparacion', esperado=409)['detail']
    assert pendiente['mensaje'] == 'Revela tu punto de partida y tu punto de llegada para compararlos'
    # Llegada toda en «Muy de acuerdo» (4), salvo AUTO-19, que se mantiene en 3.
    responder_partida(cliente, 't-llegada', 4, {'AUTO-19': 3})
    pedir(cliente, 'GET', f'{RUTA}/comparacion', esperado=409)
    revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-LLEGADA')
    comparacion = pedir(cliente, 'GET', f'{RUTA}/comparacion')
    sin_numeros(comparacion)
    assert (comparacion['partida'], comparacion['llegada']) == ('APL-PARTIDA', 'APL-LLEGADA')
    assert [(d['codigo'], d['tematica'], d['zona_partida'], d['zona_llegada'], d['actividades_completadas'])
            for d in comparacion['dimensiones']] == [
        ('AUTO-A', 'A', 'EN_CAMINO', 'EN_CAMINO', 1), ('AUTO-B', 'B', 'EN_CAMINO', 'FUERTE', 2),
        ('AUTO-C', 'C', 'EN_CAMINO', 'FUERTE', 0), ('AUTO-D', 'D', 'EN_CAMINO', 'FUERTE', 0),
        ('AUTO-E', 'E', 'EN_CAMINO', 'FUERTE', 0)]
    assert [len(d['items']) for d in comparacion['dimensiones']] == [4, 4, 4, 4, 3]
    primero = comparacion['dimensiones'][0]['items'][0]
    assert primero == {'item': 'AUTO-01', 'enunciado': primero['enunciado'], 'partida': 'Bastante de acuerdo',
                       'llegada': 'Muy de acuerdo', 'cambio': True}
    ultimo = comparacion['dimensiones'][-1]['items'][-1]
    assert (ultimo['item'], ultimo['partida'], ultimo['llegada'], ultimo['cambio']) == (
        'AUTO-19', 'Bastante de acuerdo', 'Bastante de acuerdo', False)
    # Otro estudiante no ve la comparación de Ana.
    pedir(cliente, 'GET', f'/cuentas/est-luis/instrumentos/{INSTRUMENTO}/comparacion', esperado=409)
    pedir(cliente, 'GET', f'/cuentas/apo-rosa/instrumentos/{INSTRUMENTO}/comparacion', esperado=404)
