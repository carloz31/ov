from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.testimonios import TestimonioEstado
from app.services import testimonios as servicio_testimonios


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/testimonios", response_model=list[TestimonioEstado])
def consultar_testimonios(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_testimonios.listar_testimonios_cuenta(sesion, cuenta_consultada)
