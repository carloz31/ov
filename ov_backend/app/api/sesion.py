from fastapi import APIRouter, HTTPException, Request

from app.dependencies import ActorActual, Ahora, SesionBD, ejecutar_accion
from app.schemas.sesion import IngresoEntrada, IngresoRespuesta, SesionRespuesta
from app.services import acceso as servicio_acceso


# Única ruta fuera del guardia (además de las de desarrollo).
router_ingreso = APIRouter(tags=["Sesión"])
router = APIRouter(tags=["Sesión"])


@router_ingreso.post("/sesion/ingresar", response_model=IngresoRespuesta)
def ingresar(entrada: IngresoEntrada, sesion: SesionBD, ahora: Ahora, request: Request):
    secreto = request.app.state.configuracion.jwt_secreto
    # El intento fallido se confirma antes de responder 401; si no, el rollback lo borraría.
    respuesta = ejecutar_accion(sesion, lambda: servicio_acceso.ingresar(
        sesion, entrada.usuario, entrada.contrasena, ahora, secreto))
    if respuesta is None:
        raise HTTPException(status_code=401, detail={"mensaje": servicio_acceso.MENSAJE_CREDENCIALES})
    return respuesta


@router.get("/sesion", response_model=SesionRespuesta)
def consultar_sesion(actor: ActorActual, sesion: SesionBD):
    return servicio_acceso.consultar_sesion(sesion, actor)
