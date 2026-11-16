"""Ajuste respuestas-orientadora: la pestaña Respuestas sobre los ejemplos del panel (`scripts/sembrar_panel_ejemplo.py`,
casos 5, 6 y 7): grupos y orden ya armados, marcas, «Destacados» con las sensibles, ecos resueltos (mismo registro,
planes, eco que no cambió) y el enlace de los avisos y temas al registro y la pregunta."""

import pytest

BASE = '/cuentas/ori-carmen/panel/estudiantes'
ORDEN_GRUPOS = ['TRAMO', 'OPCIONALES', 'AUN_NO_LLEGA']
ORDEN_MARCAS = ['REQUIERE_ATENCION', 'SIN_CONTENIDO', None]


@pytest.fixture(scope='module')
def ejemplos(plantilla_contenido, tmp_path_factory):
    from app.main import crear_aplicacion
    from soporte_acceso import ClienteConToken
    from soporte_bases import copiar_plantilla
    from soporte_llm import ClientePrueba
    from soporte_panel import sembrar_ejemplo
    aplicacion = crear_aplicacion(copiar_plantilla(
        plantilla_contenido, tmp_path_factory.mktemp('panel-respuestas') / 'contenido.db'))
    aplicacion.state.cliente_llm = ClientePrueba()
    sembrar_ejemplo(aplicacion)
    try:
        with ClienteConToken(aplicacion) as cliente:
            yield cliente
    finally:
        aplicacion.state.motor_bd.dispose()


def _get(cliente, ruta):
    respuesta = cliente.get(f'{BASE}/{ruta}')
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def _fila(datos, actividad):
    return next(f for f in datos['registros'] if f['actividad'] == actividad)


def test_grupos_en_orden_y_marcas_por_fila(ejemplos):
    datos = _get(ejemplos, 'est-panel-5/respuestas')
    filas = datos['registros']
    # Tramos, luego misiones opcionales iniciadas, luego «Aún no llega»; cada grupo seguido.
    grupos = [f['grupo'] for f in filas]
    assert grupos == sorted(grupos, key=ORDEN_GRUPOS.index)
    tramos = [f['tramo_numero'] for f in filas if f['grupo'] == 'TRAMO']
    assert tramos == sorted(tramos)
    assert all((f['grupo'] == 'AUN_NO_LLEGA') == (f['estado'] == 'AUN_NO_LLEGA') for f in filas)
    # Dentro de cada tramo: requiere atención, sin contenido y el resto.
    for numero in set(tramos):
        marcas = [f['marca'] for f in filas if f['grupo'] == 'TRAMO' and f['tramo_numero'] == numero]
        assert marcas == sorted(marcas, key=ORDEN_MARCAS.index)
    assert (_fila(datos, 'b1-3')['marca'], _fila(datos, 'b1-3')['sin_contenido']) == ('SIN_CONTENIDO', 1)
    assert (_fila(datos, 'b1-7')['marca'], _fila(datos, 'b1-7')['sin_contenido']) == ('SIN_CONTENIDO', 1)
    # b1-7 va antes que los registros sin marca de su tramo, aunque esté después en el camino.
    tramo = [f['actividad'] for f in filas if f['tramo_numero'] == _fila(datos, 'b1-7')['tramo_numero']
             and f['grupo'] == 'TRAMO']
    assert tramo.index('b1-7') < len([f for f in tramo if _fila(datos, f)['marca']])
    # Sin contenido no tiene excepción: b1-7 no es destacado y no se ve en «Destacados».
    assert _fila(datos, 'b1-7')['en_destacados'] is False
    assert (datos['por_revisar_todos'], datos['por_revisar_destacados']) == (2, 1)
    assert datos['total_destacados'] == sum(f['destacado'] for f in filas)
    assert datos['leer_primero'] == []


def test_una_sensible_se_ve_en_destacados_aunque_no_sea_destacado(ejemplos):
    datos = _get(ejemplos, 'est-panel-6/respuestas')
    uno, tres = _fila(datos, 'b1-1'), _fila(datos, 'b1-3')
    assert (uno['destacado'], uno['en_destacados'], uno['marca']) == (False, True, 'REQUIERE_ATENCION')
    assert (tres['destacado'], tres['en_destacados'], tres['marca']) == (True, True, 'REQUIERE_ATENCION')
    assert datos['total_destacados'] == sum(f['destacado'] for f in datos['registros']) + 1
    assert {r['actividad'] for r in datos['leer_primero']} == {'b1-1', 'b1-3'}
    assert datos['por_revisar_destacados'] == datos['por_revisar_todos'] == 2


def test_marcas_de_cada_pregunta(ejemplos):
    futuro = {i['numero']: i for i in _get(ejemplos, 'est-panel-5/respuestas/b1-7')['items']}
    assert futuro[1]['aun_no_lo_sabe'] is True and futuro[1]['marca'] is None
    assert futuro[2]['marca'] == 'FUERA_DE_TEMA'
    voces = _get(ejemplos, 'est-panel-5/respuestas/b1-3')['items']
    assert [i['marca'] for i in voces].count('VACIA') == 1
    sensible = _get(ejemplos, 'est-panel-6/respuestas/b1-3')['items'][0]
    assert sensible['marca'] == 'REQUIERE_ATENCION'


def test_eco_del_mismo_registro_no_repite_ni_se_marca_cambiado(ejemplos):
    """El error de §3.4: la pregunta 1 de «Las voces y la mía» pasó a sensible después de responder la 3; lo que
    tenía a la vista no cambió de valor, así que no hay «hoy»."""
    tercera = _get(ejemplos, 'est-panel-6/respuestas/b1-3')['items'][2]
    eco, = tercera['ecos']
    assert (eco['fuente'], eco['numeros'], eco['hoy'], eco['cita'], eco['opciones']) == (
        'MISMO_REGISTRO', [1, 2], None, None, [])


def test_eco_de_planes_con_el_plan_que_cambio(ejemplos):
    item = _get(ejemplos, 'est-panel-7/respuestas/b4-5')['items'][0]
    eco, = [e for e in item['ecos'] if e['fuente'] == 'PLANES']
    assert [p['letra'] for p in eco['planes']] == ['A', 'B']
    antes = {p['letra']: (p['carrera'], p['institucion']) for p in eco['planes']}
    assert eco['hoy'] and eco['hoy']['planes']
    assert all(antes[p['letra']] != (p['carrera'], p['institucion']) for p in eco['hoy']['planes'])
    # El caso 5 no cambió de planes: sin «hoy».
    cinco = _get(ejemplos, 'est-panel-5/respuestas/b4-5')['items'][0]
    assert all(e['hoy'] is None for e in cinco['ecos'])


def test_aviso_y_tema_llevan_al_registro_y_la_pregunta(ejemplos):
    perfil = _get(ejemplos, 'est-panel-6')
    aviso = next(a for g in perfil['avisos'] for a in g['avisos'] if a['codigo'] == 'respuesta-sensible')
    assert aviso['respuesta'] == {'actividad': 'b1-3', 'item': 'b1-3-voz'}
    siete = _get(ejemplos, 'est-panel-7')
    tema = next(t for t in siete['temas'] if t['codigo'] == 'voces-chocan')
    assert tema['respuesta'] == {'actividad': 'b1-3', 'item': 'b1-3-contraste'}
    assert all(t['respuesta'] is None for t in siete['temas'] if t['destino'] != 'RESPUESTAS')
