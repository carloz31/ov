"""B11 · Requisitos de `t-comparar` y `t-proyecto`, evaluadores de planes y planes que ninguna actividad escribe."""

from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app import models as m
from app.core.contexto import ContextoConsultas
from app.services.motor.evaluadores import pasos_plan_a, planes_listos_para_comparar
from soporte_planes import abrir_planes, abrir_secciones, crear, guardar, por_que_lista, realidad_lista
from soporte_ruta import avanzar, completar, filas_base, pedir, reglas


TABLAS_PLANES = ('tarjeta_carrera', 'motivo_tarjeta', 'conocimiento_tarjeta', 'duda_tarjeta', 'gasto_tarjeta',
                 'financiamiento_tarjeta', 'complicacion_tarjeta', 'sugerencia_tarjeta', 'paso_tarjeta')


def progreso_actividad(cliente, codigo):
    return pedir(cliente, 'GET', f'/cuentas/est-ana/progreso/ACTIVIDAD/{codigo}')


def test_t_comparar_espera_dos_planes_listos_para_comparar(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'REALIDAD')
    crear(cliente, 'psychology')
    crear(cliente, 'journalism')
    guardar(cliente, 'psychology', 'POR_QUE', por_que_lista())
    assert 'R-t-comparar' not in reglas(guardar(cliente, 'psychology', 'REALIDAD', realidad_lista()))
    [regla] = progreso_actividad(cliente, 't-comparar')['reglas']
    assert regla['mensaje_bloqueo'] == 'Completa por qué y qué tan real es en al menos dos planes para compararlos.'
    assert regla['evaluador_especial'] == {'nombre': 'planes_listos_para_comparar', 'cumplido': False}
    # REALIDAD sin financiamiento queda EN_PROCESO: el plan aún no está listo para comparar.
    guardar(cliente, 'journalism', 'POR_QUE', por_que_lista())
    assert 'R-t-comparar' not in reglas(guardar(cliente, 'journalism', 'REALIDAD', realidad_lista(financiamiento=[])))
    assert 'R-t-comparar' in reglas(guardar(cliente, 'journalism', 'REALIDAD', realidad_lista()))


def test_t_proyecto_espera_un_paso_en_el_plan_a(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'PASOS')
    crear(cliente, 'psychology')
    crear(cliente, 'journalism')
    paso = {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con un periodista.'}]}
    assert 'R-t-proyecto' not in reglas(guardar(cliente, 'journalism', 'PASOS', paso))
    assert progreso_actividad(cliente, 't-proyecto')['reglas'][0]['evaluador_especial'] == {
        'nombre': 'pasos_plan_a', 'cumplido': False}
    # Ordenar deja ACTUALIZA_PLAN: el plan con pasos pasa a ser el A.
    ordenado = pedir(cliente, 'POST', '/acciones/planes/ordenar',
                     {'cuenta': 'est-ana', 'carreras': ['journalism', 'psychology']})
    assert 'R-t-proyecto' in reglas(ordenado)


@pytest.mark.parametrize('evaluador', (planes_listos_para_comparar, pasos_plan_a))
@pytest.mark.parametrize('minimo', [None, 0, -1, True, 1.5])
def test_evaluadores_de_planes_rechazan_parametros_invalidos(sesion, evaluador, minimo):
    datos = ContextoConsultas(sesion)
    sesion.info['contexto_consultas'] = datos
    datos.regla_en_evaluacion = SimpleNamespace(parametro_evaluador=minimo)
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    with pytest.raises(ValueError, match='parámetro entero positivo'):
        evaluador(sesion, cuenta)


def test_ninguna_actividad_escribe_en_los_planes(cliente, aplicacion):
    avanzar(cliente)
    crear(cliente, 'psychology')
    guardar(cliente, 'psychology', 'POR_QUE', por_que_lista())
    antes = {tabla: filas for tabla, filas in filas_base(aplicacion).items() if tabla in TABLAS_PLANES}
    for actividad in ('t-valores', 't-opcional'):
        completar(cliente, actividad)
    despues = {tabla: filas for tabla, filas in filas_base(aplicacion).items() if tabla in TABLAS_PLANES}
    assert despues == antes and antes['tarjeta_carrera'] and antes['motivo_tarjeta']
