from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.diario import PreguntaDiarioEstado
from app.services import diario as servicio_diario


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/diario/preguntas", response_model=list[PreguntaDiarioEstado])
def consultar_diario(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_diario.listar_preguntas_cuenta(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
