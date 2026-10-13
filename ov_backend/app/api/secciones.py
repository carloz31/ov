from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import consultar
from app.schemas.secciones import SeccionEstado
from app.services import secciones as servicio_secciones


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/secciones", response_model=list[SeccionEstado])
def consultar_secciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_secciones.listar_secciones_cuenta(sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/secciones/{codigo}", response_model=SeccionEstado)
def consultar_seccion(cuenta_consultada: CuentaConsultada, codigo: str, sesion: SesionBD):
    return consultar(lambda: servicio_secciones.estado_seccion(sesion, cuenta_consultada, codigo))
