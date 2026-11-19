"""Ajuste planes-desbloqueo-completo: la migración 0061 sobre una base `contenido` con cuentas que ya avanzaron.

La base se arma con la plantilla de `contenido` (que ya trae las reglas nuevas), se estampa en head y se baja a 0060:
así queda como la base desplegada antes del ajuste. Las cuentas avanzan con las reglas viejas y después se sube.
"""

from contextlib import contextmanager
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from soporte_acceso import ClienteConToken
from soporte_bases import copiar_plantilla
from soporte_catalogo_ruta import PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_contenido import completar
from soporte_llm import ClientePrueba
from soporte_planes import crear, estados, guardar, plan, planes, por_que_lista
from soporte_ruta import pedir
from sqlalchemy import text

from app.database import crear_motor_bd
from app.main import crear_aplicacion
from app.services.desarrollo import TABLAS_DE_ESTADO


RUTA_CONFIGURACION = Path(__file__).resolve().parents[3] / 'alembic.ini'
REGLAS = {'R-PLAN-CONOCIMIENTO': 'b3-2', 'R-PLAN-REALIDAD': 'b3-8', 'R-PLAN-PASOS': 'b4-5'}
MENSAJES_ANTERIORES = {'R-PLAN-CONOCIMIENTO': 'Completa la misión «Mis intereses en el catálogo».',
                       'R-PLAN-REALIDAD': 'Completa la misión «Cuánto cuesta estudiar».',
                       'R-PLAN-PASOS': 'Completa la misión «Pongo a prueba mi orden».'}
MENSAJE_PLANES = 'Completa la misión «¿Tienes una opción en mente?».'
INICIO = ('b0-1', 'b0-2', 'b0-3', 'b0-4')
SIGUIENTE = 'b0-5'
TODAS_ABIERTAS = {'POR_QUE': 'LISTA', 'CONOCIMIENTO': 'POR_EMPEZAR', 'REALIDAD': 'POR_EMPEZAR', 'PASOS': 'POR_EMPEZAR'}


def _base_en_0060(plantilla, destino, monkeypatch):
    url = copiar_plantilla(plantilla, destino)
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    command.stamp(configuracion, 'head')
    command.downgrade(configuracion, '0060')
    return url, configuracion


@contextmanager
def _cliente(url):
    """Una aplicación nueva: arma la caché de definiciones al arrancar, como el reinicio del despliegue."""
    aplicacion = crear_aplicacion(url)
    aplicacion.state.cliente_llm = ClientePrueba()
    try:
        with ClienteConToken(aplicacion) as cliente:
            yield cliente
    finally:
        aplicacion.state.motor_bd.dispose()


def _consulta(url, sql, **parametros):
    motor = crear_motor_bd(url)
    try:
        with motor.connect() as conexion:
            return conexion.execute(text(sql), parametros).all()
    finally:
        motor.dispose()


def _condiciones(url):
    return dict(_consulta(url, (
        'SELECT r.codigo, a.codigo FROM regla_desbloqueo r JOIN condicion_desbloqueo c ON c.regla_id = r.id '
        "JOIN actividad a ON a.id = c.id_referencia WHERE r.codigo LIKE 'R-PLAN-%'")))


def _mensajes(url):
    return dict(_consulta(url, "SELECT codigo, mensaje_bloqueo FROM regla_desbloqueo WHERE codigo LIKE 'R-PLAN-%'"))


def _conteos_estado(url):
    return {tabla: _consulta(url, f'SELECT COUNT(*) FROM {tabla}')[0][0] for tabla in TABLAS_DE_ESTADO}


def _definiciones(url):
    return (_consulta(url, 'SELECT * FROM regla_desbloqueo ORDER BY id'),
            _consulta(url, 'SELECT * FROM condicion_desbloqueo ORDER BY id'))


def _hasta_b04(cliente, cuenta):
    for codigo in INICIO:
        completar(cliente, codigo, cuenta)


