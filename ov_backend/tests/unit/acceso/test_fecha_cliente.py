"""B17: `fecha_hora` del cliente se ignora salvo que el guardia la habilite (solo con ENTORNO=desarrollo)."""

from contextvars import copy_context
from datetime import datetime

from app.core.contexto import fecha_cliente_permitida
from app.schemas.acciones import FechaAccion
from app.services.comun import fecha_accion


FECHA = datetime(2020, 1, 1, 10, 0)  # DATO DE PRUEBA: fecha que el cliente intenta imponer.


def test_sin_guardia_se_ignora_la_fecha_del_cliente():
    assert copy_context().run(lambda: fecha_accion(FechaAccion(fecha_hora=FECHA))) != FECHA


def test_habilitada_se_conserva_la_fecha_del_cliente():
    def habilitada():
        fecha_cliente_permitida.set(True)
        return fecha_accion(FechaAccion(fecha_hora=FECHA))
    assert copy_context().run(habilitada) == FECHA
