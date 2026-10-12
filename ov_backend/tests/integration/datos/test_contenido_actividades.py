"""B1: claves de contenido y visibilidad sin cambiar los escenarios existentes."""

import re

import pytest
from sqlalchemy import select

from app.database import crear_motor_bd
from app.models import Actividad, Visibilidad
from datos import cargar as carga
from datos.ruta import ACTIVIDADES


@pytest.mark.parametrize('conjunto', ['ruta'])
def test_claves_y_visibilidad_de_los_conjuntos(tmp_path, conjunto):
    url = f'sqlite:///{(tmp_path / "contenidos.db").as_posix()}'
    carga.preparar_base(url, conjunto, crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with motor.connect() as conexion:
            filas = conexion.execute(select(Actividad.codigo, Actividad.contenido, Actividad.visibilidad)).all()
        assert all(re.fullmatch(r'[a-z0-9_]+', contenido) for _, contenido, _ in filas)
        assert all(visibilidad == Visibilidad.SIEMPRE for _, _, visibilidad in filas)
        assert {codigo: contenido for codigo, contenido, _ in filas} == {
            codigo: codigo.replace('-', '_') for codigo, *_ in ACTIVIDADES}
    finally:
        motor.dispose()
