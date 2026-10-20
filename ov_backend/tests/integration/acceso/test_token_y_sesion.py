"""B17: el guardia rechaza tokens vencidos, ajenos o de cuentas inexistentes; `GET /sesion` según el rol."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from soporte_acceso import token_de
from sqlalchemy import update

from app import models as m
from app.services.acceso import emitir_token


def con_token(token):
    return {'Authorization': f'Bearer {token}'}


def token_de_ana(aplicacion, **opciones):
    ana = SimpleNamespace(codigo='est-ana', rol=m.Rol.ESTUDIANTE)
    secreto = opciones.pop('secreto', aplicacion.state.configuracion.jwt_secreto)
    return emitir_token(ana, m.OrigenSesion.CONTRASENA, secreto, **opciones)[0]


@pytest.mark.parametrize('cabecera', [
    None, {'Authorization': 'Bearer'}, {'Authorization': 'Basic abc'}, {'Authorization': 'Bearer no-es-un-jwt'}])
def test_sin_token_valido_responde_401_con_bearer(cliente_sin_token, cabecera):
    respuesta = cliente_sin_token.get('/cuentas/est-ana/resumen', headers=cabecera)
    assert respuesta.status_code == 401
    assert respuesta.headers['www-authenticate'] == 'Bearer'
    assert respuesta.json()['detail']['mensaje'] == 'Tu sesión terminó. Vuelve a ingresar.'


def test_token_vencido(cliente_sin_token, aplicacion):
    vencido = token_de_ana(aplicacion, ahora=datetime.now(UTC) - timedelta(hours=25))
    assert cliente_sin_token.get('/cuentas/est-ana/resumen', headers=con_token(vencido)).status_code == 401


def test_token_firmado_con_otro_secreto(cliente_sin_token, aplicacion):
    ajeno = token_de_ana(aplicacion, secreto='otro-secreto-de-al-menos-treinta-y-dos-caracteres')
    assert cliente_sin_token.get('/cuentas/est-ana/resumen', headers=con_token(ajeno)).status_code == 401


def test_token_de_cuenta_inexistente(cliente_sin_token, aplicacion):
    token = token_de(aplicacion, 'est-nadie')
    assert cliente_sin_token.get('/cuentas/est-nadie/resumen', headers=con_token(token)).status_code == 401


def test_desactivar_una_cuenta_corta_su_token_al_instante(cliente_sin_token, aplicacion, sesion):
    token = token_de(aplicacion, 'est-ana')
    assert cliente_sin_token.get('/cuentas/est-ana/resumen', headers=con_token(token)).status_code == 200
    sesion.execute(update(m.Cuenta).where(m.Cuenta.codigo == 'est-ana').values(activa=False))
    sesion.commit()
    assert cliente_sin_token.get('/cuentas/est-ana/resumen', headers=con_token(token)).status_code == 401


def test_sesion_del_estudiante_sin_hijos_ni_salones(cliente):
    respuesta = cliente.get('/sesion')
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo['cuenta'] == {'codigo': 'est-ana', 'nombre': 'Ana', 'rol': 'ESTUDIANTE'}
    assert (cuerpo['hijos'], cuerpo['salones']) == ([], [])
    assert cuerpo['expira_en']


def test_sesion_del_apoderado_trae_sus_hijos(cliente_sin_token, aplicacion):
    cuerpo = cliente_sin_token.get('/sesion', headers=con_token(token_de(aplicacion, 'apo-rosa'))).json()
    assert cuerpo['cuenta']['rol'] == 'APODERADO'
    assert cuerpo['hijos'] == [{'codigo': 'est-ana', 'nombre': 'Ana', 'salon': '5A', 'parentesco': 'madre'}]
    assert cuerpo['salones'] == []


def test_sesion_de_la_orientadora_trae_sus_salones(cliente_sin_token, aplicacion):
    cuerpo = cliente_sin_token.get('/sesion', headers=con_token(token_de(aplicacion, 'ori-carmen'))).json()
    assert cuerpo['cuenta']['rol'] == 'ORIENTADORA'
    assert cuerpo['hijos'] == []
    assert cuerpo['salones'] == [{'codigo': '5A', 'nombre': 'Quinto A', 'es_principal': True}]
