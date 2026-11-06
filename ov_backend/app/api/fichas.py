from fastapi import APIRouter

from app.exceptions import ErrorAccion, traducir_error_accion

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.fichas import FichaCuenta, FichaDetalle
from app.services import fichas as servicio_fichas


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/fichas", response_model=list[FichaCuenta])
def consultar_fichas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_fichas.listar_fichas_cuenta(sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/fichas/{codigo}", response_model=FichaDetalle)
def consultar_ficha(codigo: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_fichas.detalle_ficha(sesion, cuenta_consultada, codigo)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
