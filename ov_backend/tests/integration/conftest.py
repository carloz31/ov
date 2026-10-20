"""Plantillas por sesión y copias aisladas por prueba y por proceso de xdist."""

from functools import partial

import pytest
from fastapi.testclient import TestClient
from soporte_acceso import ClienteConToken
from soporte_bases import copiar_plantilla
from soporte_consultas import MedidorPeticiones
from soporte_fixtures import contador_consultas
from soporte_retiro import base_aislada as abrir_base_aislada

from app.main import crear_aplicacion
from datos.cargar import preparar_base


@pytest.fixture(scope='session')
def plantillas_bd(tmp_path_factory):
    carpeta = tmp_path_factory.mktemp('plantillas')
    plantillas = {}
    for conjunto in ('ruta',):
        archivo = carpeta / f'plantilla-{conjunto}.db'
        preparar_base(f'sqlite:///{archivo.as_posix()}', conjunto, crear_tablas=True)
        plantillas[conjunto] = archivo
    return plantillas


@pytest.fixture
def url_base_ruta(plantillas_bd, tmp_path):
    return copiar_plantilla(plantillas_bd['ruta'], tmp_path / 'ruta.db')


@pytest.fixture
def aplicacion(url_base_ruta):
    aplicacion = crear_aplicacion(url_base_ruta)
    try:
        yield aplicacion
    finally:
        aplicacion.state.motor_bd.dispose()


@pytest.fixture
def base_aislada(plantillas_bd):
    return partial(abrir_base_aislada, plantilla=plantillas_bd['ruta'])


@pytest.fixture
def cliente(aplicacion):
    with ClienteConToken(aplicacion) as cliente:
        yield cliente


@pytest.fixture
def cliente_sin_token(aplicacion):
    with TestClient(aplicacion) as cliente:
        yield cliente


@pytest.fixture
def sesion(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones() as sesion:
        yield sesion


@pytest.fixture
def medidor_peticiones(cliente, aplicacion):
    return MedidorPeticiones(cliente, aplicacion.state.motor_bd)
