"""Ajuste registros §1.3: `contar_listos_para_comparar(secciones, prioridades)`. Con `secciones` vacía basta que
existan los planes; por defecto, las secciones `para_comparar` (ruta). Ajuste registros llm (lote 2): las reglas
R-b4-1 y R-b4-5 de `contenido` usan `por_que_en_planes` (el «Por qué» de los N primeros planes)."""

from types import SimpleNamespace

from sqlalchemy import select

from app import models as m
from app.core.contexto import ContextoConsultas, usar_contexto
from app.services.motor.evaluadores import EVALUADORES
from app.services.planes.consultas import contar_listos_para_comparar
from datos import contenido
from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO, PSICOLOGIA
from soporte_planes import abrir_planes, crear, guardar, por_que_lista


def contar(aplicacion, secciones=None, prioridades=None):
    with aplicacion.state.fabrica_sesiones() as sesion:
        cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        return usar_contexto(contar_listos_para_comparar)(sesion, cuenta, secciones, prioridades)


def cumple(aplicacion, regla):
    """Evalúa el evaluador de la regla de `contenido` con su parámetro, sobre los planes de est-ana."""
    evaluador, parametro = contenido.EVALUADORES_REGLAS[regla]
    with aplicacion.state.fabrica_sesiones() as sesion:
        cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        datos = ContextoConsultas(sesion)
        sesion.info['contexto_consultas'] = datos
        datos.regla_en_evaluacion = SimpleNamespace(parametro_evaluador=parametro)
        return EVALUADORES[evaluador](sesion, cuenta)


def test_requisitos_de_plan_parametrizables(cliente, aplicacion):
    abrir_planes(cliente)
    crear(cliente, ENFERMERIA)
    crear(cliente, PERIODISMO)
    assert contar(aplicacion, ()) == 2
    assert contar(aplicacion, ('POR_QUE',)) == 0
    assert contar(aplicacion) == 0
    guardar(cliente, ENFERMERIA, 'POR_QUE', por_que_lista())
    assert contar(aplicacion, ('POR_QUE',)) == 1
    # Con `prioridades`, solo cuentan los planes en esos puestos (ENFERMERIA es el Plan A).
    assert contar(aplicacion, ('POR_QUE',), (1,)) == 1 and contar(aplicacion, ('POR_QUE',), (2,)) == 0
    # Sin REALIDAD, el valor por defecto (el de `ruta`) sigue exigiendo las dos secciones para comparar.
    assert contar(aplicacion) == 0


def test_b4_1_pide_el_por_que_del_plan_a(cliente, aplicacion):
    abrir_planes(cliente)
    crear(cliente, ENFERMERIA)
    crear(cliente, PERIODISMO)
    guardar(cliente, PERIODISMO, 'POR_QUE', por_que_lista())
    # Solo el Plan B tiene «Por qué»: no basta.
    assert cumple(aplicacion, 'R-b4-1') is False
    guardar(cliente, ENFERMERIA, 'POR_QUE', por_que_lista())
    assert cumple(aplicacion, 'R-b4-1') is True


def test_b4_5_pide_el_por_que_de_los_planes_a_y_b(cliente, aplicacion):
    abrir_planes(cliente)
    for carrera in (ENFERMERIA, PERIODISMO, PSICOLOGIA):
        crear(cliente, carrera)
    guardar(cliente, ENFERMERIA, 'POR_QUE', por_que_lista())
    guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
    # El Plan A y el Plan C con «Por qué», con tres planes: no basta.
    assert cumple(aplicacion, 'R-b4-1') is True and cumple(aplicacion, 'R-b4-5') is False
    guardar(cliente, PERIODISMO, 'POR_QUE', por_que_lista())
    assert cumple(aplicacion, 'R-b4-5') is True
