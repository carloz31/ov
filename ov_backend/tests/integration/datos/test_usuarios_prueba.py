"""B17: `datos/usuarios_prueba.txt` coincide con las cuentas de `ruta` y el cargador guarda correo normalizado y hash."""

from pathlib import Path

from sqlalchemy import select

from app import models as m
from app.services import acceso
from datos import ruta


ARCHIVO = Path(ruta.__file__).with_name('usuarios_prueba.txt')


def _usuarios_del_archivo():
    filas = [linea for linea in ARCHIVO.read_text(encoding='utf-8').splitlines()
             if linea.strip() and not linea.startswith('#')]
    return {tuple(parte.strip() for parte in fila.split('|')) for fila in filas}


def test_archivo_coincide_con_ruta():
    assert _usuarios_del_archivo() == {(c, r, correo, contrasena) for c, _, r, _, correo, contrasena in ruta.CUENTAS}


def test_carga_guarda_correo_y_hash_verificable(sesion):
    cuentas = {cuenta.codigo: cuenta for cuenta in sesion.scalars(select(m.Cuenta))}
    for codigo, _, _, _, correo, contrasena in ruta.CUENTAS:
        cuenta = cuentas[codigo]
        assert cuenta.correo == acceso.normalizar_correo(correo)
        assert cuenta.contrasena_hash != contrasena
        assert acceso.verificar_contrasena(cuenta.contrasena_hash, contrasena)
        assert cuenta.intentos_fallidos == 0 and cuenta.bloqueada_hasta is None
