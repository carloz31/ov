"""B11 · HU-110 y ajuste llm-sugerencias (§3): pasos sugeridos por Claude Haiku (cliente de prueba), su mensaje, su
validación, la clase y el motivo, el respaldo fijo de las novedades de lista y el tope por plan."""

import pytest
from sqlalchemy import select

from app import models as m
from app.core.parametros import (
    MAXIMO_CARACTERES_PASO, MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN, MAXIMO_TOKENS_SALIDA_PASOS,
    TIEMPO_MAXIMO_PASOS_SEGUNDOS,
)
from app.services.planes.prompt_pasos_v5_haiku import PROMPT
from app.services.registro.llm import RespuestaCruda
from soporte_catalogo_ruta import ING_AMBIENTAL, PSICOLOGIA
from soporte_llm import fallo, salida_pasos
from soporte_planes import abrir_planes, abrir_secciones, crear, guardar, plan, por_que_lista, realidad_lista

TODAS_NO = {'DIA_NORMAL': 'NO', 'DONDE_TRABAJAR': 'NO', 'CURSOS': 'NO', 'INGRESO': 'NO', 'CONOCE_ALGUIEN': 'NO'}


@pytest.fixture
def llm(aplicacion):
    return aplicacion.state.cliente_llm


@pytest.fixture
def con_plan(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, ING_AMBIENTAL)


def llamadas_pasos(llm):
    return [(sistema, mensaje) for sistema, mensaje, esquema in llm.llamadas if 'sugerencias' in esquema['properties']]


def sugerencias(cliente):
    return [(s['origen']['duda'] or s['origen']['complicacion'], s['tipo'], s['texto'], s['generada_por'])
            for s in plan(cliente, ING_AMBIENTAL)['sugerencias']]


def dudas(*textos):
    return {'dudas': [{'origen': 'PROPIA', 'texto': texto} for texto in textos]}


def numeros_de_dudas(cliente):
    return {d['texto']: d['numero'] for d in plan(cliente, ING_AMBIENTAL)['dudas']}


def test_una_llamada_por_guardado_con_su_mensaje_y_sus_topes(cliente, llm, con_plan, sesion):
    guardar(cliente, ING_AMBIENTAL, 'POR_QUE', por_que_lista())
    guardar(cliente, ING_AMBIENTAL, 'REALIDAD', realidad_lista())
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', {
        'respuestas': {'CURSOS': 'NO'}, 'dudas': [{'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'},
                                                  {'origen': 'PROPIA', 'texto': '¿Hay trabajo en Lima?'}]})
    [(sistema, mensaje)] = llamadas_pasos(llm)
    assert sistema == PROMPT
    assert llm.topes[-1] == {'maximo_tokens': MAXIMO_TOKENS_SALIDA_PASOS, 'tiempo': TIEMPO_MAXIMO_PASOS_SEGUNDOS}
    assert mensaje == (
        '<carrera>Ingeniería Ambiental</carrera>\n'
        '<institucion>Universidad Nacional Federico Villarreal, pública, Lima</institucion>\n'
        '<camino>Prepararme primero</camino>\n'
        '<tipos_paso>\ninvestigar: Investigar\nconversar: Conversar con alguien\nvisitar: Visitar\n'
        'curso: Llevar un curso\npracticar: Practicar\notra: Otro\n</tipos_paso>\n'
        '<pasos_actuales>\n</pasos_actuales>\n'
        '<dudas>\n1. ¿Qué cursos se llevan en Ingeniería Ambiental?\n2. ¿Cuántos postulan y cuántos ingresan?\n'
        '3. ¿Hay trabajo en Lima?\n</dudas>')
    # Nada más del estudiante: ni relato, ni motivos, ni respuestas de registro; ni RIASEC, familia o total.
    assert 'Cuando ayudé' not in mensaje and '<financiamiento>' not in mensaje
    assert [generada for *_, generada in sugerencias(cliente)] == ['LLM'] * 3
    fila = sesion.scalars(select(m.SugerenciaTarjeta).order_by(m.SugerenciaTarjeta.numero)).first()
    assert (fila.clase, fila.motivo) == (m.ClaseNovedadPlan.DATO, 'm')
    # Volver a guardar sin novedades no llama ni regenera.
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', {
        'respuestas': {'CURSOS': 'NO'}, 'dudas': [{'numero': 2}, {'numero': 3}]})
    assert len(llamadas_pasos(llm)) == 1 and len(sugerencias(cliente)) == 3


def test_complicaciones_con_financiamiento_hasta_dos_pasos_y_pasos_actuales(cliente, llm, con_plan):
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', dudas('¿Hay trabajo?'))
    guardar(cliente, ING_AMBIENTAL, 'PASOS', {'pasos': [{'sugerencia': 1}]})
    llm.encolar(salida_pasos((1, 'lista', [('conversar', 'Uno'), ('investigar', 'Dos'), ('otra', 'Tres')]),
                             (2, 'experiencia', [('conversar', 'Cuatro')])))
    guardar(cliente, ING_AMBIENTAL, 'REALIDAD', realidad_lista(
        complicaciones=[{'opcion': 'ECONOMICAS'}, {'otro': 'Queda lejos de casa'}]))
    _, mensaje = llamadas_pasos(llm)[-1]
    assert '<pasos_actuales>\nRevisar en la ficha de la carrera lo de: ¿Hay trabajo?\n</pasos_actuales>' in mensaje
    assert mensaje.endswith('<financiamiento>Apoyo de mi familia</financiamiento>\n'
                            '<complicaciones>\n1. Económicas\n2. Queda lejos de casa\n</complicaciones>')
    assert sugerencias(cliente)[1:] == [(1, 'conversar', 'Uno', 'LLM'), (1, 'investigar', 'Dos', 'LLM'),
                                        (2, 'conversar', 'Cuatro', 'LLM')]


