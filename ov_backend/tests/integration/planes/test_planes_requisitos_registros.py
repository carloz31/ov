"""Ajuste registros §1.3: `planes_listos_para_comparar(n, secciones)`. Con `secciones` vacía basta que existan los
planes (b4-5); con `('POR_QUE',)`, que tengan «Por qué» (b4-1). Por defecto, las secciones `para_comparar` (ruta)."""

from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.services.motor.evaluadores import EVALUADORES
from app.services.planes.consultas import contar_listos_para_comparar
from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO
from soporte_planes import abrir_planes, crear, guardar, por_que_lista


def contar(aplicacion, secciones=None):
    with aplicacion.state.fabrica_sesiones() as sesion:
        cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        return usar_contexto(contar_listos_para_comparar)(sesion, cuenta, secciones)


def test_requisitos_de_plan_parametrizables(cliente, aplicacion):
    abrir_planes(cliente)
    crear(cliente, ENFERMERIA)
    crear(cliente, PERIODISMO)
    assert contar(aplicacion, ()) == 2
    assert contar(aplicacion, ('POR_QUE',)) == 0
    assert contar(aplicacion) == 0
    guardar(cliente, ENFERMERIA, 'POR_QUE', por_que_lista())
    assert contar(aplicacion, ('POR_QUE',)) == 1
    # Sin REALIDAD, el valor por defecto (el de `ruta`) sigue exigiendo las dos secciones para comparar.
    assert contar(aplicacion) == 0


def test_los_evaluadores_de_registros_estan_registrados():
    assert EVALUADORES['planes_creados'].keywords == {'secciones': ()}
    assert EVALUADORES['planes_con_por_que'].keywords == {'secciones': ('POR_QUE',)}
