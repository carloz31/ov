"""Configuración de la aplicación, sin selección de conjuntos de datos."""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


RAIZ_PROYECTO = Path(__file__).resolve().parents[1]
RUTA_ENV = Path(__file__).resolve().parent.parent / '.env'
# Solo para desarrollo y pruebas; en producción JWT_SECRETO es obligatorio.
JWT_SECRETO_DESARROLLO = 'secreto-de-desarrollo-no-usar-en-produccion'
LARGO_MINIMO_JWT_SECRETO = 32


class ErrorConfiguracionRegistro(RuntimeError):
    """Mensaje propio, seguro para mostrar al arrancar."""


@dataclass(frozen=True, slots=True)
class Configuracion:
    url_bd: str = f'sqlite:///{(RAIZ_PROYECTO / "ov.db").as_posix()}'
    entorno: str = 'desarrollo'
    jwt_secreto: str = field(default=JWT_SECRETO_DESARROLLO, repr=False)
    # Sin clave la aplicación arranca igual y toda llamada al LLM falla.
    clave_anthropic: str | None = field(default=None, repr=False)


def cargar_configuracion(
    entorno: Mapping[str, str] | None = None, ruta_env: Path = RUTA_ENV,
) -> Configuracion:
    try:
        valores = dotenv_values(ruta_env, interpolate=False)
    except (OSError, UnicodeError):
        raise ErrorConfiguracionRegistro('No se pudo leer la configuración de registro desde .env') from None
    variables = os.environ if entorno is None else entorno
    def leer(nombre, defecto):
        return variables.get(nombre, valores.get(nombre, defecto))

    ambiente = leer('ENTORNO', 'desarrollo')
    if ambiente not in ('desarrollo', 'produccion'):
        raise ValueError('ENTORNO debe ser desarrollo o produccion')
    jwt_secreto = (leer('JWT_SECRETO', '') or '').strip()
    if ambiente == 'produccion' and len(jwt_secreto) < LARGO_MINIMO_JWT_SECRETO:
        raise ValueError(f'JWT_SECRETO es obligatorio en produccion y debe tener al menos {LARGO_MINIMO_JWT_SECRETO} caracteres')
    url_bd = leer('DATABASE_URL', 'sqlite:///ov.db')
    if not url_bd or not url_bd.strip():
        raise ValueError('DATABASE_URL no puede estar vacía')
    try:
        url = make_url(url_bd)
    except (ArgumentError, ValueError):
        raise ValueError('DATABASE_URL no es una URL válida') from None
    if url.get_backend_name() == 'sqlite' and url.database not in (None, '', ':memory:'):
        ruta = Path(url.database)
        if not ruta.is_absolute():
            ruta = RAIZ_PROYECTO / ruta
        url_bd = url.set(database=ruta.as_posix()).render_as_string(hide_password=False)
    clave_anthropic = (leer('ANTHROPIC_API_KEY', '') or '').strip() or None
    return Configuracion(url_bd, ambiente, jwt_secreto or JWT_SECRETO_DESARROLLO, clave_anthropic)


def crear_cliente_llm(configuracion: Configuracion):
    """El cliente del LLM (registros, guion y pasos del plan): Claude con `ANTHROPIC_API_KEY`; sin clave, toda llamada
    falla."""
    from app.services.registro.llm import ClienteClaude, ClienteSinClave
    return ClienteClaude(configuracion.clave_anthropic) if configuracion.clave_anthropic else ClienteSinClave()

