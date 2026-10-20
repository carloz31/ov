"""B17 · HU-001: ingreso con correo y contraseña, mensaje único, cuenta inactiva y bloqueo temporal."""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import select, update

from app import models as m
from app.dependencies import obtener_ahora
from app.services.acceso import leer_token


CREDENCIALES = {'est-ana': ('ana.estudiante@example.com', 'Ana2026!'),
                'apo-rosa': ('rosa.apoderada@example.com', 'Rosa2026!'),
                'ori-carmen': ('carmen.orientadora@example.com', 'Carmen2026!')}
AHORA = datetime(2026, 10, 7, 10, 0)  # DATO DE PRUEBA: reloj fijo del bloqueo.


def ingresar(cliente, usuario, contrasena):
    return cliente.post('/sesion/ingresar', json={'usuario': usuario, 'contrasena': contrasena})


@pytest.fixture
def reloj(aplicacion):
    actual = {'ahora': AHORA}
    aplicacion.dependency_overrides[obtener_ahora] = lambda: actual['ahora']
    yield actual
    aplicacion.dependency_overrides.pop(obtener_ahora, None)


@pytest.mark.parametrize(('codigo', 'rol'), [('est-ana', 'ESTUDIANTE'), ('apo-rosa', 'APODERADO'),
                                             ('ori-carmen', 'ORIENTADORA')])
def test_cada_rol_ingresa_y_recibe_su_token(cliente_sin_token, aplicacion, codigo, rol):
    correo, contrasena = CREDENCIALES[codigo]
    respuesta = ingresar(cliente_sin_token, f'  {correo.upper()} ', contrasena)
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo['cuenta']['codigo'] == codigo and cuerpo['cuenta']['rol'] == rol
    datos = leer_token(cuerpo['token'], aplicacion.state.configuracion.jwt_secreto)
    assert (datos['sub'], datos['rol'], datos['origen']) == (codigo, rol, 'CONTRASENA')
    assert datos['exp'] - datos['iat'] == 24 * 3600


def test_mismo_mensaje_para_correo_inexistente_y_contrasena_incorrecta(cliente_sin_token):
    inexistente = ingresar(cliente_sin_token, 'nadie@example.com', 'Ana2026!')
    incorrecta = ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'otra')
    assert inexistente.status_code == incorrecta.status_code == 401
    assert inexistente.json() == incorrecta.json() == {'detail': {'mensaje': 'Usuario o contraseña incorrectos'}}


def test_cuenta_inactiva_responde_403_solo_con_la_contrasena_correcta(cliente_sin_token, sesion):
    sesion.execute(update(m.Cuenta).where(m.Cuenta.codigo == 'est-ana').values(activa=False))
    sesion.commit()
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'otra').status_code == 401
    respuesta = ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!')
    assert respuesta.status_code == 403
    assert respuesta.json()['detail']['mensaje'] == 'Tu cuenta está desactivada. Consulta con tu colegio.'


def test_cuenta_sin_hash_no_ingresa_con_contrasena(cliente_sin_token, sesion):
    sesion.execute(update(m.Cuenta).where(m.Cuenta.codigo == 'est-ana').values(contrasena_hash=None))
    sesion.commit()
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!').status_code == 401


def test_bloqueo_al_quinto_fallo_y_desbloqueo_pasado_el_plazo(cliente_sin_token, sesion, reloj):
    for _ in range(5):
        assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'otra').status_code == 401
    bloqueado = ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!')
    assert bloqueado.status_code == 429
    assert bloqueado.json()['detail']['mensaje'] == 'Demasiados intentos. Espera unos minutos.'
    assert sesion.scalar(select(m.Cuenta.bloqueada_hasta).where(m.Cuenta.codigo == 'est-ana')) == (
        AHORA + timedelta(minutes=15))
    reloj['ahora'] = AHORA + timedelta(minutes=14)
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!').status_code == 429
    reloj['ahora'] = AHORA + timedelta(minutes=15, seconds=1)
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!').status_code == 200
    sesion.expire_all()
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    assert (cuenta.intentos_fallidos, cuenta.bloqueada_hasta) == (0, None)


def test_ingreso_correcto_reinicia_los_intentos(cliente_sin_token, sesion, reloj):
    for _ in range(4):
        ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'otra')
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'Ana2026!').status_code == 200
    assert ingresar(cliente_sin_token, 'ana.estudiante@example.com', 'otra').status_code == 401
    assert sesion.scalar(select(m.Cuenta.intentos_fallidos).where(m.Cuenta.codigo == 'est-ana')) == 1
