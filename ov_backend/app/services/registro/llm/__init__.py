"""Capa del LLM de registros (esquema v7, método B, Claude Haiku). Lote 1 del ajuste registros llm.

Sin base de datos ni endpoints: quien llama (el runner de `tests/llm` hoy, el flujo de registros desde el lote 3) le pasa
la tarjeta, la pregunta mostrada, la opción marcada, los ecos y las respuestas ya resueltos. Tres funciones:
`evaluar_primera`, `evaluar_seguimiento` y `estado_final` (pura).
"""

from app.services.registro.llm.cliente import (ClienteClaude, ClienteFalso, ClienteLLM, ClienteSinClave, LlamadaFallida,
                                              RespuestaCruda)
from app.services.registro.llm.estado import ORDEN, EstadoItem, estado_final
from app.services.registro.llm.evaluacion import Evaluacion, Salida, evaluar_primera, evaluar_seguimiento
from app.services.registro.llm.mensaje import Entrada, EntradaInvalida, armar
from app.services.registro.llm.prompt_v7_haiku_arranque import HASH_PROMPT, PROMPT, VERSION_PROMPT_LLM
from app.services.registro.llm.tarjeta import Tarjeta, tarjeta_para

__all__ = ['ClienteClaude', 'ClienteFalso', 'ClienteLLM', 'ClienteSinClave', 'Entrada', 'EntradaInvalida', 'EstadoItem', 'Evaluacion',
           'HASH_PROMPT', 'LlamadaFallida', 'ORDEN', 'PROMPT', 'RespuestaCruda', 'Salida', 'Tarjeta', 'VERSION_PROMPT_LLM',
           'armar', 'estado_final', 'evaluar_primera', 'evaluar_seguimiento', 'tarjeta_para']
