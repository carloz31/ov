"""Auditoría plataforma (D-B1): el ingreso limita las verificaciones Argon2 simultáneas, y quien espera turno no retiene
una conexión. Contraseñas de `datos/usuarios_prueba.txt`; DATO DE PRUEBA."""

import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.core.parametros import VERIFICACIONES_CONTRASENA_SIMULTANEAS
from app.services import acceso
from datos import ruta


CREDENCIALES = {codigo: (correo, clave) for codigo, _, _, _, correo, clave in ruta.CUENTAS}


def test_el_ingreso_limita_las_verificaciones_y_la_espera_no_retiene_conexiones(cliente_sin_token, aplicacion,
                                                                                  monkeypatch):
    original = acceso.verificar_contrasena
    candado = threading.Lock()
    estado = {'activas': 0, 'maximo': 0, 'conexiones': 0}
    pool = aplicacion.state.motor_bd.pool

    def lenta(hash_guardado, contrasena):
        with candado:
            estado['activas'] += 1
            estado['maximo'] = max(estado['maximo'], estado['activas'])
            estado['conexiones'] = max(estado['conexiones'], pool.checkedout())
        time.sleep(0.15)
        try:
            return original(hash_guardado, contrasena)
        finally:
            with candado:
                estado['activas'] -= 1

    monkeypatch.setattr(acceso, 'verificar_contrasena', lenta)
    correo, clave = CREDENCIALES['est-ana']
    n = VERIFICACIONES_CONTRASENA_SIMULTANEAS * 3
    with ThreadPoolExecutor(n) as hilos:
        respuestas = list(hilos.map(lambda _: cliente_sin_token.post(
            '/sesion/ingresar', json={'usuario': correo, 'contrasena': clave}), range(n)))
    assert [r.status_code for r in respuestas] == [200] * n
    assert estado['maximo'] == VERIFICACIONES_CONTRASENA_SIMULTANEAS
    # Solo las transacciones con turno tienen conexión: las que esperan no la toman.
    assert estado['conexiones'] <= VERIFICACIONES_CONTRASENA_SIMULTANEAS
