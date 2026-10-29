"""Ajuste notificaciones: lo que la campana lista y su visto. Se crean en la transacción de la acción que las
origina; las de la acción en curso se juntan en la sesión para su respuesta (`nuevas_notificaciones`)."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.core.parametros import LIMITE_MAXIMO_NOTIFICACIONES
from app.exceptions import ErrorAccion
from app.models import Cuenta, Notificacion, Rol, TipoNotificacion, TipoObjetivo
from app.schemas.notificaciones import NotificacionPublica, PaginaNotificaciones

# Los logros que se anuncian; el resto de desbloqueos se revela en su propia vista (mapa, Lumi, diario).
OBJETIVOS_ANUNCIADOS = (TipoObjetivo.INSIGNIA, TipoObjetivo.FICHA, TipoObjetivo.NIVEL)
BLOQUE_ANUNCIADO = 'CIUDAD'
CLAVE_SESION = 'notificaciones_nuevas'
LOTE_SESION = 'lote_notificaciones'


def se_anuncia(tipo_objetivo: TipoObjetivo, codigo: str) -> bool:
    return tipo_objetivo in OBJETIVOS_ANUNCIADOS or (tipo_objetivo == TipoObjetivo.BLOQUE and codigo == BLOQUE_ANUNCIADO)


def _publica(fila: dict, rol: Rol | None = None) -> NotificacionPublica:
    hijo = fila['tipo'] == TipoNotificacion.RESPUESTA_CONVERSACION and rol == Rol.APODERADO
    return NotificacionPublica(
        codigo=fila['codigo'], tipo=fila['tipo'], referencia=fila['referencia'], nombre=fila['nombre'],
        detalle=None if hijo else fila['detalle'], creada_en=fila['creada_en'], vista=fila['vista_en'] is not None,
        estudiante=fila['detalle'] if hijo else None,
    )


def crear_para(sesion: Session, filas: list[tuple[Cuenta, TipoNotificacion, str, str, str | None]],
               fecha: datetime) -> None:
    """Inserta en lote (cuenta, tipo, referencia, nombre, detalle) y las anota para la respuesta de cada cuenta."""
    if not filas:
        return
    nuevas = [(cuenta, dict(codigo=f'NOT-{uuid4().hex}', cuenta_id=cuenta.id, tipo=tipo, referencia=referencia,
                            nombre=nombre, detalle=detalle, creada_en=fecha, vista_en=None))
              for cuenta, tipo, referencia, nombre, detalle in filas]
    pendientes = sesion.info.get(LOTE_SESION)
    if pendientes is None:
        sesion.execute(insert(Notificacion.__table__), [fila for _, fila in nuevas])
    else:
        # Una acción de varias cuentas las inserta todas juntas al final (`responder_varias_cuentas`).
        pendientes.extend(fila for _, fila in nuevas)
    anotadas = sesion.info.setdefault(CLAVE_SESION, {})
    for cuenta, fila in nuevas:
        anotadas.setdefault(cuenta.id, []).append(_publica(fila, cuenta.rol))


def crear_varias(sesion: Session, cuenta: Cuenta, filas: list[tuple[TipoNotificacion, str, str, str | None]],
                 fecha: datetime) -> None:
    crear_para(sesion, [(cuenta, *fila) for fila in filas], fecha)


def crear(sesion: Session, cuenta: Cuenta, tipo: TipoNotificacion, referencia: str, nombre: str,
          detalle: str | None = None, *, fecha: datetime) -> None:
    crear_para(sesion, [(cuenta, tipo, referencia, nombre, detalle)], fecha)


def abrir_lote(sesion: Session) -> None:
    """Desde aquí hasta `insertar_lote`, las notificaciones se insertan juntas."""
    sesion.info.setdefault(LOTE_SESION, [])


def nuevas_de(sesion: Session, cuenta: Cuenta) -> list[NotificacionPublica]:
    """Las creadas para `cuenta` en la acción en curso; se entregan una sola vez."""
    return sesion.info.get(CLAVE_SESION, {}).pop(cuenta.id, [])


def olvidar_nuevas(sesion: Session) -> None:
    sesion.info.pop(CLAVE_SESION, None)
    sesion.info.pop(LOTE_SESION, None)


def listar(sesion: Session, cuenta: Cuenta, limite: int, desde: int) -> PaginaNotificaciones:
    """De la más reciente a la más antigua."""
    if not 1 <= limite <= LIMITE_MAXIMO_NOTIFICACIONES:
        raise ErrorAccion(f'El límite va de 1 a {LIMITE_MAXIMO_NOTIFICACIONES}', estado_http=422)
    if desde < 0:
        raise ErrorAccion('desde no puede ser negativo', estado_http=422)
    propias = Notificacion.cuenta_id == cuenta.id
    total, no_vistas = sesion.execute(select(
        func.count(), func.count().filter(Notificacion.vista_en.is_(None)),
    ).where(propias)).one()
    filas = sesion.execute(select(Notificacion.__table__).where(propias).order_by(
        Notificacion.creada_en.desc(), Notificacion.id.desc()).limit(limite).offset(desde)).mappings()
    return PaginaNotificaciones(total=total, no_vistas=no_vistas,
                                items=[_publica(dict(fila), cuenta.rol) for fila in filas])


def marcar_vistas(sesion: Session, cuenta: Cuenta, codigos: list[str], fecha: datetime) -> int:
    """Idempotente: las ya vistas, ajenas o inexistentes se ignoran. Sin códigos, todas las pendientes."""
    condiciones = [Notificacion.cuenta_id == cuenta.id, Notificacion.vista_en.is_(None)]
    if codigos:
        condiciones.append(Notificacion.codigo.in_(codigos))
    return sesion.execute(update(Notificacion).where(*condiciones).values(vista_en=fecha)).rowcount


def insertar_lote(sesion: Session) -> None:
    pendientes = sesion.info.pop(LOTE_SESION, None)
    if pendientes:
        sesion.execute(insert(Notificacion.__table__), pendientes)
