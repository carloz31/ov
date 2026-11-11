"""Adaptador síncrono Gemini de los asistentes (diario y sugerencias de pasos): una petición, sin sesiones de
base de datos. Ajuste registros llm (lote 2): el registro ya no pasa por aquí."""

import json
import logging
from dataclasses import asdict
from math import ceil
from threading import local
from time import perf_counter
from urllib.parse import quote

import httpx
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.config import Configuracion, ErrorConfiguracionRegistro
from app.core.parametros import NIVEL_RAZONAMIENTO_ASISTENTES, TEMPERATURA_ASISTENTES
from app.services.diario.asistente import (
    PROMPT_CARTA_V1, PROMPT_DIARIO_V1, ContextoCarta, PreguntaPersonalizada, validar_personalizacion,
)
from app.services.planes.sugerencias import RespuestaSugerencias, prompt_sugerencias
from app.services.registro.evaluacion import ErrorResultadoEvaluacion


def mensaje_evaluador(contexto) -> str:
    """El texto que recibe Gemini: el contexto en JSON (diario, cartas y sugerencias de pasos)."""
    return json.dumps(asdict(contexto), ensure_ascii=False)


class ErrorClienteGemini(RuntimeError):
    """Mensaje fijo del adaptador, sin excepciones ni contenido externos."""


class FiltroSecretos(logging.Filter):
    def __init__(self, clave):
        super().__init__()
        self.secretos = (clave, quote(clave, safe=''))

    def filter(self, registro):
        # Tampoco conservar traceback/argumentos externos si contienen la clave.
        mensaje = logging.Formatter().format(registro)
        if any(secreto in mensaje for secreto in self.secretos):
            registro.msg = 'Mensaje externo omitido para proteger la configuración de Gemini'
            registro.args = ()
            registro.exc_info = registro.exc_text = registro.stack_info = None
        return True


def razonamiento_para(modelo, nivel):
    """El nivel pedido o, si el modelo no lo admite, su mínimo; `None` si el modelo es desconocido."""
    nombre = modelo.removeprefix('models/')
    if nombre in ('gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview',
                  'gemini-3-flash-preview'):
        return types.ThinkingConfig(thinking_level=nivel)
    # gemini-3.8-flash no admite `minimal` ni apagar el razonamiento: `low` es su mínimo.
    if nombre in ('gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3-pro-preview'):
        return types.ThinkingConfig(thinking_level='low' if nivel == 'minimal' else nivel)
    # Los 2.5 no tienen niveles: siempre su presupuesto mínimo.
    if nombre in ('gemini-2.5-flash', 'gemini-2.5-flash-lite'):
        return types.ThinkingConfig(thinking_budget=0)
    if nombre == 'gemini-2.5-pro':
        return types.ThinkingConfig(thinking_budget=128)
    # No descubrir capacidades con una petición ni asumirlas para modelos desconocidos.
    return None


class EvaluadorGemini:
    def __init__(self, configuracion: Configuracion, *, cliente=None):
        if not configuracion.clave:
            raise ErrorConfiguracionRegistro('Falta GEMINI_API_KEY para usar EVALUADOR=gemini')
        self.configuracion = configuracion
        self._metricas = local()
        self._cliente_propio = cliente is None
        self._filtro = FiltroSecretos(configuracion.clave)
        nombres = {'google.genai', 'httpx', 'httpcore'} | {
            nombre for nombre in logging.Logger.manager.loggerDict
            if nombre.startswith(('google.genai.', 'httpx.', 'httpcore.'))
        }
        self._loggers = [logging.getLogger(nombre) for nombre in nombres]
        for logger in self._loggers:
            logger.addFilter(self._filtro)
        try:
            self._cliente = cliente if cliente is not None else genai.Client(
                api_key=configuracion.clave, vertexai=False,
                http_options=types.HttpOptions(
                    timeout=max(1, ceil(configuracion.timeout_segundos * 1000)),
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
        except Exception:
            self._quitar_filtros()
            raise ErrorClienteGemini('No se pudo inicializar el cliente Gemini') from None

    def personalizar_entrada(self, contexto):
        prompt = PROMPT_CARTA_V1 if isinstance(contexto, ContextoCarta) else PROMPT_DIARIO_V1
        return self._medir(contexto, prompt, PreguntaPersonalizada, validar_personalizacion)

    def sugerir_pasos(self, contexto):
        # El servicio filtra los pasos (tipos, números, longitud); aquí solo se exige el esquema.
        return self._medir(contexto, prompt_sugerencias(contexto), RespuestaSugerencias,
                           lambda resultado, _contexto: resultado)

    def _medir(self, contexto, instruccion, esquema, validar):
        inicio = perf_counter()
        try:
            return self._evaluar(contexto, instruccion, esquema, validar)
        finally:
            self._metricas.latencia_ms = max(0, round((perf_counter() - inicio) * 1000))

    @property
    def latencia_ms(self):
        return getattr(self._metricas, 'latencia_ms', None)

    def _evaluar(self, contexto, instruccion, esquema, validar):
        temperatura, nivel = TEMPERATURA_ASISTENTES, NIVEL_RAZONAMIENTO_ASISTENTES
        try:
            respuesta = self._cliente.models.generate_content(
                model=self.configuracion.modelo,
                contents=mensaje_evaluador(contexto),
                config=types.GenerateContentConfig(
                    system_instruction=instruccion,
                    temperature=temperatura, candidate_count=1,
                    response_mime_type='application/json',
                    response_json_schema=esquema.model_json_schema(),
                    thinking_config=razonamiento_para(self.configuracion.modelo, nivel),
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            # No usar .text: el SDK puede registrar partes no textuales en sus avisos.
            candidatos = respuesta.candidates or []
            partes = candidatos[0].content.parts if candidatos and candidatos[0].content else []
            texto = ''.join(parte.text for parte in (partes or []) if parte.text and not parte.thought)
            return validar(esquema.model_validate_json(texto), contexto)
        except (TimeoutError, httpx.TimeoutException):
            raise TimeoutError('Se agotó el tiempo máximo de evaluación') from None
        except errors.APIError as error:
            if error.code in (408, 504):
                raise TimeoutError('Se agotó el tiempo máximo de evaluación') from None
            raise ErrorClienteGemini('Falló la petición a Gemini') from None
        except (ValidationError, ErrorResultadoEvaluacion):
            raise ErrorResultadoEvaluacion('Gemini devolvió un resultado inválido') from None
        except Exception:
            raise ErrorClienteGemini('Falló la petición a Gemini') from None

    def _quitar_filtros(self):
        for logger in self._loggers:
            logger.removeFilter(self._filtro)

    def cerrar(self):
        try:
            if self._cliente_propio:
                self._cliente.close()
        except Exception:
            raise ErrorClienteGemini('No se pudo cerrar el cliente Gemini') from None
        finally:
            self._quitar_filtros()
