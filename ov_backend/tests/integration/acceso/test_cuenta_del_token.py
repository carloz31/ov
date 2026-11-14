"""Auditoría plataforma (D-B4): el guardia lee la cuenta del token una vez y la deja para la petición; los rechazos
siguen igual (token inválido, cuenta inactiva, otra cuenta, rol equivocado). DATO DE PRUEBA."""

from sqlalchemy import update

from app import models as m
from soporte_acceso import token_de
from soporte_consultas import ContadorConsultas


def _con_token(cliente, codigo, ruta):
    return cliente.get(ruta, headers={'Authorization': f'Bearer {token_de(cliente.app, codigo)}'})


def test_la_cuenta_del_token_se_lee_una_vez_por_peticion(cliente, aplicacion):
    for ruta, consultas in (('/sesion', 1), ('/cuentas/est-ana/presentaciones', 2)):
        cliente.get(ruta)
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            assert cliente.get(ruta).status_code == 200
        assert contador.cantidad == consultas, contador.diagnostico
        assert sum('FROM cuenta' in e.sentencia for e in contador.ejecuciones) == 1, contador.diagnostico


def test_los_rechazos_de_acceso_no_cambian(cliente_sin_token, aplicacion):
    assert cliente_sin_token.get('/cuentas/est-ana/resumen',
                                 headers={'Authorization': 'Bearer no-es-un-token'}).status_code == 401
    # Otra cuenta sin política: 404, como siempre.
    assert _con_token(cliente_sin_token, 'est-ana', '/cuentas/est-luis/resumen').status_code == 404
    # Rol equivocado: un estudiante no lee el panel de su salón.
    assert _con_token(cliente_sin_token, 'est-ana', '/cuentas/est-ana/panel/seguimiento').status_code in (403, 404)
    # Cuenta desactivada con un token todavía vigente: 401.
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.execute(update(m.Cuenta).where(m.Cuenta.codigo == 'est-ana').values(activa=False))
    assert _con_token(cliente_sin_token, 'est-ana', '/cuentas/est-ana/resumen').status_code == 401
    assert _con_token(cliente_sin_token, 'est-ana', '/sesion').status_code == 401
