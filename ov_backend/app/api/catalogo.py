from collections.abc import Callable

from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.core.parametros import LIMITE_PAGINA_CATALOGO
from app.schemas.catalogo import (
    CarreraDetalle, FamiliaPublica, Inesperada, InstitucionDetalle, OcupacionDetalle, PaginaCarreras,
    PaginaInstituciones, PaginaOcupaciones, UbicacionPublica,
)
from app.services import catalogo as servicio_catalogo


router = APIRouter(tags=["Consultas"])


def _consultar(operacion: Callable):
    try:
        return operacion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/catalogo/carreras", response_model=PaginaCarreras)
def buscar_carreras(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                    familia: str | None = None, riasec: str | None = None, favoritos: bool = False,
                    limite: int = LIMITE_PAGINA_CATALOGO, desde: int = 0):
    return _consultar(lambda: servicio_catalogo.buscar_carreras(
        sesion, cuenta_consultada, buscar, familia, riasec, favoritos, limite, desde))


@router.get("/cuentas/{cuenta}/catalogo/familias", response_model=list[FamiliaPublica])
def listar_familias(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.listar_familias(sesion, cuenta_consultada))


@router.get("/cuentas/{cuenta}/catalogo/ubicaciones", response_model=list[UbicacionPublica])
def listar_ubicaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.listar_ubicaciones(sesion, cuenta_consultada))


# Antes del detalle, para que «inesperada» no se lea como un código.
@router.get("/cuentas/{cuenta}/catalogo/carreras/inesperada", response_model=Inesperada)
def carrera_inesperada(cuenta_consultada: CuentaConsultada, sesion: SesionBD, excluir: str | None = None):
    return _consultar(lambda: servicio_catalogo.carrera_inesperada(sesion, cuenta_consultada, excluir))


@router.get("/cuentas/{cuenta}/catalogo/ocupaciones/inesperada", response_model=Inesperada)
def ocupacion_inesperada(cuenta_consultada: CuentaConsultada, sesion: SesionBD, excluir: str | None = None):
    return _consultar(lambda: servicio_catalogo.ocupacion_inesperada(sesion, cuenta_consultada, excluir))


@router.get("/cuentas/{cuenta}/catalogo/carreras/{codigo}", response_model=CarreraDetalle)
def detalle_carrera(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_carrera(sesion, cuenta_consultada, codigo))


@router.get("/cuentas/{cuenta}/catalogo/ocupaciones", response_model=PaginaOcupaciones)
def buscar_ocupaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                       riasec: str | None = None, favoritos: bool = False, limite: int = LIMITE_PAGINA_CATALOGO,
                       desde: int = 0):
    return _consultar(lambda: servicio_catalogo.buscar_ocupaciones(
        sesion, cuenta_consultada, buscar, riasec, favoritos, limite, desde))


@router.get("/cuentas/{cuenta}/catalogo/ocupaciones/{codigo}", response_model=OcupacionDetalle)
def detalle_ocupacion(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_ocupacion(sesion, cuenta_consultada, codigo))


@router.get("/cuentas/{cuenta}/catalogo/instituciones", response_model=PaginaInstituciones)
def buscar_instituciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD, buscar: str | None = None,
                         tipo: str | None = None, ubicacion: str | None = None, favoritos: bool = False,
                         limite: int = LIMITE_PAGINA_CATALOGO, desde: int = 0):
    return _consultar(lambda: servicio_catalogo.buscar_instituciones(
        sesion, cuenta_consultada, buscar, tipo, ubicacion, favoritos, limite, desde))


@router.get("/cuentas/{cuenta}/catalogo/instituciones/{codigo}", response_model=InstitucionDetalle)
def detalle_institucion(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: servicio_catalogo.detalle_institucion(sesion, cuenta_consultada, codigo))