def _evento(cliente, cuenta, actividad):
    pedir(cliente, 'POST', '/eventos', {'cuenta': cuenta, 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': actividad})


def _sin_estado_de_secciones(respuesta):
    for plan_ in respuesta['planes']:
        for seccion in plan_['secciones']:
            seccion.pop('estado')
            seccion.pop('bloqueo')
    return respuesta


@pytest.fixture
def piloto(plantilla_contenido, tmp_path, monkeypatch):
    """Base en 0060 con tres estudiantes:
    - est-ana completó b0-4 y tiene un plan con «Por qué la elijo» guardado;
    - est-beto todavía no completó b0-4;
    - est-luis completó b0-4 y, con la regla vieja, ya abrió CONOCIMIENTO (b3-2, por evento crudo)."""
    url, configuracion = _base_en_0060(plantilla_contenido, tmp_path / 'piloto.db', monkeypatch)
    with _cliente(url) as cliente:
        _hasta_b04(cliente, 'est-ana')
        crear(cliente, PSICOLOGIA)
        guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
        _evento(cliente, 'est-luis', 'b0-4')
        _evento(cliente, 'est-luis', 'b3-2')
        crear(cliente, PSICOLOGIA, cuenta='est-luis')
        assert estados(plan(cliente, PSICOLOGIA)) == {
            'POR_QUE': 'LISTA', 'CONOCIMIENTO': 'BLOQUEADA', 'REALIDAD': 'BLOQUEADA', 'PASOS': 'BLOQUEADA'}
        assert estados(plan(cliente, PSICOLOGIA, 'est-luis')) == {
            'POR_QUE': 'POR_EMPEZAR', 'CONOCIMIENTO': 'POR_EMPEZAR', 'REALIDAD': 'BLOQUEADA', 'PASOS': 'BLOQUEADA'}
        planes(cliente, 'est-beto', esperado=409)
        antes = planes(cliente)
    return url, configuracion, antes


def test_bajar_a_0060_deja_las_reglas_viejas(piloto):
    url, _, _ = piloto
    assert _condiciones(url) == {'R-PLAN-POR_QUE': 'b0-4', **REGLAS}
    assert _mensajes(url) == {'R-PLAN-POR_QUE': MENSAJE_PLANES, **MENSAJES_ANTERIORES}


def test_quien_ya_completo_b04_recibe_las_secciones_con_su_siguiente_actividad(piloto):
    url, configuracion, antes = piloto
    command.upgrade(configuracion, 'head')
    assert _condiciones(url) == dict.fromkeys(('R-PLAN-POR_QUE', *REGLAS), 'b0-4')
    assert _mensajes(url) == dict.fromkeys(('R-PLAN-POR_QUE', *REGLAS), MENSAJE_PLANES)
    with _cliente(url) as cliente:
        # Sin evento nuevo nada cambia: los desbloqueos solo se crean al registrar eventos.
        despues = planes(cliente)
        assert estados(despues['planes'][0])['CONOCIMIENTO'] == 'BLOQUEADA'
        assert despues['planes'][0]['secciones'][1]['bloqueo'][0]['mensaje'] == MENSAJE_PLANES
        # El plan y su contenido quedan intactos.
        assert _sin_estado_de_secciones(despues) == _sin_estado_de_secciones(antes)
        completar(cliente, SIGUIENTE)
        assert estados(plan(cliente, PSICOLOGIA)) == TODAS_ABIERTAS


def test_quien_no_completo_b04_abre_planes_y_las_cuatro_secciones_con_ella(piloto):
    url, configuracion, _ = piloto
    command.upgrade(configuracion, 'head')
    with _cliente(url) as cliente:
        planes(cliente, 'est-beto', esperado=409)
        _hasta_b04(cliente, 'est-beto')
        crear(cliente, PSICOLOGIA, cuenta='est-beto')
        assert estados(plan(cliente, PSICOLOGIA, 'est-beto')) == dict(TODAS_ABIERTAS, POR_QUE='POR_EMPEZAR')


def test_quien_ya_tenia_una_seccion_abierta_la_conserva_sin_duplicados(piloto):
    url, configuracion, _ = piloto
    command.upgrade(configuracion, 'head')
    with _cliente(url) as cliente:
        assert estados(plan(cliente, PSICOLOGIA, 'est-luis'))['CONOCIMIENTO'] == 'POR_EMPEZAR'
        completar(cliente, 'b0-1', 'est-luis')
        assert estados(plan(cliente, PSICOLOGIA, 'est-luis')) == dict(TODAS_ABIERTAS, POR_QUE='POR_EMPEZAR')
    repetidos = _consulta(url, 'SELECT regla_id FROM desbloqueo GROUP BY cuenta_id, regla_id HAVING COUNT(*) > 1')
    assert repetidos == []
    # Las secciones del plan no se anuncian en la campana: b0-1 solo deja sus propias notificaciones.
    nuevas = _consulta(url, "SELECT n.referencia FROM notificacion n JOIN cuenta c ON c.id = n.cuenta_id "
                            "WHERE c.codigo = 'est-luis'")
    assert not {referencia for referencia, in nuevas} & {'POR_QUE', 'CONOCIMIENTO', 'REALIDAD', 'PASOS'}


def test_la_migracion_no_toca_tablas_de_estado_y_es_idempotente(piloto):
    url, configuracion, _ = piloto
    conteos = _conteos_estado(url)
    command.upgrade(configuracion, 'head')
    assert _conteos_estado(url) == conteos
    migradas = _definiciones(url)
    # Volver a correr el upgrade sobre lo ya migrado no cambia nada.
    command.stamp(configuracion, '0060')
    command.upgrade(configuracion, 'head')
    assert _definiciones(url) == migradas
    command.downgrade(configuracion, '0060')
    assert _conteos_estado(url) == conteos
    assert _condiciones(url) == {'R-PLAN-POR_QUE': 'b0-4', **REGLAS}
    assert _mensajes(url) == {'R-PLAN-POR_QUE': MENSAJE_PLANES, **MENSAJES_ANTERIORES}


def test_la_migracion_no_agrega_consultas(plantilla_contenido, tmp_path, monkeypatch):
    """Lo mismo en una base que se queda en 0060 y en otra que sube: completar la siguiente actividad y pedir los
    planes no hacen más consultas."""
    mediciones = {}
    for nombre, subir in (('vieja', False), ('nueva', True)):
        url, configuracion = _base_en_0060(plantilla_contenido, tmp_path / f'{nombre}.db', monkeypatch)
        with _cliente(url) as cliente:
            _hasta_b04(cliente, 'est-ana')
            crear(cliente, PSICOLOGIA)
        if subir:
            command.upgrade(configuracion, 'head')
        with _cliente(url) as cliente:
            motor = cliente.app.state.motor_bd
            with ContadorConsultas(motor) as completar_siguiente:
                completar(cliente, SIGUIENTE)
            with ContadorConsultas(motor) as pedir_planes:
                planes(cliente)
            mediciones[nombre] = (len(completar_siguiente.ejecuciones), len(pedir_planes.ejecuciones))
    # Completar hace las mismas; los planes, a lo más las mismas (sin secciones bloqueadas no se arman sus motivos).
    assert mediciones['nueva'][0] == mediciones['vieja'][0]
    assert mediciones['nueva'][1] <= mediciones['vieja'][1]


def test_en_ruta_la_migracion_no_hace_nada(plantillas_bd, tmp_path, monkeypatch):
    url, configuracion = _base_en_0060(plantillas_bd['ruta'], tmp_path / 'ruta.db', monkeypatch)
    definiciones = _definiciones(url)
    command.upgrade(configuracion, 'head')
    assert _definiciones(url) == definiciones
