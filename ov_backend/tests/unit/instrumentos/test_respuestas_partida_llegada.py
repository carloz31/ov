"""Ajuste color-partida-llegada: las únicas definiciones de «respuesta baja», de la dirección de un cambio y de su
clasificación para la orientadora (`calculo.py`, sin base). Escala de cuatro opciones (1 a 4) y dos opciones bajas."""

import pytest

from app.services.instrumentos.calculo import (
    calcular_puntaje_item, cambio_afirmacion, direccion_respuesta, es_respuesta_baja,
)

ESCALA = [1, 2, 3, 4]


def _valor(puntaje, inverso=False):
    return calcular_puntaje_item(puntaje, 1, 4, inverso)


def test_respuesta_baja_con_item_directo_e_inverso():
    assert [es_respuesta_baja(_valor(p), ESCALA, 2) for p in ESCALA] == [True, True, False, False]
    # Inverso: «Muy de acuerdo» (4) con «Me siento perdido…» es baja.
    assert [es_respuesta_baja(_valor(p, inverso=True), ESCALA, 2) for p in ESCALA] == [False, False, True, True]
    # El número de opciones bajas sale del parámetro.
    assert [es_respuesta_baja(_valor(p), ESCALA, 1) for p in ESCALA] == [True, False, False, False]
    assert es_respuesta_baja(4, ESCALA, 9)  # más opciones bajas que la escala: todas


def test_direccion_por_valor():
    assert direccion_respuesta(1, 3) == 'SUBIO'
    assert direccion_respuesta(3, 2) == 'BAJO'
    assert direccion_respuesta(2, 2) is None
    # Inverso que mejora: de «Muy de acuerdo» (valor 1) a «Poco de acuerdo» (valor 3).
    assert direccion_respuesta(_valor(4, inverso=True), _valor(2, inverso=True)) == 'SUBIO'


@pytest.mark.parametrize(('partida', 'llegada', 'esperado'), [
    (3, 2, 'BAJO'),          # bajó
    (2, 2, 'SIGUE_BAJA'),    # sigue baja sin moverse
    (1, 2, 'SIGUE_BAJA'),    # sube y sigue baja: para la orientadora sigue siendo tema
    (2, 4, 'MEJORO'),        # mejoró
    (4, 4, 'IGUAL'),         # igual alta
    (None, 3, None),         # sin respuesta en una aplicación
    (3, None, None),
])
def test_cambio_de_una_afirmacion(partida, llegada, esperado):
    baja = llegada is not None and es_respuesta_baja(llegada, ESCALA, 2)
    assert cambio_afirmacion(partida, llegada, baja) == esperado


def test_cambio_de_un_item_inverso_que_mejora():
    partida, llegada = _valor(4, inverso=True), _valor(1, inverso=True)
    assert cambio_afirmacion(partida, llegada, es_respuesta_baja(llegada, ESCALA, 2)) == 'MEJORO'
