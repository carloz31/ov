"""B07: zona de una dimensión de partida o llegada según su promedio (umbrales inclusivos, inversos ya invertidos):
Fuerte desde 3,25; En camino desde 2,25; Por trabajar debajo."""

import pytest

from app.services.instrumentos.calculo import calcular_zona


@pytest.mark.parametrize('valores, zona', [
    ((3, 3, 1), 'EN_CAMINO'),
    ((3, 2, 2), 'EN_CAMINO'),
    ((3, 2, 1), 'POR_TRABAJAR'),
    ((4, 3, 3), 'FUERTE'),
    ((3, 3, 2, 1), 'EN_CAMINO'),
    ((2, 2, 2, 2), 'POR_TRABAJAR'),
    ((3, 3, 3, 3), 'EN_CAMINO'),
    ((4, 3, 3, 3), 'FUERTE'),
])
def test_zona_de_los_bordes_acordados(valores, zona):
    assert calcular_zona(sum(valores), len(valores)) == zona


@pytest.mark.parametrize('puntaje, cantidad, zona', [
    (13, 4, 'FUERTE'),        # 3,25: borde inclusivo
    (16, 4, 'FUERTE'),
    (12.96, 4, 'EN_CAMINO'),
    (9, 4, 'EN_CAMINO'),      # 2,25: borde inclusivo
    (8.96, 4, 'POR_TRABAJAR'),
    (3, 3, 'POR_TRABAJAR'),
    (10, 3, 'FUERTE'),        # 3,33…
])
def test_zona_por_promedio_con_bordes_inclusivos(puntaje, cantidad, zona):
    assert calcular_zona(puntaje, cantidad) == zona


@pytest.mark.parametrize('puntaje, cantidad', [(4, 0), (4, -1), (float('nan'), 2), (4, True), (4, 2.0)])
def test_zona_rechaza_entradas_invalidas(puntaje, cantidad):
    with pytest.raises(ValueError):
        calcular_zona(puntaje, cantidad)
