from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.avance import AvanceEstudiante
from app.services import avance as servicio_avance


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/avance", response_model=AvanceEstudiante)
def consultar_avance(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_avance.avance_estudiante(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
