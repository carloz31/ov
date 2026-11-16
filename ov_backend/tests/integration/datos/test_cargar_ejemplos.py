"""Ajuste desbloqueos: `datos.cargar contenido` siembra los estudiantes de ejemplo del panel por defecto, también con
ENTORNO=produccion (la siembra va en otro proceso con ENTORNO=desarrollo forzado solo para él); `--sin-ejemplos` y
`ruta` no siembran, y un fallo de la siembra deja la base con `contenido`, sin ejemplos."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from app.main import crear_aplicacion
from app.services.acceso import emitir_token
from datos import cargar as carga

SECRETO = 'DATO DE PRUEBA: secreto de produccion de mas de 32 caracteres'


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "carga.db").as_posix()}'
    motor = crear_motor_bd(url)
    m.Base.metadata.create_all(motor)
    motor.dispose()
    monkeypatch.setenv('DATABASE_URL', url)
    monkeypatch.setenv('ANTHROPIC_API_KEY', '')
    return url


def ejemplos(url):
    motor = crear_motor_bd(url)
    try:
        with Session(motor) as sesion:
            return (sesion.scalar(select(func.count()).select_from(m.Cuenta).where(m.Cuenta.codigo.like('est-panel-%'))),
                    sesion.scalar(select(func.count()).select_from(m.Actividad)))
    finally:
        motor.dispose()


@pytest.mark.parametrize('entorno', ['desarrollo', 'produccion'])
def test_contenido_siembra_los_ejemplos_por_defecto(base, monkeypatch, entorno):
    monkeypatch.setenv('ENTORNO', entorno)
    monkeypatch.setenv('JWT_SECRETO', SECRETO)
    assert carga.main(['contenido']) == 0
    panel, actividades = ejemplos(base)
    assert panel == 11 and actividades > 0


def test_sin_ejemplos_y_con_ruta_no_siembra(base, monkeypatch):
    llamadas = []
    monkeypatch.setattr(carga, '_sembrar_ejemplos', lambda url: llamadas.append(url) or 0)
    monkeypatch.setenv('ENTORNO', 'produccion')
    monkeypatch.setenv('JWT_SECRETO', SECRETO)
    assert carga.main(['contenido', '--sin-ejemplos']) == 0
    assert carga.main(['ruta', '--vaciar']) == 0
    assert llamadas == [] and ejemplos(base)[0] == 0


def test_si_la_siembra_falla_la_base_queda_con_contenido_sin_ejemplos(base, monkeypatch, capsys):
    def a_medias(url):
        motor = crear_motor_bd(url)
        with Session(motor) as sesion, sesion.begin():
            salon = sesion.scalar(select(m.Salon).where(m.Salon.codigo == '5A'))
            sesion.add(m.Cuenta(codigo='est-panel-1', nombre='DATO DE PRUEBA', rol=m.Rol.ESTUDIANTE, salon_id=salon.id))
        motor.dispose()
        return 1
    monkeypatch.setattr(carga, '_sembrar_ejemplos', a_medias)
    monkeypatch.setenv('ENTORNO', 'desarrollo')
    assert carga.main(['contenido']) == carga.CODIGO_SIEMBRA_FALLIDA
    assert 'no se pudieron sembrar los estudiantes de ejemplo' in capsys.readouterr().err
    panel, actividades = ejemplos(base)
    assert panel == 0 and actividades > 0


def test_el_backend_en_produccion_sigue_ignorando_la_fecha_del_cliente(base, monkeypatch):
    monkeypatch.setenv('ENTORNO', 'produccion')
    monkeypatch.setenv('JWT_SECRETO', SECRETO)
    assert carga.main(['contenido', '--sin-ejemplos']) == 0
    aplicacion = crear_aplicacion(base)
    try:
        with Session(aplicacion.state.motor_bd) as sesion:
            ana = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
            token, _ = emitir_token(ana, m.OrigenSesion.CONTRASENA, aplicacion.state.configuracion.jwt_secreto)
        with TestClient(aplicacion) as cliente:
            respuesta = cliente.post('/acciones/completar-actividad', headers={'Authorization': f'Bearer {token}'},
                                     json={'cuenta': 'est-ana', 'actividad': 'b0-1', 'fecha_hora': '2020-01-01T10:00:00'})
        assert respuesta.status_code == 200, respuesta.text
        with Session(aplicacion.state.motor_bd) as sesion:
            fechas = sesion.scalars(select(m.EventoUso.fecha_hora)).all()
        assert fechas and all(f.year != 2020 for f in fechas)
    finally:
        aplicacion.state.motor_bd.dispose()
