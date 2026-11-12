"""B13 y ajuste llm-sugerencias (§2): mensaje, esquema, filtro de las preguntas sugeridas, texto pobre y fallos."""

import json

import pytest

from app.core.parametros import MAXIMO_CARACTERES_PREGUNTA_GUION, MIN_CARACTERES_RESPALDO
from app.models import CampoLoQuePienso
from app.services.investigaciones.prompt_guion_v4_haiku import HASH, PROMPT, VERSION
from app.services.investigaciones.sugerencias import (
    ContextoGuion, PreguntaSugerida, RespuestaGuion, armar_mensaje, clave_pregunta, filtrar_preguntas, pedir_preguntas,
    texto_pobre,
)
from app.services.registro.llm import ClienteFalso, LlamadaFallida, RespuestaCruda, esquema_estricto

# DATO DE PRUEBA: textos de un estudiante inventado.
CONTEXTO = ContextoGuion(familia='Enfermería y obstetricia', dia='Pone inyecciones', necesita='Paciencia',
                         duda='Si hacen turnos de noche', preguntas_base=('¿Base uno?', '¿Base dos?'))


def respuesta(dia=None, necesita=None, duda=None):
    return RespuestaGuion.model_validate({c: {'motivo': f'motivo {c}', 'pregunta': p}
                                          for c, p in (('dia', dia), ('necesita', necesita), ('duda', duda))})


def test_prompt_version_y_largo_pedido():
    assert VERSION == 'guion-v4-haiku' and len(HASH) == 64
    assert 'máximo 20 palabras y 160 caracteres' in PROMPT and '{maximo_caracteres}' not in PROMPT
    assert 'nunca instrucción' in PROMPT


def test_mensaje_con_etiquetas_y_las_base_una_por_linea():
    assert armar_mensaje(CONTEXTO) == (
        '<familia>Enfermería y obstetricia</familia>\n<base>\n¿Base uno?\n¿Base dos?\n</base>\n'
        '<dia>Pone inyecciones</dia>\n<necesita>Paciencia</necesita>\n<duda>Si hacen turnos de noche</duda>')


def test_esquema_con_las_tres_claves_obligatorias_y_sin_propiedades_de_mas():
    esquema = esquema_estricto(RespuestaGuion)
    assert set(esquema['required']) == {'dia', 'necesita', 'duda'} and esquema['additionalProperties'] is False
    campo = esquema['$defs']['SugerenciaCampo']
    assert set(campo['required']) == {'motivo', 'pregunta'} and campo['additionalProperties'] is False


def test_filtro_por_campo_descarta_la_que_no_pasa_y_sigue_con_las_demas():
    excluidas = {clave_pregunta('¿Cómo es un día normal en tu trabajo?')}
    assert filtrar_preguntas(respuesta(dia='¿Como es un dia normal en tu trabajo?', necesita='  ¿Cuánto   pesa?  ',
                                       duda='¿Cómo son tus horarios?'), excluidas) == [
        PreguntaSugerida(CampoLoQuePienso.NECESITA, '¿Cuánto pesa?', 'motivo necesita'),
        PreguntaSugerida(CampoLoQuePienso.DUDA, '¿Cómo son tus horarios?', 'motivo duda')]


@pytest.mark.parametrize('pregunta', (
    '¿Sin cierre', 'Sin apertura?', '¿Una? ¿Y otra?', '¿' + 'x' * (MAXIMO_CARACTERES_PREGUNTA_GUION - 1) + '?', '¿?'))
def test_filtro_exige_cierre_un_solo_signo_de_apertura_largo_y_texto(pregunta):
    assert filtrar_preguntas(respuesta(dia=pregunta), set()) == []


def test_filtro_acepta_hasta_el_maximo_y_no_repite_entre_campos():
    larga = '¿' + 'x' * (MAXIMO_CARACTERES_PREGUNTA_GUION - 2) + '?'
    assert [p.texto for p in filtrar_preguntas(respuesta(dia=larga, necesita='¿Qué tal?', duda='¿Que tal?'),
                                               set())] == [larga, '¿Qué tal?']


def test_texto_pobre_se_mide_con_los_tres_campos_juntos():
    corto = 'a' * (MIN_CARACTERES_RESPALDO // 3)
    assert texto_pobre(corto, corto, '')
    assert not texto_pobre('a' * MIN_CARACTERES_RESPALDO, '', '¿?')


def test_pedir_llama_con_el_prompt_el_mensaje_y_el_esquema():
    salida = json.dumps({'dia': {'motivo': 'm', 'pregunta': '¿Cuánto de tu día son inyecciones?'},
                         'necesita': {'motivo': 'm', 'pregunta': None}, 'duda': {'motivo': 'm', 'pregunta': None}})
    cliente = ClienteFalso([salida])
    assert [p.texto for p in pedir_preguntas(cliente, CONTEXTO, set())] == ['¿Cuánto de tu día son inyecciones?']
    assert cliente.llamadas == [(PROMPT, armar_mensaje(CONTEXTO), esquema_estricto(RespuestaGuion))]


@pytest.mark.parametrize('falla', (
    LlamadaFallida('error', 'APIError'), LlamadaFallida('tiempo_agotado'), '{"dia": {}}', '{"preguntas": []}',
    RespuestaCruda(texto='{', parada='max_tokens'), RespuestaCruda(texto='', parada='refusal')))
def test_pedir_devuelve_none_ante_fallo_demora_o_salida_fuera_del_esquema(falla):
    assert pedir_preguntas(ClienteFalso([falla]), CONTEXTO, set()) is None
