"""B11 · HU-101: pasos sugeridos por el LLM (evaluador falso), su validación, el respaldo y el tope por plan."""

from dataclasses import asdict

import pytest
from sqlalchemy import select

from app import models as m
from app.core.parametros import MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
from soporte_planes import abrir_planes, abrir_secciones, crear, guardar, plan, por_que_lista, realidad_lista


@pytest.fixture
def evaluador(aplicacion):
    return aplicacion.state.evaluador_respuestas


@pytest.fixture
def con_plan(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD')
    crear(cliente, 'environmental-engineering')


def sugerencias(cliente):
    return [(s['origen']['duda'] or s['origen']['complicacion'], s['tipo'], s['texto'], s['generada_por'])
            for s in plan(cliente, 'environmental-engineering')['sugerencias']]


def dudas(*textos):
    return {'dudas': [{'origen': 'PROPIA', 'texto': texto} for texto in textos]}


def test_una_llamada_por_guardado_con_todas_las_novedades(cliente, evaluador, con_plan):
    guardar(cliente, 'environmental-engineering', 'POR_QUE', por_que_lista())
    guardar(cliente, 'environmental-engineering', 'REALIDAD', realidad_lista())
    guardar(cliente, 'environmental-engineering', 'CONOCIMIENTO', {
        'respuestas': {'CURSOS': 'NO'}, 'dudas': [{'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'},
                                                  {'origen': 'PROPIA', 'texto': '¿Hay trabajo en Lima?'}]})
    assert evaluador.llamadas_sugerencias == 1
    [contexto] = evaluador.contextos_sugerencias
    assert (contexto.tipo, contexto.carrera, contexto.familia, contexto.tipo_riasec) == (
        'DUDAS', 'Ingeniería Ambiental', 'Ingeniería y ambiente', 'I')
    assert asdict(contexto.institucion) == {'nombre': 'Universidad Nacional de Prueba', 'tipo': 'UNIVERSIDAD',
                                            'gestion': 'PUBLICA', 'ciudad': 'Lima de prueba',
                                            'pagina_web': 'https://example.test/universidad'}
    assert contexto.camino == 'Prepararme primero' and contexto.financiamiento == ()
    assert [asdict(n) for n in contexto.novedades] == [
        {'numero': 1, 'texto': '¿Qué cursos se llevan en Ingeniería Ambiental?', 'origen': 'pregunta fija 3'},
        {'numero': 2, 'texto': '¿Cuántos postulan y cuántos ingresan?', 'origen': 'sugerida'},
        {'numero': 3, 'texto': '¿Hay trabajo en Lima?', 'origen': 'propia'}]
    # Nada más del estudiante: ni relato, ni motivos, ni respuestas de registro.
    assert 'Cuando ayudé' not in repr(contexto)
    assert sugerencias(cliente) == [
        (1, 'investigar', 'Busca en Universidad Nacional de Prueba: ¿Qué cursos se llevan en Ingeniería Ambiental?',
         'LLM'),
        (2, 'investigar', 'Busca en Universidad Nacional de Prueba: ¿Cuántos postulan y cuántos ingresan?', 'LLM'),
        (3, 'investigar', 'Busca en Universidad Nacional de Prueba: ¿Hay trabajo en Lima?', 'LLM')]
    # Volver a guardar sin novedades no llama ni regenera.
    guardar(cliente, 'environmental-engineering', 'CONOCIMIENTO', {
        'respuestas': {'CURSOS': 'NO'}, 'dudas': [{'numero': 2}, {'numero': 3}]})
    assert evaluador.llamadas_sugerencias == 1 and len(sugerencias(cliente)) == 3


def test_complicaciones_con_total_y_financiamiento(cliente, evaluador, con_plan):
    guardar(cliente, 'environmental-engineering', 'REALIDAD', realidad_lista(
        complicaciones=[{'opcion': 'ECONOMICAS'}, {'otro': 'Queda lejos de casa'}]))
    [contexto] = evaluador.contextos_sugerencias
    assert (contexto.tipo, contexto.total_primer_anio, contexto.financiamiento) == (
        'COMPLICACIONES', 1200, ('Apoyo de mi familia',))
    assert [(n.numero, n.origen) for n in contexto.novedades] == [(1, 'dificultad de lista'), (2, 'otro')]
    assert sugerencias(cliente) == [(1, 'conversar', 'Conversa en casa sobre: Económicas', 'LLM'),
                                    (2, 'conversar', 'Conversa en casa sobre: Queda lejos de casa', 'LLM')]


def test_validacion_de_la_respuesta_con_respaldo_por_novedad(cliente, con_plan):
    guardar(cliente, 'environmental-engineering', 'CONOCIMIENTO', dudas(
        'Normal', 'Tipo [tipo-invalido]', 'Muy [largo]', 'Son [tres]', 'Nada [sin-pasos]', 'Con [ajeno]'))
    filas = sugerencias(cliente)
    assert [(numero, tipo, generada) for numero, tipo, _, generada in filas] == [
        (1, 'investigar', 'LLM'), (2, 'investigar', 'RESPALDO'), (3, 'investigar', 'LLM'), (4, 'investigar', 'LLM'),
        (4, 'investigar', 'LLM'), (5, 'investigar', 'RESPALDO'), (6, 'investigar', 'LLM')]
    assert filas[1][2] == 'Averiguar: Tipo [tipo-invalido]' and filas[2][2] == 'x' * 140


def test_complicacion_con_un_solo_paso(cliente, con_plan):
    guardar(cliente, 'environmental-engineering', 'REALIDAD', realidad_lista(complicaciones=[{'otro': 'Son [tres]'}]))
    assert [generada for *_, generada in sugerencias(cliente)] == ['LLM']


@pytest.mark.parametrize('marca', ('[falla]', '[malformado]'))
def test_si_el_llm_falla_todas_reciben_respaldo_y_la_seccion_se_guarda(cliente, con_plan, marca):
    guardar(cliente, 'environmental-engineering', 'CONOCIMIENTO', dudas('Primera', f'Segunda {marca}'))
    assert sugerencias(cliente) == [(1, 'investigar', 'Averiguar: Primera', 'RESPALDO'),
                                    (2, 'investigar', f'Averiguar: Segunda {marca}', 'RESPALDO')]
    assert [d['texto'] for d in plan(cliente, 'environmental-engineering')['dudas']] == [
        'Primera', f'Segunda {marca}']


def test_tope_de_llamadas_por_plan(cliente, evaluador, sesion, con_plan):
    actuales = []
    for vuelta in range(MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN + 1):
        actuales = [{'numero': numero} for numero in range(1, vuelta + 1)]
        guardar(cliente, 'environmental-engineering', 'CONOCIMIENTO',
                {'dudas': [*actuales, {'origen': 'PROPIA', 'texto': f'Duda {vuelta + 1}'}]})
    assert evaluador.llamadas_sugerencias == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
    assert sugerencias(cliente)[-1] == (7, 'investigar', 'Averiguar: Duda 7', 'RESPALDO')
    tarjeta = sesion.scalar(select(m.TarjetaCarrera))
    assert tarjeta.llamadas_sugerencias == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
    # El tope es por plan: otro plan sigue llamando.
    crear(cliente, 'psychology')
    guardar(cliente, 'psychology', 'CONOCIMIENTO', dudas('Otra'))
    assert evaluador.llamadas_sugerencias == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN + 1
