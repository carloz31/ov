"""Ajuste resultados-intereses: lo que el catálogo deriva del test de intereses del estudiante."""

from soporte_retiro import ciclo, resultado
from soporte_ruta import pedir


def test_el_catalogo_marca_afinidad_y_familia_recomendada_solo_al_estudiante(cliente):
    ciclo(cliente)
    propio = resultado(cliente)
    afin, primera = propio['ocupaciones'][0], propio['familias'][0]
    base = '/cuentas/est-ana/catalogo'
    detalle = pedir(cliente, 'GET', f'{base}/ocupaciones/{afin["codigo"]}')
    assert detalle['afinidad'] == {'parecido': afin['parecido'], 'banda': afin['banda']}
    ficha = pedir(cliente, 'GET', f'{base}/familias/{primera["codigo"]}')
    assert ficha['recomendada_posicion'] == 1
    assert ficha['ocupaciones_principales'] == primera['total_ocupaciones']
    familia = pedir(cliente, 'GET', f'{base}/ocupaciones?familia={primera["codigo"]}&limite=50')
    principales = {o['codigo'] for o in familia['items'] if o['via_familia'] == 'PRINCIPAL'}
    assert {o['codigo'] for o in primera['ocupaciones']} <= principales
    # El apoderado ve el mismo catálogo sin lo del test.
    apoderado = '/cuentas/apo-rosa/catalogo'
    assert pedir(cliente, 'GET', f'{apoderado}/ocupaciones/{afin["codigo"]}')['afinidad'] is None
    assert pedir(cliente, 'GET', f'{apoderado}/familias/{primera["codigo"]}')['recomendada_posicion'] is None


def test_sin_resultado_no_hay_afinidades(cliente):
    ciclo(cliente, opcion=3)
    base = '/cuentas/est-ana/catalogo'
    assert pedir(cliente, 'GET', f'{base}/ocupaciones/psychologist')['afinidad'] is None
    assert pedir(cliente, 'GET', f'{base}/familias/313')['recomendada_posicion'] is None
