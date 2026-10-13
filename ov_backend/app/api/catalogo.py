from collections.abc import Callable

from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.catalogo import (
    CarreraDetalle, CarreraResumen, InstitucionDetalle, InstitucionResumen, OcupacionDetalle, OcupacionResumen,
)
from app.services import catalogo as servicio_catalogo


router = APIRouter(tags=["Consultas"])


def _consultar(operacion: Callable):
    try:
        return operacion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/catalogo/carreras", response_model=list[CarreraResumen])
def buscar_carreras(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                    familia: str | None = None, riasec: str | None = None):
    return _consultar(lambda: servicio_catalogo.buscar_carreras(sesion, cuenta_consultada, buscar, familia, riasec))


@router.get("/cuentas/{cuenta}/catalogo/carreras/{codigo}", response_model=CarreraDetalle)
def detalle_carrera(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_carrera(sesion, cuenta_consultada, codigo))


@router.get("/cuentas/{cuenta}/catalogo/ocupaciones", response_model=list[OcupacionResumen])
def buscar_ocupaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                       riasec: str | None = None):
    return _consultar(lambda: servicio_catalogo.buscar_ocupaciones(sesion, cuenta_consultada, buscar, riasec))


@router.get("/cuentas/{cuenta}/catalogo/ocupaciones/{codigo}", response_model=OcupacionDetalle)
def detalle_ocupacion(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_ocupacion(sesion, cuenta_consultada, codigo))


@router.get("/cuentas/{cuenta}/catalogo/instituciones", response_model=list[InstitucionResumen])
def buscar_instituciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                         tipo: str | None = None, ubicacion: str | None = None):
    return _consultar(lambda: servicio_catalogo.buscar_instituciones(
        sesion, cuenta_consultada, buscar, tipo, ubicacion))


@router.get("/cuentas/{cuenta}/catalogo/instituciones/{codigo}", response_model=InstitucionDetalle)
def detalle_institucion(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_institucion(sesion, cuenta_consultada, codigo))
