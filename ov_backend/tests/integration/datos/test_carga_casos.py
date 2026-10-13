"""B08: batallas, dimensiones de los casos y testimonios al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
VARIANTES = (
    ((('t-inicio', ('R',)),), 'no es un caso y no admite dimensiones'),
    ((('t-caso', ('Z',)),), 'actividad o dimensión inexistente'),
    ((('t-nula', ('R',)),), 'actividad o dimensión inexistente'),
)


@pytest.mark.parametrize(('valor', 'mensaje'), VARIANTES)
def test_carga_rechaza_dimensiones_invalidas_sin_dejar_filas(tmp_path, monkeypatch, valor, mensaje):
    url = f'sqlite:///{(tmp_path / "casos.db").as_posix()}'
    monkeypatch.setattr(ruta, 'DIMENSIONES_ACTIVIDADES', valor)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with Session(motor) as sesion:
            assert sesion.scalars(select(m.ActividadDimension)).all() == []
    finally:
        motor.dispose()


def test_solo_los_casos_tienen_dimensiones(sesion):
    filas = sesion.execute(select(m.Actividad.codigo, m.Actividad.tipo, m.Dimension.codigo)
                           .join(m.ActividadDimension, m.ActividadDimension.actividad_id == m.Actividad.id)
                           .join(m.Dimension, m.Dimension.id == m.ActividadDimension.dimension_id)).all()
    assert filas
    assert {tipo for _, tipo, _ in filas} == {m.TipoActividad.CASO}
    assert sorted(d for a, _, d in filas if a == 't-caso') == ['R', 'S']


def test_batalla_y_testimonios_cargados(sesion):
    batalla = sesion.scalar(select(m.Actividad).where(m.Actividad.codigo == 't-batalla'))
    assert batalla.tipo == m.TipoActividad.BATALLA and batalla.puntaje_minimo is None and not batalla.requerida
    pistas = dict(sesion.execute(select(m.Testimonio.codigo, m.Testimonio.pista)).all())
    assert pistas['t-testimonio-1'] and pistas['t-testimonio-2'] is None
