"""Adaptador Gemini de los asistentes (sugerencias, guion) con cliente simulado, sin red.

Ajuste cartas-diario: el diario ya no usa el LLM; las pruebas del adaptador usan el asistente del guion."""

import json
import logging
from dataclasses import replace
import httpx
import pytest
from google import genai
from google.genai import errors, types
from app.config import Configuracion
from app.core.parametros import NIVEL_RAZONAMIENTO_ASISTENTES, TEMPERATURA_ASISTENTES
from app.services.investigaciones.sugerencias import ContextoGuion, prompt_guion
from app.services.registro.evaluacion import ErrorResultadoEvaluacion
from app.services.registro.gemini import ErrorClienteGemini, EvaluadorGemini, razonamiento_para
from soporte_red import impedir_red


CLAVE_SIMULADA = 'clave-sintetica-solo-pruebas'
CONFIGURACION = Configuracion(evaluador='gemini', clave=CLAVE_SIMULADA)
CONTEXTO = ContextoGuion(familia='Ingeniería', dia='DATO DE PRUEBA', necesita='DATO DE PRUEBA', duda='DATO DE PRUEBA',
                         preguntas_base=('¿Cómo es tu día?',))
VALIDA = {'preguntas': ['¿Qué te gusta de tu trabajo?']}


def respuesta_sdk(datos=VALIDA):
    return types.GenerateContentResponse(candidates=[types.Candidate(
        content=types.Content(parts=[types.Part(text=json.dumps(datos, ensure_ascii=False))]),
        finish_reason='STOP',
    )])


class ClienteSimulado:
    def __init__(self, respuesta=None, error=None, observar=None):
        self.models = self
        self.respuesta = respuesta if respuesta is not None else respuesta_sdk()
        self.error = error
        self.observar = observar
        self.llamadas = []
        self.cierres = 0

    def generate_content(self, **argumentos):
        self.llamadas.append(argumentos)
        if self.observar:
            self.observar()
        if self.error:
            raise self.error
        return self.respuesta

    def close(self):
        self.cierres += 1


def sugerir(cliente, configuracion=CONFIGURACION):
    adaptador = EvaluadorGemini(configuracion, cliente=cliente)
    try:
        return adaptador.sugerir_preguntas(CONTEXTO)
    finally:
        assert adaptador.latencia_ms is not None
        adaptador.cerrar()


def test_modelo_por_defecto_es_gemini_3_5_flash_lite():
    assert CONFIGURACION.modelo == 'gemini-3.5-flash-lite'


@pytest.mark.parametrize('modelo,nivel,campo,valor', [
    ('gemini-3.5-flash-lite', 'low', 'thinking_level', 'LOW'),
    ('gemini-3.5-flash-lite', 'minimal', 'thinking_level', 'MINIMAL'),
    ('models/gemini-3.5-flash-lite', 'low', 'thinking_level', 'LOW'),
    ('gemini-3.8-flash', 'low', 'thinking_level', 'LOW'),
    ('gemini-3.8-flash', 'minimal', 'thinking_level', 'LOW'),
    ('models/gemini-3.8-flash', 'minimal', 'thinking_level', 'LOW'),
    ('gemini-3.1-flash-lite', 'minimal', 'thinking_level', 'MINIMAL'),
    ('gemini-3.1-flash-lite', 'low', 'thinking_level', 'LOW'),
    ('gemini-3-flash-preview', 'minimal', 'thinking_level', 'MINIMAL'),
    ('gemini-3.1-pro-preview', 'minimal', 'thinking_level', 'LOW'),
    ('gemini-2.5-flash', 'minimal', 'thinking_budget', 0),
    ('gemini-2.5-flash', 'low', 'thinking_budget', 0),
    ('gemini-2.5-pro', 'minimal', 'thinking_budget', 128),
    ('gemini-2.5-pro', 'low', 'thinking_budget', 128),
])
def test_razonamiento_minimo_compatible(modelo, nivel, campo, valor):
    assert getattr(razonamiento_para(modelo, nivel), campo) == valor


def test_modelo_desconocido_sin_supuestos_ni_descubrimiento():
    assert razonamiento_para('modelo-desconocido', 'low') is None
    cliente = ClienteSimulado()
    sugerir(cliente, replace(CONFIGURACION, modelo='modelo-desconocido'))
    assert cliente.llamadas[0]['config'].thinking_config is None


@pytest.mark.parametrize('datos', [
    {}, {'preguntas': 1}, {'preguntas': None},
    {**VALIDA, 'extra': CLAVE_SIMULADA},
])
def test_resultados_invalidos_se_convierten_en_fallo(datos):
    cliente = ClienteSimulado(respuesta_sdk(datos))
    with pytest.raises((ErrorResultadoEvaluacion, ErrorClienteGemini)) as error:
        sugerir(cliente)
    assert CLAVE_SIMULADA not in str(error.value)
    assert len(cliente.llamadas) == 1


@pytest.mark.parametrize('respuesta', [
    types.GenerateContentResponse(),
    types.GenerateContentResponse(candidates=[types.Candidate()]),
    types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(parts=[types.Part(text='no JSON')]))]),
    types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(parts=[
        types.Part(text=json.dumps(VALIDA), thought=True)]))]),
])
def test_salida_ausente_bloqueada_o_malformada(respuesta):
    with pytest.raises(ErrorResultadoEvaluacion):
        sugerir(ClienteSimulado(respuesta))


