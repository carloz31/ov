from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import RespuestaAccion
from app.schemas.investigaciones import (
    CancelarInvestigacionEntrada, GuardarGuionEntrada, GuardarLoQuePiensoEntrada, InvestigacionesCuenta,
    PedirSugerenciasEntrada, SugerenciasGuion,
)
from app.services.investigaciones import acciones as acciones_investigaciones
from app.services.investigaciones import consultas as consultas_investigaciones
from app.services.investigaciones import sugerencias as sugerencias_investigaciones


router = APIRouter(tags=["Investigaciones"])


def _consultar(funcion):
    try:
        return funcion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/investigaciones", response_model=InvestigacionesCuenta)
def consultar_investigaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: consultas_investigaciones.consultar_investigaciones(sesion, cuenta_consultada))


@router.post("/acciones/guardar-lo-que-pienso", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_lo_que_pienso(entrada: GuardarLoQuePiensoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.guardar_lo_que_pienso(sesion, entrada))


@router.post("/acciones/pedir-sugerencias-guion", response_model=SugerenciasGuion)
def pedir_sugerencias_guion(entrada: PedirSugerenciasEntrada, peticion: Request):
    # No usa la dependencia de sesión: la llamada al LLM va entre dos transacciones, como en planes.
    try:
        return sugerencias_investigaciones.pedir_sugerencias(
            peticion.app.state.fabrica_sesiones, entrada, peticion.app.state.evaluador_respuestas,
            tiempo_maximo_segundos=peticion.app.state.configuracion_registro.timeout_segundos)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail={
            "mensaje": "La acción entra en conflicto con el estado actual de la cuenta",
        }) from error


@router.post("/acciones/guardar-guion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_guion(entrada: GuardarGuionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.guardar_guion(sesion, entrada))


@router.post("/acciones/cancelar-investigacion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def cancelar_investigacion(entrada: CancelarInvestigacionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.cancelar_investigacion(sesion, entrada))
