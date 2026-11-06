from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import EscribirCartaEntrada, RespuestaAccion, RespuestaAgrupada
from app.schemas.conversaciones import ConversacionesCuenta, ResponderConversacionEntrada
from app.services import conversaciones as servicio_conversaciones


router = APIRouter(tags=["Conversaciones"])


@router.get("/cuentas/{cuenta}/conversaciones", response_model=ConversacionesCuenta)
def consultar_conversaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD, estudiante: str | None = None):
    try:
        return servicio_conversaciones.consultar_conversaciones(sesion, cuenta_consultada, estudiante)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.post("/acciones/escribir-carta", response_model=RespuestaAccion, response_model_exclude_unset=True)
def escribir_carta(entrada: EscribirCartaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_conversaciones.escribir_carta(sesion, entrada))


@router.post("/acciones/responder-conversacion", response_model=RespuestaAgrupada, response_model_exclude_unset=True)
def responder_conversacion(entrada: ResponderConversacionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_conversaciones.responder_conversacion(sesion, entrada))
