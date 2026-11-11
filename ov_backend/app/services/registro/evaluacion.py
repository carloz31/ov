"""Lo que queda del evaluador de registros v6 (Gemini): la validación de preguntas y el evaluador falso de los
asistentes que siguen con Gemini (diario y cartas).

Ajuste registros llm (lote 2): la evaluación de registros v6 (criterios, seguimiento, consolidada) salió; la del
registro es la capa v7 de `llm/`, que el lote 3 conecta al flujo.
"""

import re
import unicodedata

from app.core.parametros import MAXIMO_CARACTERES_PREGUNTA, PALABRAS_EVALUATIVAS


class ErrorResultadoEvaluacion(ValueError):
    """Resultado que no cumple el esquema o las reglas de consistencia."""


def sin_tildes(texto: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', texto.lower()) if unicodedata.category(c) != 'Mn')


def pregunta_valida(pregunta) -> bool:
    if not isinstance(pregunta, str):
        return False
    pregunta = pregunta.strip()
    if not pregunta or len(pregunta) > MAXIMO_CARACTERES_PREGUNTA:
        return False
    if pregunta.count('?') != 1 or not pregunta.endswith('?'):
        return False
    if re.search(r'\bC\d+\b', pregunta):
        return False
    normal = sin_tildes(pregunta)
    return not any(sin_tildes(palabra) in normal for palabra in PALABRAS_EVALUATIVAS)


class EvaluadorFalso:
    """Determinista, para los asistentes con Gemini (diario y cartas); sin red."""

    def __init__(self):
        # Diario (B09): `falla_diario` simula un fallo del LLM al personalizar.
        self.contextos_diario: list = []
        self.llamadas_diario = 0
        self.falla_diario = False

    def personalizar_entrada(self, contexto) -> dict:
        """Retoma el primer dato del contexto delante de la pregunta base."""
        self.llamadas_diario += 1
        self.contextos_diario.append(contexto)
        if self.falla_diario:
            raise RuntimeError("Fallo simulado del asistente del diario")
        dato = contexto.datos[0]
        cita = (dato.texto or ', '.join(dato.opciones)).replace('?', '').strip()[:60]
        return {"pregunta": f"Sobre «{cita}»: {contexto.pregunta_base}"}
