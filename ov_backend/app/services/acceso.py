"""Acceso (B17): contraseñas, tokens y política de qué cuenta puede actuar sobre cuál."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import cache

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.parametros import DURACION_TOKEN_HORAS, MAXIMO_INTENTOS_INGRESO, MINUTOS_BLOQUEO_INGRESO
from app.exceptions import ErrorAccion
from app.models import Cuenta, OrientadoraSalon, OrigenSesion, Rol, Salon, VinculoFamiliar
from app.schemas.cuentas import CuentaResumen
from app.schemas.sesion import HijoSesion, IngresoRespuesta, SalonSesion, SesionRespuesta


_HASHER = PasswordHasher()
_ALGORITMO = 'HS256'
MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos'
MENSAJE_BLOQUEO = 'Demasiados intentos. Espera unos minutos.'
MENSAJE_INACTIVA = 'Tu cuenta está desactivada. Consulta con tu colegio.'


class TokenInvalido(Exception):
    """Sin token, con firma inválida, vencido o mal formado."""


@dataclass(frozen=True, slots=True)
class Actor:
    """Quién hace la petición, según el token; solo valores simples (no la fila de la sesión)."""
    id: int
    codigo: str
    rol: Rol
    expira_en: datetime


def normalizar_correo(correo: str) -> str:
    return correo.strip().lower()


def generar_hash(contrasena: str) -> str:
    return _HASHER.hash(contrasena)


@cache
def _hash_fijo() -> str:
    # Se verifica contra él cuando el correo no existe, para que el tiempo no revele qué correos existen.
    return _HASHER.hash('sin-cuenta')


def verificar_contrasena(contrasena_hash: str | None, contrasena: str) -> bool:
    try:
        valida = _HASHER.verify(contrasena_hash or _hash_fijo(), contrasena)
    except (VerificationError, InvalidHashError):
        return False
    return valida and bool(contrasena_hash)


def es_propia(sesion: Session, actor_id: int, objetivo_id: int) -> bool:
    return actor_id == objetivo_id


def es_hijo_vinculado(sesion: Session, actor_id: int, objetivo_id: int) -> bool:
    return bool(sesion.scalar(select(exists().where(
        VinculoFamiliar.apoderado_id == actor_id, VinculoFamiliar.estudiante_id == objetivo_id,
        VinculoFamiliar.es_activo))))


def es_de_su_salon(sesion: Session, actor_id: int, objetivo_id: int) -> bool:
    return bool(sesion.scalar(select(exists().where(
        OrientadoraSalon.orientadora_id == actor_id, OrientadoraSalon.salon_id == Cuenta.salon_id,
        Cuenta.id == objetivo_id))))


def emitir_token(cuenta: Cuenta, origen: OrigenSesion, secreto: str,
                 ahora: datetime | None = None) -> tuple[str, datetime]:
    """Único punto de emisión: todo ingreso (contraseña y, después, Google) termina aquí."""
    emitido = ahora or datetime.now(UTC)
    expira_en = emitido + timedelta(hours=DURACION_TOKEN_HORAS)
    datos = {'sub': cuenta.codigo, 'rol': str(cuenta.rol), 'origen': str(origen), 'iat': emitido, 'exp': expira_en}
    return jwt.encode(datos, secreto, algorithm=_ALGORITMO), expira_en


def leer_token(token: str, secreto: str) -> dict:
    try:
        return jwt.decode(token, secreto, algorithms=[_ALGORITMO], options={'require': ['sub', 'exp', 'iat']})
    except jwt.PyJWTError as error:
        raise TokenInvalido from error


def ingresar(sesion: Session, usuario: str, contrasena: str, ahora: datetime, secreto: str) -> IngresoRespuesta | None:
    """Devuelve None si las credenciales no corresponden; el llamador confirma el intento antes de responder 401."""
    cuenta = sesion.scalar(select(Cuenta).where(Cuenta.correo == normalizar_correo(usuario)))
    if cuenta is not None and cuenta.bloqueada_hasta is not None and cuenta.bloqueada_hasta > ahora:
        raise ErrorAccion(MENSAJE_BLOQUEO, estado_http=429)
    if not verificar_contrasena(None if cuenta is None else cuenta.contrasena_hash, contrasena):
        if cuenta is not None:
            cuenta.intentos_fallidos += 1
            if cuenta.intentos_fallidos >= MAXIMO_INTENTOS_INGRESO:
                cuenta.bloqueada_hasta = ahora + timedelta(minutes=MINUTOS_BLOQUEO_INGRESO)
                cuenta.intentos_fallidos = 0
        return None
    if not cuenta.activa:
        raise ErrorAccion(MENSAJE_INACTIVA, estado_http=403)
    cuenta.intentos_fallidos = 0
    cuenta.bloqueada_hasta = None
    token, expira_en = emitir_token(cuenta, OrigenSesion.CONTRASENA, secreto)
    return IngresoRespuesta(token=token, expira_en=expira_en, cuenta=CuentaResumen.model_validate(cuenta))


def consultar_sesion(sesion: Session, actor: Actor) -> SesionRespuesta:
    cuenta = sesion.get(Cuenta, actor.id)
    hijos, salones = [], []
    if actor.rol == Rol.APODERADO:
        filas = sesion.execute(
            select(Cuenta.codigo, Cuenta.nombre, Salon.codigo, VinculoFamiliar.parentesco)
            .join(VinculoFamiliar, VinculoFamiliar.estudiante_id == Cuenta.id)
            .outerjoin(Salon, Salon.id == Cuenta.salon_id)
            .where(VinculoFamiliar.apoderado_id == actor.id, VinculoFamiliar.es_activo).order_by(Cuenta.codigo))
        hijos = [HijoSesion(codigo=c, nombre=n, salon=s, parentesco=p) for c, n, s, p in filas]
    elif actor.rol == Rol.ORIENTADORA:
        filas = sesion.execute(
            select(Salon.codigo, Salon.nombre, OrientadoraSalon.es_principal)
            .join(OrientadoraSalon, OrientadoraSalon.salon_id == Salon.id)
            .where(OrientadoraSalon.orientadora_id == actor.id).order_by(Salon.codigo))
        salones = [SalonSesion(codigo=c, nombre=n, es_principal=p) for c, n, p in filas]
    return SesionRespuesta(cuenta=CuentaResumen.model_validate(cuenta), expira_en=actor.expira_en,
                           hijos=hijos, salones=salones)
