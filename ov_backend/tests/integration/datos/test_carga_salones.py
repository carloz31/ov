"""B07: temáticas y configuración del salón al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
VARIANTES = (
    ('SALON_INSTRUMENTOS', (('5A', 'TEST-PARTIDA-LLEGADA', True, False),), 'no admite la marca de prioritario'),
    ('SALON_INSTRUMENTOS', (('5Z', 'TEST-RIASEC', True, False),), 'salón o instrumento inexistente'),
    ('SALON_ACTIVIDADES_PRIORITARIAS', (('5A', 't-inicio'),), 'no es una actividad de registro'),
    ('SALON_ACTIVIDADES_PRIORITARIAS', (('5A', 't-nula'),), 'salón o actividad inexistente'),
    ('TEMATICAS_ACTIVIDADES', (('t-inicio', ('Z',)),), 'temática inexistente'),
)


@pytest.mark.parametrize(('atributo', 'valor', 'mensaje'), VARIANTES)
def test_carga_rechaza_configuracion_invalida_sin_dejar_filas(tmp_path, monkeypatch, atributo, valor, mensaje):
    url = f'sqlite:///{(tmp_path / "salones.db").as_posix()}'
    monkeypatch.setattr(ruta, atributo, valor)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with Session(motor) as sesion:
            assert sesion.scalars(select(m.Salon)).all() == []
    finally:
        motor.dispose()


def test_tematicas_y_prioritarios_cargados(sesion):
    assert [(t.codigo, t.orden) for t in sesion.scalars(select(m.Tematica).order_by(m.Tematica.orden))] == [
        ('A', 1), ('B', 2), ('C', 3), ('D', 4), ('E', 5)]
    dimensiones = sesion.execute(select(m.Dimension.codigo, m.Tematica.codigo).join(
        m.Tematica, m.Tematica.id == m.Dimension.tematica_id).order_by(m.Dimension.orden)).all()
    assert dimensiones == [(f'AUTO-{c}', c) for c in 'ABCDE']
    configuracion = sesion.execute(select(m.Salon.codigo, m.Instrumento.codigo, m.SalonInstrumento.es_prioritario,
                                          m.SalonInstrumento.visible_apoderado).select_from(m.SalonInstrumento).join(
        m.Salon, m.Salon.id == m.SalonInstrumento.salon_id).join(
        m.Instrumento, m.Instrumento.id == m.SalonInstrumento.instrumento_id)).all()
    assert configuracion == [('5A', 'TEST-RIASEC', True, False)]
    assert sesion.execute(select(m.Salon.codigo, m.Actividad.codigo).select_from(m.SalonActividadPrioritaria).join(
        m.Salon, m.Salon.id == m.SalonActividadPrioritaria.salon_id).join(
        m.Actividad, m.Actividad.id == m.SalonActividadPrioritaria.actividad_id)).all() == [('5A', 't-expectativas')]
