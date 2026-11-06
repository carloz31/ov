"""Ajuste presentaciones-vistas: qué presentaciones de primera visita ya cerró cada cuenta."""

from sqlalchemy import select

from app.models import PresentacionVista
from datos.fijos import PRESENTACIONES
from soporte_ruta import pedir


def presentaciones(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/presentaciones')


def marcar(cliente, codigo, esperado=200, cuenta='est-ana', fecha=None):
    cuerpo = {'cuenta': cuenta, 'codigo': codigo} | ({'fecha_hora': fecha} if fecha else {})
    return pedir(cliente, 'POST', '/acciones/presentacion-vista', cuerpo, esperado)


def test_el_catalogo_tiene_las_vistas_del_estudiante():
    assert len(PRESENTACIONES) == 18
    assert {audiencia for _, audiencia in PRESENTACIONES} == {'ESTUDIANTE'}


def test_al_inicio_ninguna_vista_y_marcar_las_agrega_ordenadas(cliente):
    assert presentaciones(cliente) == {'vistas': []}
    assert marcar(cliente, 'missions') == {'vistas': ['missions']}
    assert marcar(cliente, 'journal') == {'vistas': ['journal', 'missions']}
    assert presentaciones(cliente) == {'vistas': ['journal', 'missions']}
    # Cada cuenta tiene las suyas.
    assert presentaciones(cliente, 'est-luis') == {'vistas': []}


def test_marcar_dos_veces_conserva_la_primera_fecha(cliente, aplicacion):
    marcar(cliente, 'resources', fecha='2026-10-20T10:00:00')
    assert marcar(cliente, 'resources', fecha='2026-10-21T10:00:00') == {'vistas': ['resources']}
    with aplicacion.state.fabrica_sesiones() as sesion:
        filas = sesion.scalars(select(PresentacionVista)).all()
    assert [fila.vista_en.isoformat() for fila in filas] == ['2026-10-20T10:00:00']


def test_codigo_inexistente_es_entrada_invalida(cliente):
    assert marcar(cliente, 'no-existe', esperado=422)['detail']['mensaje'] == 'La presentación no existe'
    assert presentaciones(cliente) == {'vistas': []}


def test_solo_los_estudiantes_marcan(cliente):
    for cuenta in ('apo-rosa', 'ori-carmen'):
        respuesta = marcar(cliente, 'missions', esperado=409, cuenta=cuenta)
        assert respuesta['detail']['mensaje'] == 'Esta acción solo está permitida para estudiantes'
