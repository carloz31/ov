"""B07: zona de una dimensión de partida o llegada según su promedio (umbrales inclusivos)."""

import pytest

from app.services.instrumentos.calculo import calcular_zona


@pytest.mark.parametrize('puntaje, cantidad, zona', [
    (14, 4, 'FUERTE'),        # 3,5: borde inclusivo
    (16, 4, 'FUERTE'),
    (13.96, 4, 'EN_CAMINO'),
    (10, 4, 'EN_CAMINO'),     # 2,5: borde inclusivo
    (9.96, 4, 'POR_TRABAJAR'),
    (3, 3, 'POR_TRABAJAR'),
    (10, 3, 'EN_CAMINO'),     # 3,33…
])
def test_zona_por_promedio_con_bordes_inclusivos(puntaje, cantidad, zona):
    assert calcular_zona(puntaje, cantidad) == zona


@pytest.mark.parametrize('puntaje, cantidad', [(4, 0), (4, -1), (float('nan'), 2), (4, True), (4, 2.0)])
def test_zona_rechaza_entradas_invalidas(puntaje, cantidad):
    with pytest.raises(ValueError):
        calcular_zona(puntaje, cantidad)
