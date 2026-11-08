"""Evaluador Gemini (B03): entrega y seguimiento con cliente simulado, sin red."""

import json
import logging
from dataclasses import replace
import httpx
import pytest
from google import genai
from google.genai import errors, types
from app.config import Configuracion
from app.services.registro.evaluacion import (
    CriterioEvaluacion, ItemPorEvaluar, TurnoEvaluacion, procesar_entrega, procesar_seguimiento,
)
from app.services.diario.asistente import ContextoPersonalizacion, DatoPersonalizacion
from app.services.registro.evaluacion import ContextoEntrega, ContextoSeguimiento, GuiaSeguimiento, ItemEntrega
from app.services.registro.gemini import EvaluadorGemini, mensaje_evaluador, razonamiento_minimo
from app.services.registro.prompt import PROMPT_ENTREGA, PROMPT_SEGUIMIENTO
from soporte_red import impedir_red


CLAVE_SIMULADA = 'clave-sintetica-solo-pruebas'
CONFIGURACION = Configuracion(evaluador='gemini', clave=CLAVE_SIMULADA)
CRITERIOS = (CriterioEvaluacion('C1', 'ACCION', 'Acción concreta', '¿Qué podrías hacer al respecto?'),
             CriterioEvaluacion('C2', 'EJEMPLO', 'Situación concreta', '¿Podrías darme un ejemplo concreto?'))
ITEM = ItemPorEvaluar('I1', '¿Qué harás para practicarla?', CRITERIOS, ('Asertividad',),
                      'En el trabajo de Comunicación del jueves voy a decir mi opinión al menos una vez.', 40,
                      'Cuéntame más')
# Contrato v5 (ajuste registros): `{cumple, abierto, sensible, falta, repregunta[, consolidada]}`.
ADECUADA = {'items': [{'item': 'I1', 'cumple': True, 'abierto': False, 'sensible': False, 'falta': None,
                       'repregunta': None}]}
VAGA = {'items': [{'item': 'I1', 'cumple': False, 'abierto': False, 'sensible': False,
                   'falta': 'Una situación concreta', 'repregunta': '¿En qué trabajo de Comunicación lo harías?'}]}
SEGUIMIENTO = {'cumple': True, 'abierto': False, 'sensible': False, 'falta': None, 'repregunta': None,
               'consolidada': 'Voy a decir mi opinión el jueves en Comunicación.'}


def respuesta_sdk(datos=ADECUADA):
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


def entregar(cliente, configuracion=CONFIGURACION, item=ITEM):
    adaptador = EvaluadorGemini(configuracion, cliente=cliente)
    try:
        resultado = procesar_entrega('Mi plan', (item,), adaptador, modelo=configuracion.modelo,
                                     tiempo_maximo_segundos=configuracion.timeout_segundos)['I1']
        assert adaptador.latencia_ms is not None
        return resultado
    finally:
        adaptador.cerrar()


def test_entrega_con_salida_estructurada_y_contexto_exclusivo():
    cliente = ClienteSimulado()
    resultado = entregar(cliente)
    assert resultado.origen == 'LLM' and resultado.clasificacion == 'ADECUADA'
    assert resultado.modelo == CONFIGURACION.modelo and resultado.version_prompt == 'v6.3'
    llamada, = cliente.llamadas
    datos = json.loads(llamada['contents'])
    assert set(datos) == {'titulo_actividad', 'items'}
    assert datos['items'][0]['opciones_elegidas'] == ['Asertividad']
    assert datos['items'][0]['criterios'][0] == {'codigo': 'C1', 'tipo': 'ACCION', 'descripcion': 'Acción concreta',
                                                 'repregunta': '¿Qué podrías hacer al respecto?'}
    assert CLAVE_SIMULADA not in llamada['contents']
    configuracion = llamada['config']
    assert configuracion.system_instruction == PROMPT_ENTREGA
    # Ajuste pruebas llm: 1.0 en el registro.
    assert configuracion.temperature == 1.0 and configuracion.response_mime_type == 'application/json'
    assert 'items' in configuracion.response_json_schema['required']
    assert configuracion.thinking_config.thinking_level == 'LOW'
    assert configuracion.automatic_function_calling.disable is True
    assert cliente.cierres == 0  # El cliente inyectado pertenece al llamador.


def test_modelo_por_defecto_es_gemini_3_8_flash():
    assert CONFIGURACION.modelo == 'gemini-3.8-flash'


def test_entrega_poco_desarrollada_usa_la_pregunta_redactada():
    resultado = entregar(ClienteSimulado(respuesta_sdk(VAGA)))
    assert resultado.criterios_faltantes == ('C1', 'C2') and resultado.falta == 'Una situación concreta'
    assert resultado.pregunta == '¿En qué trabajo de Comunicación lo harías?'


