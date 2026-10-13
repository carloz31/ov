from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.batallas import BatallaCuenta
from app.services import batallas as servicio_batallas


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/batallas", response_model=list[BatallaCuenta])
def consultar_batallas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_batallas.listar_batallas_cuenta(sesion, cuenta_consultada)
