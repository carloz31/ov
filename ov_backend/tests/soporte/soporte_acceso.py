"""B17: cliente de pruebas que firma el token de la cuenta que nombra cada petición, sin pasar por la contraseña."""

import re
from types import SimpleNamespace
from urllib.parse import urlsplit

from fastapi.testclient import TestClient

from app.models import OrigenSesion, Rol
from app.services.acceso import emitir_token
from datos import ruta


ROLES = {codigo: Rol(rol) for codigo, _, rol, *_ in ruta.CUENTAS}
CUENTA_POR_DEFECTO = 'est-ana'
_CUENTA_EN_RUTA = re.compile(r'^/cuentas/([^/]+)')


def cuenta_de_peticion(url, cuerpo) -> str:
    coincidencia = _CUENTA_EN_RUTA.match(urlsplit(str(url)).path)
    if coincidencia:
        return coincidencia.group(1)
    if isinstance(cuerpo, dict):
        if isinstance(cuerpo.get('cuenta'), str):
            return cuerpo['cuenta']
        if isinstance(cuerpo.get('autores'), list) and cuerpo['autores']:
            return cuerpo['autores'][0]
    return CUENTA_POR_DEFECTO


def _actor_de(codigo: str) -> str:
    # Una cuenta que no existe la pide una de la ruta: el guardia responde 404 «Cuenta no encontrada», como antes.
    return codigo if codigo in ROLES else CUENTA_POR_DEFECTO


def token_de(aplicacion, codigo: str) -> str:
    cuenta = SimpleNamespace(codigo=codigo, rol=ROLES.get(codigo, Rol.ESTUDIANTE))
    return emitir_token(cuenta, OrigenSesion.CONTRASENA, aplicacion.state.configuracion.jwt_secreto)[0]


class ClienteConToken(TestClient):
    """Agrega `Authorization` salvo que la petición ya lo traiga; así el guardia real corre en todas las pruebas."""

    def request(self, method, url, *args, **kwargs):
        cabeceras = dict(kwargs.get('headers') or {})
        if not any(nombre.lower() == 'authorization' for nombre in cabeceras):
            codigo = cuenta_de_peticion(url, kwargs.get('json'))
            cabeceras['Authorization'] = f'Bearer {token_de(self.app, _actor_de(codigo))}'
            kwargs['headers'] = cabeceras
        return super().request(method, url, *args, **kwargs)