def test_seguimiento_consolida_con_su_instruccion():
    cliente = ClienteSimulado(respuesta_sdk(SEGUIMIENTO))
    adaptador = EvaluadorGemini(CONFIGURACION, cliente=cliente)
    try:
        resultado = procesar_seguimiento('Mi plan', ITEM, (TurnoEvaluacion('¿Cuándo?', 'El jueves'),), adaptador,
                                         pregunta_generica=False)
    finally:
        adaptador.cerrar()
    assert resultado.origen == 'LLM' and resultado.consolidada == SEGUIMIENTO['consolidada']
    llamada, = cliente.llamadas
    assert llamada['config'].system_instruction == PROMPT_SEGUIMIENTO
    datos = json.loads(llamada['contents'])
    assert datos['turnos'] == [{'pregunta': '¿Cuándo?', 'respuesta': 'El jueves'}]
    assert datos['ecos'] == [] and 'otras_respuestas' not in datos
    assert 'consolidada' in llamada['config'].response_json_schema['required']


@pytest.mark.parametrize('modelo,campo,valor', [
    ('gemini-3.8-flash', 'thinking_level', 'LOW'),
    ('models/gemini-3.8-flash', 'thinking_level', 'LOW'),
    ('gemini-3.1-flash-lite', 'thinking_level', 'MINIMAL'),
    ('gemini-3-flash-preview', 'thinking_level', 'MINIMAL'),
    ('gemini-3.1-pro-preview', 'thinking_level', 'LOW'),
    ('gemini-2.5-flash', 'thinking_budget', 0),
    ('gemini-2.5-pro', 'thinking_budget', 128),
])
def test_razonamiento_minimo_compatible(modelo, campo, valor):
    assert getattr(razonamiento_minimo(modelo), campo) == valor


def test_modelo_desconocido_sin_supuestos_ni_descubrimiento():
    assert razonamiento_minimo('modelo-desconocido') is None
    cliente = ClienteSimulado()
    entregar(cliente, replace(CONFIGURACION, modelo='modelo-desconocido'))
    assert cliente.llamadas[0]['config'].thinking_config is None


@pytest.mark.parametrize('datos', [
    {}, {'items': []}, {'items': [{**ADECUADA['items'][0], 'cumple': 'sí'}]},
    {'items': [{**ADECUADA['items'][0], 'extra': CLAVE_SIMULADA}]},
    {'items': [{**ADECUADA['items'][0], 'item': 'I2'}]},
    {'items': [{k: v for k, v in VAGA['items'][0].items() if k != 'sensible'}]},
])
def test_resultados_invalidos_se_convierten_en_fallo(datos):
    cliente = ClienteSimulado(respuesta_sdk(datos))
    resultado = entregar(cliente)
    assert resultado.origen == 'EXTENSION_MINIMA' and resultado.clasificacion == 'NO_EVALUADA'
    assert 'esquema' in resultado.error and CLAVE_SIMULADA not in resultado.error
    assert len(cliente.llamadas) == 1


@pytest.mark.parametrize('respuesta', [
    types.GenerateContentResponse(),
    types.GenerateContentResponse(candidates=[types.Candidate()]),
    types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(parts=[types.Part(text='no JSON')]))]),
    types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(parts=[
        types.Part(text=json.dumps(ADECUADA), thought=True)]))]),
])
def test_salida_ausente_bloqueada_o_malformada(respuesta):
    assert entregar(ClienteSimulado(respuesta)).origen == 'EXTENSION_MINIMA'


@pytest.mark.parametrize('error,timeout', [
    (RuntimeError(CLAVE_SIMULADA), False), (httpx.ConnectError(CLAVE_SIMULADA), False),
    (httpx.ReadTimeout(CLAVE_SIMULADA), True), (TimeoutError(CLAVE_SIMULADA), True),
    (errors.ClientError(429, {'error': {'message': CLAVE_SIMULADA, 'code': 429}}), False),
    (errors.ServerError(504, {'error': {'message': CLAVE_SIMULADA, 'code': 504}}), True),
])
def test_fallos_timeout_sin_reintentar_ni_filtrar_secretos(error, timeout, caplog):
    cliente = ClienteSimulado(error=error)
    resultado = entregar(cliente, item=replace(ITEM, texto='Corto'))
    assert resultado.origen == 'EXTENSION_MINIMA' and resultado.pregunta == 'Cuéntame más'
    assert ('tiempo máximo' in resultado.error) is timeout
    assert CLAVE_SIMULADA not in resultado.error + caplog.text
    assert len(cliente.llamadas) == 1


