"""B07: temáticas, configuración del colegio y referencias a cuestionarios al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
VARIANTES = (
    ('COLEGIO_INSTRUMENTOS_VISIBLES', (('col-piloto', 'TEST-PARTIDA-LLEGADA'),), 'no depende del colegio'),
    ('COLEGIO_INSTRUMENTOS_VISIBLES', (('col-piloto', 'TEST-RIASEC'),), 'no depende del colegio'),
    ('COLEGIO_INSTRUMENTOS_VISIBLES', (('col-otro', 'TEST-INTELIGENCIAS'),), 'colegio o instrumento inexistente'),
    ('COLEGIO_ACTIVIDADES_DESTACADAS', (('col-piloto', 't-inicio'),), 'no es una actividad de registro'),
    ('COLEGIO_ACTIVIDADES_DESTACADAS', (('col-piloto', 't-nula'),), 'colegio o actividad inexistente'),
    ('TEMATICAS_ACTIVIDADES', (('t-inicio', ('Z',)),), 'temática inexistente'),
    ('REFERENCIAS', (*ruta.REFERENCIAS, ('t-ref-mal', ('ACTIVIDAD', 't-eco'), 'RESPUESTA_CUESTIONARIO',
                                         ('APL-RIASEC', 'AUTO-01'))), 'que la aplicación APL-RIASEC no presenta'),
    ('REFERENCIAS', (*ruta.REFERENCIAS, ('t-ref-mal', ('ACTIVIDAD', 't-eco'), 'RESPUESTA_CUESTIONARIO',
                                         ('APL-PARTIDA', 'AUTO-99'))), 'que la aplicación APL-PARTIDA no presenta'),
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
    instrumentos = sesion.execute(select(m.Instrumento.codigo, m.Instrumento.obligatorio,
                                         m.Instrumento.visibilidad_apoderado).order_by(m.Instrumento.codigo)).all()
    assert instrumentos == [('TEST-HABILIDADES', False, 'SEGUN_COLEGIO'), ('TEST-INTELIGENCIAS', False, 'SEGUN_COLEGIO'),
                            ('TEST-PARTIDA-LLEGADA', True, 'NUNCA'), ('TEST-RIASEC', True, 'SIEMPRE')]
    assert sesion.scalars(select(m.ColegioInstrumentoVisible)).all() == []
    assert sesion.execute(select(m.Colegio.codigo, m.Actividad.codigo).select_from(m.ColegioActividadDestacada).join(
        m.Colegio, m.Colegio.id == m.ColegioActividadDestacada.colegio_id).join(
        m.Actividad, m.Actividad.id == m.ColegioActividadDestacada.actividad_id)).all() == [('col-piloto', 't-expectativas')]


def test_un_instrumento_segun_colegio_no_puede_ser_obligatorio(monkeypatch, tmp_path):
    from datos import fijos
    url = f'sqlite:///{(tmp_path / "obligatorio.db").as_posix()}'
    monkeypatch.setitem(fijos.CONFIGURACION_INSTRUMENTOS, 'TEST-HABILIDADES', (True, m.VisibilidadApoderado.SEGUN_COLEGIO))
    with pytest.raises(ValueError, match='no puede depender del colegio'):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)
