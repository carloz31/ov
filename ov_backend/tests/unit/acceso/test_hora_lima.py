"""Las fechas se guardan en hora de Lima sea cual sea la zona del servidor (en AWS, UTC): a las 22:30 de Lima ya
es el día siguiente en UTC, y la acción debe quedar con la fecha y la hora de Lima."""

from contextvars import copy_context
from datetime import date, datetime, timezone

import pytest

from app import dependencies
from app.schemas.acciones import FechaAccion
from app.services import comun
from app.services.registro import acciones as registro


# DATO DE PRUEBA: 03:30 UTC del 30 de octubre = 22:30 del 29 en Lima.
INSTANTE = datetime(2026, 10, 30, 3, 30, tzinfo=timezone.utc)
EN_LIMA = datetime(2026, 10, 29, 22, 30)


class RelojFijo(datetime):
    @classmethod
    def now(cls, tz=None):
        return INSTANTE.astimezone(tz) if tz else INSTANTE.astimezone().replace(tzinfo=None)


@pytest.fixture
def reloj(monkeypatch):
    # El proceso en UTC, como un servidor de AWS.
    monkeypatch.setenv('TZ', 'UTC')
    for modulo in (comun, dependencies, registro):
        monkeypatch.setattr(modulo, 'datetime', RelojFijo)


def test_accion_ahora_y_marca_en_hora_de_lima(reloj):
    assert copy_context().run(lambda: comun.fecha_accion(FechaAccion())) == EN_LIMA
    assert dependencies.obtener_ahora() == EN_LIMA
    assert registro.marca_actualizacion() == EN_LIMA
    # «Hoy» (check-in, pregunta del día, señal) es el día de Lima, no el de UTC.
    assert dependencies.obtener_ahora().date() == date(2026, 10, 29)
