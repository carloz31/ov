from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.batallas import BatallaCuenta, PreguntaIntento
from app.services import batallas as servicio_batallas


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/batallas", response_model=list[BatallaCuenta])
def consultar_batallas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_batallas.listar_batallas_cuenta(sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/batallas/{actividad}/preguntas", response_model=list[PreguntaIntento])
def consultar_preguntas_batalla(actividad: str, cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_batallas.preguntas_intento(sesion, cuenta_consultada, actividad)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
