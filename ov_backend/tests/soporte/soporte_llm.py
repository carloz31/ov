"""Cliente del LLM para las pruebas de la plataforma (ajuste registros llm, lote 3): nunca llama a la red.

Devuelve, en orden, lo que se le encola (`encolar`): un tipo (`'general'`), el JSON de una salida, una
`RespuestaCruda` o una excepción, que se levanta. Sin nada en cola responde según el esquema que recibe: `propio` a los
registros, una pregunta por campo con texto al guion y un paso por novedad a los pasos del plan (ajuste
llm-sugerencias). Guarda cada llamada.
"""

import json
import re

from app.services.registro.llm import LlamadaFallida, RespuestaCruda

TIPOS = ('propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional')
REPREGUNTA = '¿Qué ejemplo concreto te viene a la mente?'


def salida(tipo='propio', repregunta=None, sensible=False, arranque=None, motivo='m'):
    """El JSON de una salida del LLM; los tipos con repregunta llevan una por defecto."""
    if repregunta is None and tipo in ('general', 'no_sabe', 'vacio', 'fuera_de_tema'):
        repregunta = REPREGUNTA
    return json.dumps({'motivo': motivo, 'tipo': tipo, 'sensible': sensible, 'repregunta': repregunta,
                       'arranque': arranque})


def salida_guion(dia=None, necesita=None, duda=None, motivo='m'):
    """El JSON de una salida del guion; cada campo, una pregunta o None."""
    return json.dumps({campo: {'motivo': motivo, 'pregunta': pregunta}
                       for campo, pregunta in (('dia', dia), ('necesita', necesita), ('duda', duda))})


def salida_pasos(*sugerencias):
    """El JSON de una salida de pasos: cada sugerencia, `(numero, clase, [(tipo, texto), ...])` o un dict ya armado."""
    return json.dumps({'sugerencias': [
        s if isinstance(s, dict) else {'numero': s[0], 'clase': s[1], 'motivo': 'm',
                                       'pasos': [{'tipo': t, 'texto': x} for t, x in s[2]]}
        for s in sugerencias]})


def _etiqueta(mensaje, nombre):
    encontrado = re.search(rf'<{nombre}>(.*?)</{nombre}>', mensaje, re.S)
    return encontrado.group(1).strip() if encontrado else ''


def guion_por_defecto(mensaje):
    """Una pregunta por campo con texto, que nombra lo que escribió el estudiante."""
    def pregunta(campo):
        texto = re.sub(r'[¿?]', '', _etiqueta(mensaje, campo))[:40].strip()
        return f'¿Cómo se vive en tu trabajo lo de «{texto}»?' if texto else None
    return salida_guion(pregunta('dia'), pregunta('necesita'), pregunta('duda'))


def pasos_por_defecto(mensaje):
    """Un paso por novedad numerada: `investigar` para una duda, `conversar` para una complicación."""
    dudas = _etiqueta(mensaje, 'dudas')
    lineas = dudas or _etiqueta(mensaje, 'complicaciones')
    tipo, clase = ('investigar', 'dato') if dudas else ('conversar', 'lista')
    novedades = re.findall(r'^(\d+)\. (.*)$', lineas, re.M)
    return salida_pasos(*((int(n), clase, [(tipo, f'Revisar en la ficha de la carrera lo de: {t[:60]}')])
                          for n, t in novedades))


def por_defecto(mensaje, esquema):
    propiedades = esquema.get('properties', {})
    if 'dia' in propiedades:
        return guion_por_defecto(mensaje)
    if 'sugerencias' in propiedades:
        return pasos_por_defecto(mensaje)
    return salida('propio')


def fallo(causa='error'):
    return LlamadaFallida(causa)


class ClientePrueba:
    modelo = 'prueba'

    def __init__(self):
        self.cola = []
        self.llamadas = []
        self.topes = []
        # Sin cola, las llamadas de pasos del plan fallan: solo quedan los respaldos (ajuste llm-sugerencias).
        self.fallar_pasos = False

    def encolar(self, *respuestas):
        self.cola.extend(respuestas)
        return self

    def llamar(self, sistema, mensaje, esquema, **topes):
        self.llamadas.append((sistema, mensaje, esquema))
        self.topes.append(topes)
        if self.cola:
            respuesta = self.cola.pop(0)
        elif self.fallar_pasos and 'sugerencias' in esquema.get('properties', {}):
            respuesta = fallo()
        else:
            respuesta = por_defecto(mensaje, esquema)
        if isinstance(respuesta, Exception):
            raise respuesta
        if isinstance(respuesta, RespuestaCruda):
            return respuesta
        if respuesta in TIPOS:
            respuesta = salida(respuesta)
        return RespuestaCruda(texto=respuesta, parada='end_turn')
