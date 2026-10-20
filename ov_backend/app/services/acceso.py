"""Acceso (B17): contraseñas, tokens y política de qué cuenta puede actuar sobre cuál."""

from functools import cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.models import Cuenta, OrientadoraSalon, VinculoFamiliar


_HASHER = PasswordHasher()


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
