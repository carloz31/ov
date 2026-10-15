"""B11 · Prompt y validación de las sugerencias de pasos, con los ejemplos del caso Mateo (sin base)."""

import time

import pytest

from app.services.planes.sugerencias import (
    ContextoSugerencias, InstitucionSugerencias, Novedad, pedir_sugerencias, prompt_sugerencias, validar_sugerencias,
)


PASOS = (('investigar', 'Investigar'), ('conversar', 'Conversar con alguien'), ('visitar', 'Visitar'),
         ('curso', 'Llevar un curso'), ('practicar', 'Practicar'), ('otra', 'Otro'))
UNALM = InstitucionSugerencias(nombre='UNALM', tipo='UNIVERSIDAD', gestion='PUBLICA', ciudad='Lima',
                               pagina_web='https://www.lamolina.edu.pe')
# Caso Mateo · Ingeniería Ambiental · UNALM (DATO DE PRUEBA del documento de diseño).
DUDAS_MATEO = (
    Novedad(1, '¿Cómo es un día normal de alguien de Ingeniería Ambiental?', 'pregunta fija 1'),
    Novedad(2, '¿Qué cursos llevaría?', 'pregunta fija 3'),
    Novedad(3, '¿Conozco a alguien que estudie o trabaje en esto?', 'pregunta fija 5'),
    Novedad(4, '¿Cuántos postulan y cuántos ingresan?', 'sugerida'),
    Novedad(5, '¿Hay trabajo en Lima o sobre todo en provincias?', 'propia'),
    Novedad(6, '¿Es muy pesado llevar eso y trabajar?', 'propia'))
PASOS_MATEO = [
    {'duda': 1, 'pasos': [
        {'tipo': 'conversar', 'texto': 'Pídele a tu profesor de CTA que te contacte con alguien que trabaje en medio '
                                       'ambiente y pregúntale cómo es su semana.'},
        {'tipo': 'investigar', 'texto': 'Lee los testimonios de Ingeniería Ambiental en la plataforma y anota qué '
                                        'hacen un día cualquiera.'}]},
    {'duda': 2, 'pasos': [{'tipo': 'investigar', 'texto': 'Busca el plan de estudios de Ingeniería Ambiental en la '
                                                          'página de la UNALM y anota los cursos de los dos primeros años.'}]},
    {'duda': 3, 'pasos': [{'tipo': 'conversar', 'texto': 'Pregunta en casa y a tus profesores si conocen a alguien que '
                                                         'estudie o trabaje en Ingeniería Ambiental y pide que te presenten.'}]},
    {'duda': 4, 'pasos': [{'tipo': 'investigar', 'texto': 'Entra a la página de admisión de la UNALM y busca cuántos '
                                                          'postularon e ingresaron a Ingeniería Ambiental en el último examen.'}]},
    {'duda': 5, 'pasos': [
        {'tipo': 'conversar', 'texto': 'Cuando hables con alguien de la carrera, pregúntale dónde trabajan sus '
                                       'compañeros de promoción.'},
        {'tipo': 'investigar', 'texto': 'Busca en la página de la UNALM dónde hacen prácticas los estudiantes de '
                                        'Ingeniería Ambiental.'}]},
    {'duda': 6, 'pasos': [
        {'tipo': 'conversar', 'texto': 'Pregúntale a un estudiante de la UNALM cuántas horas de clase tiene por semana '
                                       'y si conoce a alguien que trabaje.'},
        {'tipo': 'investigar', 'texto': 'Revisa en el plan de estudios cuántos cursos se llevan por ciclo los primeros '
                                        'dos años.'}]},
]
COMPLICACIONES_MATEO = (Novedad(1, 'Me cuesta matemática', 'dificultad de lista'),
                        Novedad(2, 'Mi papá quiere que trabaje con él al salir', 'otro'))


def contexto(tipo='DUDAS', novedades=DUDAS_MATEO, institucion=UNALM):
    return ContextoSugerencias(tipo=tipo, carrera='Ingeniería Ambiental', familia='Ingeniería y ambiente',
                               tipo_riasec='I', institucion=institucion, camino='Prepararme primero',
                               total_primer_anio=4200 if tipo == 'COMPLICACIONES' else None,
                               financiamiento=('Apoyo de mi familia',) if tipo == 'COMPLICACIONES' else (),
                               tipos_paso=PASOS, novedades=novedades)


