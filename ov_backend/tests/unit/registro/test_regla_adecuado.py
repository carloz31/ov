"""Ajuste registros llm (lote 3), §6: la regla de adecuado por registro, sin base."""

from types import SimpleNamespace

import pytest

from app.models.enums import EstadoRespuestaRegistro as E
from app.services.registro.flujo import registro_adecuado


def item(numero, obligatorio=True):
    return SimpleNamespace(id=numero, obligatorio=obligatorio)


def intento(tipo='propio', estado=E.CERRADO, sensible=False):
    return SimpleNamespace(tipo_final=tipo, estado=estado, sensible=sensible)


ITEMS = [item(1), item(2), item(3)]


def adecuado(*intentos, items=ITEMS):
    return registro_adecuado(items, dict(enumerate(intentos, start=1)))


def test_propio_general_emocional_y_sensible_cuentan():
    assert adecuado(intento('propio'), intento('general'), intento('emocional'))
    assert adecuado(intento('propio'), intento('vacio', sensible=True), intento('fuera_de_tema', sensible=True))


def test_un_abierto_vale_y_dos_no():
    assert adecuado(intento('no_sabe', E.ABIERTO), intento(), intento())
    assert not adecuado(intento('no_sabe', E.ABIERTO), intento('no_sabe', E.ABIERTO), intento())


def test_un_sensible_nunca_cuenta_como_abierto():
    assert adecuado(intento('no_sabe', E.ABIERTO), intento('no_sabe', sensible=True), intento())


@pytest.mark.parametrize('malo', [intento('vacio'), intento('fuera_de_tema'), intento(None, E.SIN_EVALUAR), None])
def test_vacio_fuera_de_tema_sin_evaluar_o_faltante_no(malo):
    assert not adecuado(intento(), malo, intento())


def test_seguimiento_sin_evaluar_cuenta_por_el_tipo_que_conserva_y_sin_llm_si_esta_completado():
    conserva = SimpleNamespace(tipo_final='general', estado=E.CERRADO, sensible=False, seguimiento_sin_evaluar=True)
    assert adecuado(conserva, intento(None, E.COMPLETADO), intento())


def test_solo_cuentan_los_obligatorios_y_un_opcional_es_adecuado_si_esta_completado():
    assert adecuado(intento(), intento(), intento('vacio'), items=[item(1), item(2), item(3, obligatorio=False)])
    assert registro_adecuado(ITEMS, {}, requerida=False, completada=True)
    assert not registro_adecuado(ITEMS, {}, requerida=False, completada=False)
