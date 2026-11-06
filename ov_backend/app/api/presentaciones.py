from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.schemas.presentaciones import PresentacionesCuenta, PresentacionVistaEntrada
from app.services import presentaciones as servicio_presentaciones


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/presentaciones", response_model=PresentacionesCuenta)
def consultar_presentaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_presentaciones.presentaciones_cuenta(sesion, cuenta_consultada)


@router.post("/acciones/presentacion-vista", response_model=PresentacionesCuenta, tags=["Acciones"])
def marcar_presentacion_vista(entrada: PresentacionVistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_presentaciones.marcar_presentacion_vista(sesion, entrada))
