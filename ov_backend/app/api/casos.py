from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.casos import CasoCuenta, OcupacionColeccion
from app.services import casos as servicio_casos


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/casos", response_model=list[CasoCuenta])
def consultar_casos(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_casos.listar_casos_cuenta(sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/coleccion", response_model=list[OcupacionColeccion])
def consultar_coleccion(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_casos.listar_coleccion_cuenta(sesion, cuenta_consultada)
