from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import RespuestaAccion
from app.schemas.planes import (
    GuardarSeccionEntrada, MedidoresEntrada, OrdenarPlanesEntrada, PasoHechoEntrada, PlanEntrada, PlanesCuenta,
)
from app.services.planes import acciones as acciones_planes
from app.services.planes import consultas as consultas_planes


router = APIRouter(tags=["Planes"])


@router.get("/cuentas/{cuenta}/planes", response_model=PlanesCuenta)
def consultar_planes(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return consultas_planes.listar_planes(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.post("/acciones/planes/crear", response_model=RespuestaAccion, response_model_exclude_unset=True)
def crear_plan(entrada: PlanEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_planes.crear_plan(sesion, entrada))


@router.post("/acciones/planes/guardar-seccion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_seccion(entrada: GuardarSeccionEntrada, peticion: Request):
    # No usa la dependencia de sesión: las sugerencias van entre dos transacciones, como en el registro.
    try:
        return acciones_planes.guardar_seccion(
            peticion.app.state.fabrica_sesiones, entrada, peticion.app.state.evaluador_respuestas,
            tiempo_maximo_segundos=peticion.app.state.configuracion_registro.timeout_segundos)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail={
            "mensaje": "La acción entra en conflicto con el estado actual de la cuenta",
        }) from error


@router.post("/acciones/planes/medidores", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_medidores(entrada: MedidoresEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_planes.guardar_medidores(sesion, entrada))


@router.post("/acciones/planes/paso-hecho", response_model=RespuestaAccion, response_model_exclude_unset=True)
def marcar_paso_hecho(entrada: PasoHechoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_planes.marcar_paso_hecho(sesion, entrada))


@router.post("/acciones/planes/ordenar", response_model=RespuestaAccion, response_model_exclude_unset=True)
def ordenar_planes(entrada: OrdenarPlanesEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_planes.ordenar_planes(sesion, entrada))


@router.post("/acciones/planes/eliminar", response_model=RespuestaAccion, response_model_exclude_unset=True)
def eliminar_plan(entrada: PlanEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_planes.eliminar_plan(sesion, entrada))
