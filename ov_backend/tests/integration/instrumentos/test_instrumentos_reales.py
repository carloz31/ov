"""Ajuste carga-instrumentos: resultado de los instrumentos reales con su lectura y sus cuatro piezas."""

from soporte_ruta import FECHA, avanzar, pedir, revelar


def contestar(cliente, actividad, opcion_de):
    items = pedir(cliente, 'GET', f'/actividades/{actividad}/items')
    pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'respuestas': [{'item': i['codigo'], 'opcion': opcion_de(i['numero'])} for i in items]})
    pedir(cliente, 'POST', '/acciones/completar-actividad', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA})
    return items


def test_habilidades_aplica_los_inversos_y_destaca_las_de_mayor_proporcion(cliente):
    avanzar(cliente)
    # DATO DE PRUEBA: «Casi siempre» (2) en todo salvo el ítem 5, inverso, en «Casi nunca» (1): suma a Liderazgo.
    items = contestar(cliente, 't-mision-habilidades', lambda numero: 1 if numero == 5 else 2)
    # El estudiante ve las opciones de la escala por su orden; el front decide cómo pintarlas.
    assert [(o['orden'], o['etiqueta']) for o in items[0]['escala']['opciones']] == [(1, 'Casi nunca'), (2, 'Casi siempre')]
    revelar(cliente, instrumento='TEST-HABILIDADES')
    resultado = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-HABILIDADES/resultado')
    assert resultado['lectura'].startswith('Este inventario muestra cómo te relacionas')
    numeros = {d['codigo']: (d['puntaje'], d['puntaje_maximo'], d['puntaje_visual']) for d in resultado['dimensiones']}
    # Expresión: los inversos 3 y 8 en «Casi siempre» valen 0. Liderazgo: el 5 en «Casi nunca» vale 1 y el 20, 0.
    assert numeros == {'HS-ASE': (5, 5, 100), 'HS-EMP': (5, 5, 100), 'HS-EXP': (3, 5, 60),
                       'HS-RES': (4, 4, 100), 'HS-LID': (4, 5, 80)}
    assert [d['codigo'] for d in resultado['dimensiones_destacadas']] == ['HS-ASE', 'HS-EMP', 'HS-RES']
    lid = next(d for d in resultado['dimensiones'] if d['codigo'] == 'HS-LID')
    assert lid['ejemplos'] and len(lid['fortalezas']) == 4 and len(lid['desarrollo']) == 3


def test_inteligencias_la_duda_vale_medio_punto(cliente):
    avanzar(cliente)
    # DATO DE PRUEBA: «No estoy seguro» (2) en todo; «Verdadero» (3) en el 9, verbal-lingüística.
    contestar(cliente, 't-mision-inteligencias', lambda numero: 3 if numero == 9 else 2)
    revelar(cliente, instrumento='TEST-INTELIGENCIAS')
    resultado = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-INTELIGENCIAS/resultado')
    lin = next(d for d in resultado['dimensiones'] if d['codigo'] == 'INT-LIN')
    assert (lin['puntaje'], lin['puntaje_maximo'], lin['puntaje_visual']) == (3, 5, 60)
    assert {d['puntaje_visual'] for d in resultado['dimensiones'] if d['codigo'] != 'INT-LIN'} == {50}
    assert [d['codigo'] for d in resultado['dimensiones_destacadas']] == ['INT-LIN']
    assert resultado['lectura'].startswith('Este test muestra qué inteligencias usas más')


def test_riasec_expone_lectura_y_fortalezas_sin_desarrollo(cliente):
    catalogo = {i['codigo']: i for i in pedir(cliente, 'GET', '/instrumentos')}
    riasec = catalogo['TEST-RIASEC']
    assert riasec['lectura'].startswith('Este test mide qué tipo de actividades te atraen')
    assert all(d['ejemplos'] and len(d['fortalezas']) == 4 and d['desarrollo'] == [] for d in riasec['dimensiones'])
    assert set(catalogo) == {'TEST-HABILIDADES', 'TEST-INTELIGENCIAS', 'TEST-PARTIDA-LLEGADA', 'TEST-RIASEC'}
