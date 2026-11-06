from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.schemas.logros import LogrosCuenta, VitrinaCuenta, VitrinaEntrada
from app.services import logros as servicio_logros


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/logros", response_model=LogrosCuenta, response_model_exclude_unset=True)
def consultar_logros(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_logros.logros_cuenta(sesion, cuenta_consultada)


@router.post("/acciones/vitrina", response_model=VitrinaCuenta, tags=["Acciones"])
def guardar_vitrina(entrada: VitrinaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_logros.guardar_vitrina(sesion, entrada))
