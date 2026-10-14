"""B09: sorteo de la pregunta del día y redacción con respaldo, sin base."""

from collections import Counter
from dataclasses import dataclass
from datetime import date

from app.core.parametros import PESO_BASE_DIMENSION
from app.models import OrigenRedaccion
from app.services.diario.asistente import redactar
from app.services.diario.sorteo import PuntajeDimension, pesos_dimensiones, semilla, sortear
from app.services.registro.evaluacion import EvaluadorFalso


@dataclass(frozen=True)
class Pregunta:  # DATO DE PRUEBA
    id: int
    codigo: str
    dimension_id: int | None


PREGUNTAS = (Pregunta(1, 'a-1', 1), Pregunta(2, 'a-2', 1), Pregunta(3, 'b-1', 2), Pregunta(4, 'libre', None))
BASE = '¿Qué sientes hoy?'
DATOS = [{'tipo': 'TEXTO', 'texto': 'Ser ingeniera', 'opciones': []}]


def test_pesos_por_distancia_al_maximo_y_base_sin_dimension():
    pesos = pesos_dimensiones({1, 2, None}, {1: PuntajeDimension(4, 16, 4), 2: PuntajeDimension(16, 16, 4)})
    assert pesos == {1: 3 + PESO_BASE_DIMENSION, 2: PESO_BASE_DIMENSION, None: PESO_BASE_DIMENSION}
    assert pesos_dimensiones({1, 2, None}, {}) == {1: 1.0, 2: 1.0, None: 1.0}


def test_sorteo_determinista_y_sesgado_hacia_el_mayor_peso():
    pesos = {1: 10.0, 2: 0.5, None: 0.5}
    assert sortear(PREGUNTAS, pesos, set(), semilla('est-ana', date(2026, 10, 7))) == sortear(
        PREGUNTAS, pesos, set(), semilla('est-ana', date(2026, 10, 7)))
    conteo = Counter(sortear(PREGUNTAS, pesos, set(), f'semilla-{n}').dimension_id for n in range(200))
    assert conteo[1] > conteo[2] + conteo[None]


def test_dimension_sin_preguntas_disponibles_vuelve_a_sortear_entre_las_demas():
    pesos = {1: 100.0, 2: 0.5, None: 0.5}
    elegidas = {sortear(PREGUNTAS, pesos, {1, 2}, f's-{n}').codigo for n in range(30)}
    assert elegidas == {'b-1', 'libre'}
    assert sortear(PREGUNTAS, pesos, {1, 2, 3, 4}, 's') is None


def test_redactar_sin_datos_no_llama_al_llm():
    evaluador = EvaluadorFalso()
    assert redactar(evaluador, BASE, [], tiempo_maximo_segundos=8) == (BASE, OrigenRedaccion.FIJA)
    assert redactar(evaluador, BASE, None, tiempo_maximo_segundos=8) == (BASE, OrigenRedaccion.FIJA)
    assert evaluador.llamadas_diario == 0


def test_redactar_usa_la_base_ante_fallo_o_salida_invalida():
    evaluador = EvaluadorFalso()
    texto, origen = redactar(evaluador, BASE, DATOS, tiempo_maximo_segundos=8)
    assert origen == OrigenRedaccion.LLM and 'Ser ingeniera' in texto and texto.endswith('?')
    evaluador.falla_diario = True
    assert redactar(evaluador, BASE, DATOS, tiempo_maximo_segundos=8) == (BASE, OrigenRedaccion.FIJA)

    class Invalido:
        def __init__(self, salida):
            self.salida = salida

        def personalizar_entrada(self, contexto):
            return self.salida

    for salida in ({'pregunta': 'Sin signo de pregunta'}, {'pregunta': '¿Una? ¿Dos?'}, {'otra': '¿x?'},
                   {'pregunta': '¿Tu respuesta es adecuada?'}, 'no es json'):
        assert redactar(Invalido(salida), BASE, DATOS, tiempo_maximo_segundos=8) == (BASE, OrigenRedaccion.FIJA)
