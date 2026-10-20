"""B17 · RNF-11: toda ruta pasa por el guardia y ninguna cuenta actúa sobre otra.

Recorre las rutas publicadas (`openapi`) en lugar de una lista escrita a mano: una ruta nueva queda cubierta sola.
"""

import re

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from soporte_acceso import ClienteConToken, token_de

from app.dependencies import CuentaConsultada, guardia, politica_acceso
from app.main import crear_aplicacion
from app.services.acceso import es_hijo_vinculado


# Fuera del guardia: el ingreso y lo que solo existe en desarrollo.
LISTA_BLANCA = {('POST', '/sesion/ingresar'), ('POST', '/desarrollo/reiniciar'), ('POST', '/eventos'),
                ('GET', '/cuentas')}
ACTORES_AJENOS = ('est-luis', 'apo-rosa', 'ori-carmen')  # mismo salón, su madre y su orientadora
_PARAMETRO = re.compile(r'\{([^}]+)\}')


def _rutas(aplicacion):
    esquema = aplicacion.openapi()
    componentes = esquema.get('components', {}).get('schemas', {})
    for ruta, operaciones in esquema['paths'].items():
        for metodo, operacion in operaciones.items():
            referencia = (operacion.get('requestBody', {}).get('content', {}).get('application/json', {})
                          .get('schema', {}).get('$ref', ''))
            campos = componentes.get(referencia.rsplit('/', 1)[-1], {}).get('properties', {})
            yield metodo.upper(), ruta, campos


def _concreta(ruta):
    return _PARAMETRO.sub(lambda p: 'est-ana' if p.group(1) == 'cuenta' else 'x', ruta)


def _cuerpo(campos):
    if 'cuenta' in campos:
        return {'cuenta': 'est-ana'}
    if 'autores' in campos:
        return {'autores': ['est-ana']}
    return {}


def test_toda_ruta_fuera_de_la_lista_blanca_exige_token(aplicacion, cliente_sin_token):
    protegidas = [(m, r, c) for m, r, c in _rutas(aplicacion) if (m, r) not in LISTA_BLANCA]
    assert len(protegidas) > 70
    for metodo, ruta, campos in protegidas:
        respuesta = cliente_sin_token.request(metodo, _concreta(ruta), json=_cuerpo(campos) if campos else {})
        assert respuesta.status_code == 401, (metodo, ruta, respuesta.text)


def test_lista_blanca_es_exacta(aplicacion):
    assert {(m, r) for m, r, _ in _rutas(aplicacion)} >= LISTA_BLANCA


@pytest.mark.parametrize('actor', ACTORES_AJENOS)
def test_ninguna_cuenta_actua_sobre_otra(aplicacion, cliente_sin_token, actor):
    cabecera = {'Authorization': f'Bearer {token_de(aplicacion, actor)}'}
    con_objetivo = [(m, r, c) for m, r, c in _rutas(aplicacion) if (m, r) not in LISTA_BLANCA
                    and ('{cuenta}' in r or 'cuenta' in c or 'autores' in c)]
    assert sum('{cuenta}' in r for _, r, _ in con_objetivo) >= 37
    assert sum('cuenta' in c for _, _, c in con_objetivo) > 30
    for metodo, ruta, campos in con_objetivo:
        # Basta un cuerpo mínimo: el guardia corre antes de validar.
        respuesta = cliente_sin_token.request(metodo, _concreta(ruta), json=_cuerpo(campos), headers=cabecera)
        assert respuesta.status_code == 404, (actor, metodo, ruta, respuesta.text)
        assert respuesta.json() == {'detail': 'Cuenta no encontrada'}


def test_cuerpo_invalido_sin_token_responde_401_antes_de_validar(cliente_sin_token):
    assert cliente_sin_token.post('/acciones/completar-actividad', content=b'no es json').status_code == 401


def test_accion_con_fecha_tras_el_guardia_no_choca_con_la_transaccion(cliente):
    respuesta = cliente.post('/acciones/completar-actividad', json={
        'cuenta': 'est-ana', 'actividad': 't-inicio', 'fecha_hora': '2026-10-07T10:00:00'})
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()['eventos_registrados'][0]['fecha_hora'] == '2026-10-07T10:00:00'


def test_una_ruta_puede_declarar_otra_politica(url_base_ruta):
    aplicacion = crear_aplicacion(url_base_ruta)
    router = APIRouter(dependencies=[Depends(guardia)])

    @router.get('/cuentas/{cuenta}/prueba-politica')
    @politica_acceso(es_hijo_vinculado)
    def prueba(cuenta_consultada: CuentaConsultada):
        return {'codigo': cuenta_consultada.codigo}

    aplicacion.include_router(router)
    try:
        with TestClient(aplicacion) as cliente:
            def pedir(actor, objetivo):
                return cliente.get(f'/cuentas/{objetivo}/prueba-politica',
                                   headers={'Authorization': f'Bearer {token_de(aplicacion, actor)}'}).status_code
            assert pedir('apo-rosa', 'est-ana') == 200
            assert pedir('apo-rosa', 'est-beto') == 404
            assert pedir('est-luis', 'est-ana') == 404
            assert pedir('est-ana', 'est-ana') == 200
    finally:
        aplicacion.state.motor_bd.dispose()


def test_en_produccion_no_hay_depuracion_ni_fecha_del_cliente(url_base_ruta, monkeypatch):
    monkeypatch.setenv('ENTORNO', 'produccion')
    monkeypatch.setenv('JWT_SECRETO', 'p' * 32)
    aplicacion = crear_aplicacion(url_base_ruta)
    try:
        with ClienteConToken(aplicacion) as cliente:
            rutas = {(m, r) for m, r, _ in _rutas(aplicacion)}
            assert not rutas & {('POST', '/eventos'), ('GET', '/cuentas'), ('POST', '/desarrollo/reiniciar')}
            assert cliente.get('/cuentas').status_code in (404, 405)
            assert cliente.post('/eventos', json={'cuenta': 'est-ana'}).status_code == 404
            respuesta = cliente.post('/acciones/completar-actividad', json={
                'cuenta': 'est-ana', 'actividad': 't-inicio', 'fecha_hora': '2020-01-01T10:00:00'})
            assert respuesta.status_code == 200, respuesta.text
            assert not respuesta.json()['eventos_registrados'][0]['fecha_hora'].startswith('2020-')
    finally:
        aplicacion.state.motor_bd.dispose()
