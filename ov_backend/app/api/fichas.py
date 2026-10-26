from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.fichas import FichaCuenta
from app.services import fichas as servicio_fichas


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/fichas", response_model=list[FichaCuenta])
def consultar_fichas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_fichas.listar_fichas_cuenta(sesion, cuenta_consultada)
