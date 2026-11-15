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
        assert dimension.get('puntaje') is None and dimension.get('puntaje_visual') is None
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
    # A tiene un ítem inverso: 2, 2, 2 y 5 − 2 = 3 dan 2,25, el borde de En camino (umbrales 2,25 y 3,25).
    assert [(d['codigo'], d['tematica'], d['zona']) for d in resultado['dimensiones']] == [
        ('AUTO-A', 'A', 'EN_CAMINO'), ('AUTO-B', 'B', 'POR_TRABAJAR'), ('AUTO-C', 'C', 'POR_TRABAJAR'),
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
        # A en la llegada: 4, 4, 4 y el inverso 5 − 4 = 1 dan 3,25, el borde de Fuerte.
        ('AUTO-A', 'A', 'EN_CAMINO', 'FUERTE', 1), ('AUTO-B', 'B', 'EN_CAMINO', 'FUERTE', 2),
        ('AUTO-C', 'C', 'EN_CAMINO', 'FUERTE', 0), ('AUTO-D', 'D', 'EN_CAMINO', 'FUERTE', 0),
        ('AUTO-E', 'E', 'EN_CAMINO', 'FUERTE', 0)]
    assert [len(d['items']) for d in comparacion['dimensiones']] == [4, 4, 4, 4, 3]
    primero = comparacion['dimensiones'][0]['items'][0]
    # Ajuste color-partida-llegada: se suma `direccion` (por valor, inversos ya invertidos); lo demás no cambia.
    assert primero == {'item': 'AUTO-01', 'enunciado': primero['enunciado'], 'partida': 'Bastante de acuerdo',
                       'llegada': 'Muy de acuerdo', 'cambio': True, 'direccion': 'SUBIO'}
    ultimo = comparacion['dimensiones'][-1]['items'][-1]
    assert (ultimo['item'], ultimo['partida'], ultimo['llegada'], ultimo['cambio'], ultimo['direccion']) == (
        'AUTO-19', 'Bastante de acuerdo', 'Bastante de acuerdo', False, None)
    # AUTO-04 es inverso: de «Bastante» a «Muy de acuerdo» es bajar.
    inverso = next(i for d in comparacion['dimensiones'] for i in d['items'] if i['item'] == 'AUTO-04')
    assert inverso['direccion'] == 'BAJO'
    # Otro estudiante no ve la comparación de Ana.
    pedir(cliente, 'GET', f'/cuentas/est-luis/instrumentos/{INSTRUMENTO}/comparacion', esperado=409)
    pedir(cliente, 'GET', f'/cuentas/apo-rosa/instrumentos/{INSTRUMENTO}/comparacion', esperado=404)


def test_respuestas_de_partida_con_la_marca_de_baja_del_panel(cliente, sesion):
    """Ajuste color-partida-llegada §3.2: la misma marca que la orientadora, del mismo parámetro; nula en RIASEC."""
    from sqlalchemy import update

    from app import models as m
    completar(cliente, 't-inicio')
    # AUTO-04 es inverso: «Muy de acuerdo» es baja.
    responder_partida(cliente, 't-partida', 3, {'AUTO-01': 1, 'AUTO-02': 2, 'AUTO-04': 4})
    revelar(cliente, instrumento=INSTRUMENTO, aplicacion='APL-PARTIDA')
    respuestas = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-partida/respuestas')['respuestas']
    bajas = {r['item'] for r in respuestas if r['baja']}
    assert bajas == {'AUTO-01', 'AUTO-02', 'AUTO-04'} and all(r['baja'] is not None for r in respuestas)
    assert {'item', 'opcion', 'creada_en', 'actualizada_en'} <= set(respuestas[0])
    detalle = pedir(cliente, 'GET', '/cuentas/ori-carmen/panel/estudiantes/est-ana/tests/partida-llegada')
    assert {a['item'] for d in detalle['dimensiones'] for a in d['afirmaciones'] if a['partida_baja']} == bajas
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_OPCIONES_BAJAS').values(valor='1'))
    sesion.commit()
    respuestas = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-partida/respuestas')['respuestas']
    assert {r['item'] for r in respuestas if r['baja']} == {'AUTO-01', 'AUTO-04'}
    from soporte_retiro import ciclo
    ciclo(cliente, opcion=3)
    riasec = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-mision-intereses/respuestas')['respuestas']
    assert riasec and all(r['baja'] is None for r in riasec)