def test_error_directo_del_adaptador_sin_causa_externa():
    adaptador = EvaluadorGemini(CONFIGURACION, cliente=ClienteSimulado(error=RuntimeError(CLAVE_SIMULADA)))
    try:
        with pytest.raises(RuntimeError) as error:
            adaptador.evaluar_entrega(None)
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
    entregar(ClienteSimulado(observar=observar))
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
        resultado = procesar_entrega('Mi plan', (ITEM,), adaptador)['I1']
        assert resultado.origen == 'EXTENSION_MINIMA' and len(llamadas) == 1
        assert CLAVE_SIMULADA not in resultado.error
    finally:
        adaptador.cerrar()
        cliente_http.close()


def test_sdk_con_transporte_simulado_envia_esquema_y_razonamiento(monkeypatch):
    llamadas = []
    constructor = genai.Client
    def transporte(peticion):
        llamadas.append(json.loads(peticion.content))
        return httpx.Response(200, json={'candidates': [{
            'content': {'role': 'model', 'parts': [{'text': json.dumps(VAGA)}]}, 'finishReason': 'STOP'}]})
    cliente_http = httpx.Client(transport=httpx.MockTransport(transporte))
    def crear(**argumentos):
        argumentos['http_options'].httpx_client = cliente_http
        return constructor(**argumentos)
    monkeypatch.setattr(genai, 'Client', crear)
    adaptador = EvaluadorGemini(CONFIGURACION)
    try:
        resultado = procesar_entrega('Mi plan', (ITEM,), adaptador)['I1']
    finally:
        adaptador.cerrar()
        cliente_http.close()
    assert resultado.origen == 'LLM' and resultado.criterios_faltantes == ('C1', 'C2')
    configuracion = llamadas[0]['generationConfig']
    assert configuracion['temperature'] == 1.0 and configuracion['candidateCount'] == 1
    pensamiento = configuracion['thinkingConfig']
    # ProtoJSON admite el nombre original y su equivalente lowerCamelCase.
    assert pensamiento.get('thinkingLevel', pensamiento.get('thinking_level')) == 'LOW'
    assert llamadas[0]['systemInstruction']['parts'][0]['text'] == PROMPT_ENTREGA
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


# --- Ajuste pruebas llm ---------------------------------------------------------------------

GUIA = GuiaSeguimiento('Un hecho concreto', '¿Hay un momento que lo muestre?', ('Gané el concurso',), ('Soy bueno',))


def test_mensaje_sin_repregunta_generica_si_el_item_tiene_guia():
    con_guia = ItemEntrega('I1', 'Consigna', CRITERIOS, GUIA, (), (), 'Texto')
    sin_guia = ItemEntrega('I2', 'Consigna', CRITERIOS, None, (), (), 'Texto')
    datos = json.loads(mensaje_evaluador(ContextoEntrega('Mi plan', (con_guia, sin_guia))))
    assert all('repregunta' not in c for c in datos['items'][0]['criterios'])
    assert [c['repregunta'] for c in datos['items'][1]['criterios']] == [c.repregunta for c in CRITERIOS]
    assert datos['items'][0]['guia']['texto_base'] == GUIA.texto_base
    seguimiento = ContextoSeguimiento('Mi plan', 'Consigna', CRITERIOS, GUIA, (), (), 'Texto',
                                      (TurnoEvaluacion('¿Cuándo?', 'Ayer'),))
    assert all('repregunta' not in c for c in json.loads(mensaje_evaluador(seguimiento))['criterios'])
    # El adaptador envía ese mismo texto.
    cliente = ClienteSimulado()
    entregar(cliente, item=replace(ITEM, guia=GUIA))
    assert cliente.llamadas[0]['contents'] == mensaje_evaluador(
        ContextoEntrega('Mi plan', (ItemEntrega('I1', ITEM.consigna, CRITERIOS, GUIA, ITEM.opciones_elegidas, (),
                                                ITEM.texto),)))


def test_los_asistentes_conservan_su_temperatura():
    cliente = ClienteSimulado(respuesta_sdk({'pregunta': '¿Qué te gustó de eso?'}))
    adaptador = EvaluadorGemini(CONFIGURACION, cliente=cliente)
    try:
        adaptador.personalizar_entrada(ContextoPersonalizacion('¿Qué te gustó?', (DatoPersonalizacion('TEXTO', 'x', ()),)))
    finally:
        adaptador.cerrar()
    assert cliente.llamadas[0]['config'].temperature == 0.2
