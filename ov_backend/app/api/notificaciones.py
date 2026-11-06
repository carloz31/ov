from fastapi import APIRouter

from app.core.parametros import LIMITE_PAGINA_NOTIFICACIONES
from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import FechaAccion
from app.schemas.notificaciones import MarcarVistasEntrada, NotificacionesMarcadas, PaginaNotificaciones
from app.services import notificaciones as servicio_notificaciones
from app.services.comun import fecha_accion


router = APIRouter(tags=["Notificaciones"])


@router.get("/cuentas/{cuenta}/notificaciones", response_model=PaginaNotificaciones)
def consultar_notificaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD,
                             limite: int = LIMITE_PAGINA_NOTIFICACIONES, desde: int = 0):
    try:
        return servicio_notificaciones.listar(sesion, cuenta_consultada, limite, desde)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.post("/cuentas/{cuenta}/notificaciones/marcar-vistas", response_model=NotificacionesMarcadas)
def marcar_vistas(cuenta_consultada: CuentaConsultada, entrada: MarcarVistasEntrada, sesion: SesionBD):
    """Idempotente y sin eventos; sin códigos, todas las pendientes."""
    marcadas = servicio_notificaciones.marcar_vistas(sesion, cuenta_consultada, entrada.codigos,
                                                     fecha_accion(FechaAccion()))
    sesion.commit()
    return NotificacionesMarcadas(marcadas=marcadas)
