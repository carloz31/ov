from collections.abc import Callable
from datetime import UTC, datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.contexto import fecha_cliente_permitida
from app.database import obtener_sesion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.models import Cuenta
from app.services import cuentas as servicio_cuentas
from app.services.acceso import Actor, TokenInvalido, es_propia, leer_token


SesionBD = Annotated[Session, Depends(obtener_sesion)]
MENSAJE_SESION_TERMINADA = "Tu sesión terminó. Vuelve a ingresar."
POLITICA_PROPIA = (es_propia,)


def politica_acceso(*politicas: Callable):
    """Declara quién más puede usar la ruta además de la cuenta propia (B14, B15). Sin declarar, solo la propia."""
    def marcar(endpoint):
        endpoint.politicas_acceso = (es_propia, *politicas)
        return endpoint
    return marcar


def _no_autenticado() -> HTTPException:
    return HTTPException(status_code=401, detail={"mensaje": MENSAJE_SESION_TERMINADA},
                         headers={"WWW-Authenticate": "Bearer"})


def _no_encontrada() -> HTTPException:
    # Mismo cuerpo que `obtener_cuenta`: el front ya lo conoce.
    return HTTPException(status_code=404, detail="Cuenta no encontrada")


async def _cuerpo_json(request: Request):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return None
    if not await request.body():
        return None
    try:
        return await request.json()
    except (ValueError, UnicodeDecodeError):
        return None


def _autorizar(sesion: Session, datos: dict, objetivo: str | None, politicas) -> Actor:
    try:
        fila = sesion.execute(select(Cuenta.id, Cuenta.codigo, Cuenta.rol, Cuenta.activa)
                              .where(Cuenta.codigo == datos["sub"])).first()
        if fila is None or not fila.activa:
            raise _no_autenticado()
        actor = Actor(fila.id, fila.codigo, fila.rol, datetime.fromtimestamp(datos["exp"], UTC))
        if objetivo is not None and objetivo != actor.codigo:
            objetivo_id = None if politicas == POLITICA_PROPIA else sesion.scalar(
                select(Cuenta.id).where(Cuenta.codigo == objetivo))
            if objetivo_id is None or not any(politica(sesion, actor.id, objetivo_id) for politica in politicas):
                raise _no_encontrada()
        return actor
    finally:
        # La consulta autoinicia una transacción; sin cerrarla, `ejecutar_accion` no podría abrir `sesion.begin()`.
        sesion.rollback()


async def guardia(request: Request, sesion: SesionBD) -> None:
    """Montado en el router (B17): valida el token y que el actor pueda actuar sobre la cuenta objetivo."""
    configuracion = request.app.state.configuracion
    fecha_cliente_permitida.set(configuracion.entorno == "desarrollo")
    esquema, _, token = request.headers.get("authorization", "").partition(" ")
    if esquema.lower() != "bearer" or not token.strip():
        raise _no_autenticado()
    try:
        datos = leer_token(token.strip(), configuracion.jwt_secreto)
    except TokenInvalido:
        raise _no_autenticado() from None
    objetivo = request.path_params.get("cuenta")
    cuerpo = await _cuerpo_json(request)
    if objetivo is None and isinstance(cuerpo, dict) and isinstance(cuerpo.get("cuenta"), str):
        objetivo = cuerpo["cuenta"]
    ruta = request.scope.get("route")
    politicas = getattr(getattr(ruta, "endpoint", None), "politicas_acceso", POLITICA_PROPIA)
    request.state.actor = await run_in_threadpool(_autorizar, sesion, datos, objetivo, politicas)


async def habilitar_fecha_cliente() -> None:
    """Router de desarrollo: queda fuera del guardia, pero acepta `fecha_hora` como el resto en desarrollo."""
    fecha_cliente_permitida.set(True)


def obtener_actor(request: Request) -> Actor:
    return request.state.actor


def obtener_ahora() -> datetime:
    """Hora de Lima sin zona, como el resto de fechas guardadas; las pruebas la reemplazan."""
    return datetime.now(timezone(timedelta(hours=-5))).replace(tzinfo=None)


ActorActual = Annotated[Actor, Depends(obtener_actor)]
Ahora = Annotated[datetime, Depends(obtener_ahora)]


def obtener_cuenta(cuenta: str, sesion: SesionBD) -> Cuenta:
    resultado = servicio_cuentas.obtener_cuenta(sesion, cuenta)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return resultado


CuentaConsultada = Annotated[Cuenta, Depends(obtener_cuenta)]


def ejecutar_accion(sesion: Session, operacion: Callable):
    try:
        with sesion.begin():
            return operacion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail={
            "mensaje": "La acción entra en conflicto con el estado actual de la cuenta",
        }) from error
