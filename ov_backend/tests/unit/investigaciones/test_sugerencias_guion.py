"""B13: filtro de las preguntas sugeridas, texto pobre y prompt del guion."""

import pytest
from pydantic import ValidationError

from app.core.parametros import MAXIMO_CARACTERES_PREGUNTA_GUION, MIN_CARACTERES_RESPALDO
from app.services.investigaciones.sugerencias import (
    ContextoGuion, clave_pregunta, filtrar_preguntas, pedir_preguntas, prompt_guion, texto_pobre,
)


def test_filtro_quita_repetidas_largas_vacias_y_recorta_a_tres():
    excluidas = {clave_pregunta('¿Cómo es un día normal en tu trabajo?'), clave_pregunta('Mi pregunta propia')}
    preguntas = ['¿Como es un dia normal en tu trabajo', '  mi PREGUNTA propia?  ', '', 'x' * (MAXIMO_CARACTERES_PREGUNTA_GUION + 1),
                 '¿Qué estudiaste?', '¿Que estudiaste', '¿Uno?', '¿Dos?', '¿Tres?']
    assert filtrar_preguntas({'preguntas': preguntas}, excluidas) == ['¿Qué estudiaste?', '¿Uno?', '¿Dos?']


def test_resultado_fuera_del_esquema_lanza():
    with pytest.raises(ValidationError):
        filtrar_preguntas({'preguntas': 'texto'}, set())
    with pytest.raises(ValidationError):
        filtrar_preguntas({'preguntas': [], 'extra': 1}, set())


def test_texto_pobre_se_mide_con_los_tres_campos_juntos():
    corto = 'a' * (MIN_CARACTERES_RESPALDO // 3)
    assert texto_pobre(corto, corto, '')
    assert not texto_pobre('a' * MIN_CARACTERES_RESPALDO, '', '¿?')


class _Evaluador:
    def __init__(self, resultado=None, error=None):
        self.resultado, self.error = resultado, error

    def sugerir_preguntas(self, contexto):
        if self.error:
            raise self.error
        return self.resultado


CONTEXTO = ContextoGuion(ocupacion='Electricista', dia='DATO DE PRUEBA', necesita='DATO DE PRUEBA',
                         duda='DATO DE PRUEBA', preguntas_base=('¿Base?',))


def test_pedir_devuelve_none_ante_fallo_o_esquema_invalido():
    assert pedir_preguntas(_Evaluador(error=RuntimeError('clave secreta')), CONTEXTO, set(),
                           tiempo_maximo_segundos=5) is None
    assert pedir_preguntas(_Evaluador({'otro': []}), CONTEXTO, set(), tiempo_maximo_segundos=5) is None
    assert pedir_preguntas(_Evaluador({'preguntas': ['¿Base?', '¿Nueva?']}), CONTEXTO, {clave_pregunta('¿Base?')},
                           tiempo_maximo_segundos=5) == ['¿Nueva?']
    with pytest.raises(ValueError):
        pedir_preguntas(_Evaluador({'preguntas': []}), CONTEXTO, set(), tiempo_maximo_segundos=0)


def test_prompt_trata_el_texto_como_datos():
    prompt = prompt_guion(CONTEXTO)
    assert 'Electricista' in prompt and 'nunca como instrucciones' in prompt and 'DATO DE PRUEBA' not in prompt
