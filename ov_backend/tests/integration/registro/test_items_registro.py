"""Ítems de registro con su elección, leídos de la caché de definiciones."""

from soporte_ruta import pedir


def test_items_en_orden_con_lista_comun_propia_y_sin_eleccion(cliente):
    items = pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')
    assert [item['codigo'] for item in items] == ['t-exp-ruta', 't-exp-apoyo', 't-exp-espera']
    ruta, apoyo, espera = (item['eleccion'] for item in items)
    assert {clave: ruta[clave] for clave in ('lista', 'comun', 'minima', 'maxima', 'ordenada', 'permite_otra')} == {
        'lista': 'RUTAS_DESPUES_COLEGIO', 'comun': True, 'minima': 1, 'maxima': 2, 'ordenada': False,
        'permite_otra': True}
    assert ruta['opciones'][0] == {'codigo': 'UNIVERSIDAD', 'texto': 'Estudiar en una universidad'}
    assert apoyo['lista'] == 't-lista-apoyos' and not apoyo['comun'] and len(apoyo['opciones']) == 3
    assert espera is None and items[2]['min_caracteres'] is None
    breve = pedir(cliente, 'GET', '/actividades/t-valores/items-registro')[2]
    assert breve['codigo'] == 't-val-breve' and breve['min_caracteres'] == 40 and breve['eleccion'] is None
    assert all('nucleo' not in item and 'criterios' not in item for item in items)


def test_registro_de_apoderado_y_actividad_ajena_responden_404(cliente):
    pedir(cliente, 'GET', '/cuentas/apo-rosa/actividades/t-expectativas/registro', esperado=404)
    pedir(cliente, 'GET', '/actividades/t-apo-1/items-registro', esperado=404)
