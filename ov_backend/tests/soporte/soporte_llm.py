"""Cliente del LLM para las pruebas de la plataforma (ajuste registros llm, lote 3): nunca llama a la red.

Devuelve, en orden, lo que se le encola (`encolar`): un tipo (`'general'`), el JSON de una salida, una
`RespuestaCruda` o una excepción, que se levanta. Sin nada en cola, responde `propio`. Guarda cada llamada.
"""

import json

from app.services.registro.llm import LlamadaFallida, RespuestaCruda

TIPOS = ('propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional')
REPREGUNTA = '¿Qué ejemplo concreto te viene a la mente?'


def salida(tipo='propio', repregunta=None, sensible=False, arranque=None, motivo='m'):
    """El JSON de una salida del LLM; los tipos con repregunta llevan una por defecto."""
    if repregunta is None and tipo in ('general', 'no_sabe', 'vacio', 'fuera_de_tema'):
        repregunta = REPREGUNTA
    return json.dumps({'motivo': motivo, 'tipo': tipo, 'sensible': sensible, 'repregunta': repregunta,
                       'arranque': arranque})


def fallo(causa='error'):
    return LlamadaFallida(causa)


class ClientePrueba:
    modelo = 'prueba'

    def __init__(self):
        self.cola = []
        self.llamadas = []

    def encolar(self, *respuestas):
        self.cola.extend(respuestas)
        return self

    def llamar(self, sistema, mensaje, esquema):
        self.llamadas.append((sistema, mensaje, esquema))
        respuesta = self.cola.pop(0) if self.cola else 'propio'
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, RespuestaCruda):
            return respuesta
        if respuesta in TIPOS:
            respuesta = salida(respuesta)
        return RespuestaCruda(texto=respuesta, parada='end_turn')
