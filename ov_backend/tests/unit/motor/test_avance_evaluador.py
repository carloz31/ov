"""Ajuste logros: el avance de un evaluador y su forma en la respuesta."""

from app.schemas.motor import ResultadoEvaluador
from app.services.motor.evaluadores import Avance


def test_avance_se_cumple_al_alcanzar_lo_requerido():
    assert not Avance(4, 5).cumplido
    assert Avance(5, 5).cumplido
    assert Avance(6, 5).cumplido


def test_un_total_de_cero_no_cuenta_como_cumplido():
    assert not Avance(0, 0).cumplido


def test_sin_avance_la_respuesta_no_cambia():
    assert ResultadoEvaluador(nombre='x', cumplido=True).model_dump() == {'nombre': 'x', 'cumplido': True}
    assert ResultadoEvaluador(nombre='x', cumplido=False, actual=5, requerido=8).model_dump() == {
        'nombre': 'x', 'cumplido': False, 'actual': 5, 'requerido': 8}