def test_prompt_de_dudas_con_la_institucion_y_sin_textos_del_estudiante():
    prompt = prompt_sugerencias(contexto())
    assert 'la carrera de Ingeniería Ambiental en UNALM, pública en Lima.' in prompt
    assert 'Para cada duda, propón uno o dos pasos' in prompt
    assert 'la página de admisión de UNALM' in prompt
    assert 'conversar: Conversar con alguien' in prompt and 'máximo 140 caracteres' in prompt
    assert '[{"duda": <numero>, "pasos": [{"tipo": "<codigo>", "texto": "<paso>"}]}]' in prompt
    assert all(novedad.texto not in prompt for novedad in DUDAS_MATEO)


def test_prompt_sin_institucion_o_sin_gestion_y_de_complicaciones():
    assert 'la carrera de Ingeniería Ambiental.\n' in prompt_sugerencias(contexto(institucion=None))
    sin_gestion = InstitucionSugerencias(nombre='UNALM', tipo='UNIVERSIDAD', gestion=None, ciudad='Lima',
                                         pagina_web=None)
    assert 'en UNALM, en Lima.' in prompt_sugerencias(contexto(institucion=sin_gestion))
    prompt = prompt_sugerencias(contexto('COMPLICACIONES', COMPLICACIONES_MATEO))
    assert 'aproximadamente S/ 4200' in prompt and 'Para cada complicación, propón un paso' in prompt
    assert '[{"complicacion": <numero>' in prompt and 'Mi papá' not in prompt


def test_los_ejemplos_del_caso_mateo_son_respuestas_validas():
    pasos = validar_sugerencias(PASOS_MATEO, contexto())
    assert {numero: len(lista) for numero, lista in pasos.items()} == {1: 2, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2}
    complicaciones = validar_sugerencias([
        {'complicacion': 1, 'pasos': [{'tipo': 'practicar', 'texto': 'Pídele a tu profesor de matemática un examen de '
                                       'admisión pasado de la UNALM y resuélvanlo juntos.'}]},
        {'complicacion': 2, 'pasos': [{'tipo': 'conversar', 'texto': 'Pregúntale a tu papá si podrías ayudarlo medio '
                                       'tiempo mientras estudias.'}]}],
        contexto('COMPLICACIONES', COMPLICACIONES_MATEO))
    assert [tipo for numero in (1, 2) for tipo, _ in complicaciones[numero]] == ['practicar', 'conversar']


def test_la_validacion_filtra_numeros_tipos_textos_y_cantidad():
    pasos = validar_sugerencias([
        {'duda': 99, 'pasos': [{'tipo': 'investigar', 'texto': 'Número no enviado.'}]},
        {'duda': 1, 'pasos': [{'tipo': 'academia', 'texto': 'Matricúlate en una academia.'},
                              {'tipo': 'investigar', 'texto': '   '},
                              {'tipo': 'investigar', 'texto': 'y' * 200},
                              {'tipo': 'conversar', 'texto': 'Segundo válido.'},
                              {'tipo': 'visitar', 'texto': 'Tercero válido, sobra.'}]},
        {'complicacion': 2, 'pasos': [{'tipo': 'investigar', 'texto': 'Clave de otra sección.'}]},
    ], contexto())
    assert pasos == {1: [('investigar', 'y' * 140), ('conversar', 'Segundo válido.')]}
    una = validar_sugerencias([{'complicacion': 1, 'pasos': [{'tipo': 'otra', 'texto': 'Uno.'},
                                                            {'tipo': 'otra', 'texto': 'Dos.'}]}],
                              contexto('COMPLICACIONES', COMPLICACIONES_MATEO))
    assert una == {1: [('otra', 'Uno.')]}
    with pytest.raises(ValueError):
        validar_sugerencias({'duda': 1}, contexto())


class EvaluadorLento:
    def sugerir_pasos(self, contexto_llm):
        time.sleep(0.05)
        return PASOS_MATEO


class EvaluadorRoto:
    def sugerir_pasos(self, contexto_llm):
        raise RuntimeError('DATO DE PRUEBA')


def test_pedir_sugerencias_sin_pasos_ante_fallo_o_demora():
    assert pedir_sugerencias(EvaluadorRoto(), contexto(), tiempo_maximo_segundos=5) == {}
    assert pedir_sugerencias(EvaluadorLento(), contexto(), tiempo_maximo_segundos=0.01) == {}
    assert len(pedir_sugerencias(EvaluadorLento(), contexto(), tiempo_maximo_segundos=5)) == 6
    with pytest.raises(ValueError):
        pedir_sugerencias(EvaluadorLento(), contexto(), tiempo_maximo_segundos=0)