@pytest.mark.parametrize('error,timeout', [
    (RuntimeError(CLAVE_SIMULADA), False), (httpx.ConnectError(CLAVE_SIMULADA), False),
    (httpx.ReadTimeout(CLAVE_SIMULADA), True), (TimeoutError(CLAVE_SIMULADA), True),
    (errors.ClientError(429, {'error': {'message': CLAVE_SIMULADA, 'code': 429}}), False),
    (errors.ServerError(504, {'error': {'message': CLAVE_SIMULADA, 'code': 504}}), True),
])
def test_fallos_timeout_sin_reintentar_ni_filtrar_secretos(error, timeout, caplog):
    cliente = ClienteSimulado(error=error)
    with pytest.raises((TimeoutError, ErrorClienteGemini)) as fallo:
        sugerir(cliente)
    assert isinstance(fallo.value, TimeoutError) is timeout
    assert ('tiempo máximo' in str(fallo.value)) is timeout
    assert CLAVE_SIMULADA not in str(fallo.value) + caplog.text
    assert len(cliente.llamadas) == 1


def test_error_directo_del_adaptador_sin_causa_externa():
    adaptador = EvaluadorGemini(CONFIGURACION, cliente=ClienteSimulado(error=RuntimeError(CLAVE_SIMULADA)))
    try:
        with pytest.raises(RuntimeError) as error:
            adaptador.sugerir_preguntas(CONTEXTO)
        assert error.value.__suppress_context__ is True and error.value.__cause__ is None
        assert CLAVE_SIMULADA not in str(error.value)
    finally:
        adaptador.cerrar()


def test_log_externo_con_clave_y_traceback_se_sanea(caplog):
    def observar():
        try:
            raise RuntimeError(CLAVE_SIMULADA)
        except RuntimeError:
            logging.getLogger('google.genai').exception('Falló %s', CLAVE_SIMULADA)
    sugerir(ClienteSimulado(observar=observar))
    assert 'omitido' in caplog.text and CLAVE_SIMULADA not in caplog.text


def test_sdk_real_con_transporte_simulado_no_reintenta_429(monkeypatch):
    llamadas = []
    constructor = genai.Client
    def transporte(peticion):
        llamadas.append(peticion)
        assert peticion.extensions['timeout']['read'] == 1.25
        return httpx.Response(429, json={'error': {'code': 429, 'message': CLAVE_SIMULADA, 'status': 'RESOURCE_EXHAUSTED'}})
    cliente_http = httpx.Client(transport=httpx.MockTransport(transporte))
    def crear(**argumentos):
        assert argumentos['vertexai'] is False
        assert argumentos['http_options'].retry_options.attempts == 1
        assert argumentos['http_options'].timeout == 1250
        argumentos['http_options'].httpx_client = cliente_http
        return constructor(**argumentos)
    monkeypatch.setattr(genai, 'Client', crear)
    adaptador = EvaluadorGemini(replace(CONFIGURACION, timeout_segundos=1.25))
    try:
        with pytest.raises(ErrorClienteGemini) as error:
            adaptador.sugerir_preguntas(CONTEXTO)
        assert len(llamadas) == 1
        assert CLAVE_SIMULADA not in str(error.value)
    finally:
        adaptador.cerrar()
        cliente_http.close()


def test_sdk_con_transporte_simulado_envia_esquema_y_razonamiento(monkeypatch):
    llamadas = []
    constructor = genai.Client
    def transporte(peticion):
        llamadas.append(json.loads(peticion.content))
        return httpx.Response(200, json={'candidates': [{
            'content': {'role': 'model', 'parts': [{'text': json.dumps(VALIDA)}]}, 'finishReason': 'STOP'}]})
    cliente_http = httpx.Client(transport=httpx.MockTransport(transporte))
    def crear(**argumentos):
        argumentos['http_options'].httpx_client = cliente_http
        return constructor(**argumentos)
    monkeypatch.setattr(genai, 'Client', crear)
    adaptador = EvaluadorGemini(CONFIGURACION)
    try:
        resultado = adaptador.sugerir_preguntas(CONTEXTO)
    finally:
        adaptador.cerrar()
        cliente_http.close()
    assert resultado.preguntas == VALIDA['preguntas']
    configuracion = llamadas[0]['generationConfig']
    assert configuracion['temperature'] == TEMPERATURA_ASISTENTES and configuracion['candidateCount'] == 1
    esquema = configuracion.get('responseJsonSchema', configuracion.get('response_json_schema'))
    assert esquema['required'] == ['preguntas']
    pensamiento = configuracion['thinkingConfig']
    # ProtoJSON admite el nombre original y su equivalente lowerCamelCase.
    assert pensamiento.get('thinkingLevel', pensamiento.get('thinking_level')) == NIVEL_RAZONAMIENTO_ASISTENTES.upper()
    assert llamadas[0]['systemInstruction']['parts'][0]['text'] == prompt_guion(CONTEXTO)
    assert CLAVE_SIMULADA not in json.dumps(llamadas[0])


def test_cliente_propio_se_cierra_y_error_inicial_saneado(monkeypatch):
    cliente = ClienteSimulado()
    monkeypatch.setattr(genai, 'Client', lambda **kwargs: cliente)
    adaptador = EvaluadorGemini(CONFIGURACION)
    adaptador.cerrar()
    assert cliente.cierres == 1
    def fallar(**kwargs):
        raise RuntimeError(CLAVE_SIMULADA)
    monkeypatch.setattr(genai, 'Client', fallar)
    with pytest.raises(RuntimeError, match='No se pudo inicializar') as error:
        EvaluadorGemini(CONFIGURACION)
    assert CLAVE_SIMULADA not in str(error.value)


def test_los_asistentes_conservan_su_temperatura():
    cliente = ClienteSimulado(respuesta_sdk(VALIDA))
    adaptador = EvaluadorGemini(CONFIGURACION, cliente=cliente)
    try:
        adaptador.sugerir_preguntas(CONTEXTO)
    finally:
        adaptador.cerrar()
    assert cliente.llamadas[0]['config'].temperature == 0.2
