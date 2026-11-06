from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import Cuenta, Presentacion, PresentacionVista
from app.schemas.presentaciones import PresentacionesCuenta, PresentacionVistaEntrada
from app.services.comun import buscar_por_codigo, exigir_estudiante, fecha_accion


@usar_contexto
def presentaciones_cuenta(sesion: Session, cuenta: Cuenta) -> PresentacionesCuenta:
    ids = set(sesion.scalars(select(PresentacionVista.presentacion_id).where(PresentacionVista.cuenta_id == cuenta.id)))
    return PresentacionesCuenta(vistas=sorted(
        presentacion.codigo for presentacion in contexto(sesion).definiciones.listar(Presentacion)
        if presentacion.id in ids))


@usar_contexto
def marcar_presentacion_vista(sesion: Session, entrada: PresentacionVistaEntrada) -> PresentacionesCuenta:
    """Idempotente: una presentación ya vista conserva su primera `vista_en`."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    presentacion = contexto(sesion).definiciones.por_codigo(Presentacion, entrada.codigo)
    if presentacion is None or presentacion.audiencia != cuenta.rol.value:
        raise ErrorAccion("La presentación no existe", estado_http=422)
    if sesion.get(PresentacionVista, (cuenta.id, presentacion.id)) is None:
        sesion.add(PresentacionVista(cuenta_id=cuenta.id, presentacion_id=presentacion.id,
                                     vista_en=fecha_accion(entrada)))
        sesion.flush()
    return presentaciones_cuenta(sesion, cuenta)
