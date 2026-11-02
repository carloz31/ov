"""Restricciones resultados."""

from datetime import datetime
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from app import models as modelos


FECHA = datetime(2026, 10, 1, 10)


def buscar(sesion, modelo, codigo):
    return sesion.scalar(select(modelo).where(modelo.codigo == codigo))


def test_dos_resultados_vigentes_prohibidos(sesion):
    ana = buscar(sesion, modelos.Cuenta, "est-ana")
    aplicacion = buscar(sesion, modelos.Aplicacion, "APL-RIASEC")
    resultado = modelos.ResultadoInstrumento(cuenta_id=ana.id, aplicacion_id=aplicacion.id, calculado_en=FECHA)
    sesion.add(resultado)
    sesion.flush()
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.add(modelos.ResultadoInstrumento(cuenta_id=ana.id, aplicacion_id=aplicacion.id, calculado_en=FECHA))
            sesion.flush()
    resultado.anulado_en = FECHA
    sesion.flush()
    sesion.add(modelos.ResultadoInstrumento(cuenta_id=ana.id, aplicacion_id=aplicacion.id, calculado_en=FECHA))
    sesion.flush()
    assert sesion.scalar(select(func.count()).select_from(modelos.ResultadoInstrumento)) == 2


# Ajuste resultados-intereses: sin nivel de ajuste ni tope de 10; r entre 0 y 1 y posición desde 1.
@pytest.mark.parametrize("correlacion, posicion", [(-0.1, 1), (1.01, 1), (0.9, 0)])
def test_coincidencias_rechazan_correlaciones_y_posiciones_invalidas(sesion, correlacion, posicion):
    # Ocupación independiente del catálogo, únicamente para probar restricciones SQL.
    ocupacion = modelos.Ocupacion(codigo="prueba", codigo_onet="PRUEBA", titulo="Prueba SQL", grupo="15")
    sesion.add(ocupacion)
    resultado = modelos.ResultadoInstrumento(cuenta_id=buscar(sesion, modelos.Cuenta, "est-ana").id,
                                             aplicacion_id=buscar(sesion, modelos.Aplicacion, "APL-RIASEC").id,
                                             calculado_en=FECHA)
    sesion.add(resultado)
    sesion.flush()
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.add(modelos.Coincidencia(resultado_id=resultado.id, ocupacion_id=ocupacion.id,
                                          posicion=posicion, correlacion=correlacion))
            sesion.flush()