def test_validacion_por_numero_de_la_tarjeta(cliente, llm, con_plan, sesion):
    llm.encolar(salida_pasos(
        (1, 'dato', [('investigar', 'A'), ('conversar', 'B'), ('practicar', 'C')]),
        (2, 'dato', [('investigar', '   ')]),
        (3, 'dato', [('investigar', 'x' * (MAXIMO_CARACTERES_PASO + 1)), ('investigar', 'y' * MAXIMO_CARACTERES_PASO)]),
        (4, 'no_aplica', [('investigar', 'Z')]),
        (6, 'experiencia', []), (7, 'no_aplica', []), (999, 'dato', [('investigar', 'Ajeno')]),
        (1, 'dato', [('investigar', 'Repetido')])))
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', {'respuestas': TODAS_NO, 'dudas': [
        {'origen': 'SUGERIDA', 'opcion': 'SUELDO_INICIAL'}, {'origen': 'PROPIA', 'texto': 'Propia'}]})
    origen = {d['numero']: (d['origen'], d['texto']) for d in plan(cliente, ING_AMBIENTAL)['dudas']}
    assert [o for o, _ in origen.values()] == ['PREGUNTA'] * 5 + ['SUGERIDA', 'PROPIA']
    filas = sugerencias(cliente)
    assert [(n, g) for n, _, _, g in filas] == [
        (1, 'LLM'), (1, 'LLM'),  # dos pasos como máximo; el tercero y el número repetido se ignoran
        (2, 'RESPALDO'),  # texto vacío: sin pasos válidos, respaldo de su pregunta (un tipo fuera de PASOS no pasa el
        #                   esquema: lo cubre la prueba unitaria)
        (3, 'LLM'),  # el de 221 caracteres se descarta, no se corta; el de 220 queda
        (5, 'RESPALDO'),  # no volvió en la respuesta
        (6, 'RESPALDO')]  # sugerida sin pasos; 4 y 7 son no_aplica: nada; 999 no se envió
    assert filas[3][2] == 'y' * MAXIMO_CARACTERES_PASO
    clases = [(s.clase, s.generada_por) for s in sesion.scalars(
        select(m.SugerenciaTarjeta).order_by(m.SugerenciaTarjeta.numero))]
    assert clases[0] == (m.ClaseNovedadPlan.DATO, m.OrigenSugerencia.LLM)
    assert clases[2] == (None, m.OrigenSugerencia.RESPALDO)


@pytest.mark.parametrize('falla', (
    fallo(), fallo('tiempo_agotado'), '{"sugerencias": [{"numero": 1}]}',
    RespuestaCruda(texto='{"sugerencias": [', parada='max_tokens')))
def test_si_el_llm_falla_solo_las_de_lista_reciben_respaldo_y_la_seccion_se_guarda(cliente, llm, con_plan, falla):
    llm.encolar(falla)
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', {'respuestas': {'INGRESO': 'NO'}, 'dudas': [
        {'origen': 'SUGERIDA', 'opcion': 'CURSOS_DIFICILES'}, {'origen': 'PROPIA', 'texto': 'Propia'}]})
    assert sugerencias(cliente) == [
        (1, 'investigar', 'Revisar en la página de admisión de las instituciones que me interesan las modalidades de '
         'ingreso a Ingeniería Ambiental y anotar cuál me corresponde.', 'RESPALDO'),
        (2, 'conversar', 'Conseguir, por mi familia o mi orientadora, a alguien que estudie Ingeniería Ambiental y '
         'preguntarle: «¿Qué curso te costó más al empezar?»', 'RESPALDO')]
    assert [d['texto'] for d in plan(cliente, ING_AMBIENTAL)['dudas']][-1] == 'Propia'
    _, mensaje = llamadas_pasos(llm)[-1]
    assert '<institucion>sin elegir</institucion>\n<camino>sin elegir</camino>' in mensaje


def test_respaldo_con_institucion_y_complicacion_otro_sin_nada(cliente, llm, con_plan):
    llm.fallar_pasos = True
    guardar(cliente, ING_AMBIENTAL, 'REALIDAD', realidad_lista(
        complicaciones=[{'opcion': 'DISTANCIA'}, {'otro': 'Otra cosa'}]))
    assert sugerencias(cliente) == [
        (1, 'investigar', 'Revisar en qué sede de Universidad Nacional Federico Villarreal se dicta Ingeniería '
         'Ambiental y medir cuánto demora el viaje desde mi casa.', 'RESPALDO')]


def test_tope_de_llamadas_por_plan(cliente, llm, sesion, con_plan):
    for vuelta in range(MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN):
        actuales = [{'numero': numero} for numero in range(1, vuelta + 1)]
        guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO',
                {'dudas': [*actuales, {'origen': 'PROPIA', 'texto': f'Duda {vuelta + 1}'}]})
    assert len(llamadas_pasos(llm)) == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
    # Agotado el tope no se llama: la sugerida recibe su respaldo y la propia, nada.
    actuales = [{'numero': numero} for numero in range(1, MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN + 1)]
    guardar(cliente, ING_AMBIENTAL, 'CONOCIMIENTO', {'dudas': [
        *actuales, {'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'}, {'origen': 'PROPIA', 'texto': 'Otra más'}]})
    assert len(llamadas_pasos(llm)) == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
    assert [(n, g) for n, *_, g in sugerencias(cliente)][-1] == (7, 'RESPALDO')
    assert sesion.scalar(select(m.TarjetaCarrera)).llamadas_sugerencias == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN
    # El tope es por plan: otro plan sigue llamando.
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', dudas('Otra'))
    assert len(llamadas_pasos(llm)) == MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN + 1
