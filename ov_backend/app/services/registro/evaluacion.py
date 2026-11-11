"""Lo que queda del evaluador de registros v6 (Gemini): la validación de preguntas y el evaluador falso de los
asistentes que siguen con Gemini (diario, sugerencias de pasos del plan y guion de investigaciones).

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
    """Determinista, para los asistentes con Gemini (diario, sugerencias de pasos y guion); sin red."""

    def __init__(self):
        # Diario (B09): `falla_diario` simula un fallo del LLM al personalizar.
        self.contextos_diario: list = []
        self.llamadas_diario = 0
        self.falla_diario = False
        # Planes (B11): `falla_sugerencias` simula un fallo del LLM al sugerir pasos.
        self.contextos_sugerencias: list = []
        self.llamadas_sugerencias = 0
        self.falla_sugerencias = False
        # Investigaciones (B13): sugerencias de preguntas para el guion.
        self.contextos_guion: list = []
        self.llamadas_guion = 0

    def personalizar_entrada(self, contexto) -> dict:
        """Retoma el primer dato del contexto delante de la pregunta base."""
        self.llamadas_diario += 1
        self.contextos_diario.append(contexto)
        if self.falla_diario:
            raise RuntimeError("Fallo simulado del asistente del diario")
        dato = contexto.datos[0]
        cita = (dato.texto or ', '.join(dato.opciones)).replace('?', '').strip()[:60]
        return {"pregunta": f"Sobre «{cita}»: {contexto.pregunta_base}"}

    def sugerir_pasos(self, contexto) -> list:
        """Un paso por novedad: «investigar» para una duda y «conversar» para una complicación.

        Marcas en el texto de la novedad: `[falla]` lanza error; `[malformado]` devuelve algo fuera del esquema;
        `[tipo-invalido]`, `[largo]`, `[tres]` y `[sin-pasos]` cambian sus pasos; `[ajeno]` agrega un número no
        enviado."""
        self.llamadas_sugerencias += 1
        self.contextos_sugerencias.append(contexto)
        textos = ' '.join(novedad.texto for novedad in contexto.novedades)
        if self.falla_sugerencias or '[falla]' in textos:
            raise RuntimeError("Fallo simulado de las sugerencias")
        if '[malformado]' in textos:
            return {'pasos': 'DATO DE PRUEBA'}
        clave = 'duda' if contexto.tipo == 'DUDAS' else 'complicacion'
        lugar = contexto.institucion.nombre if contexto.institucion is not None else contexto.carrera
        resultado = []
        for novedad in contexto.novedades:
            tipo = 'investigar' if clave == 'duda' else 'conversar'
            paso = {'tipo': tipo, 'texto': f'Busca en {lugar}: {novedad.texto}' if clave == 'duda'
                    else f'Conversa en casa sobre: {novedad.texto}'}
            if '[tipo-invalido]' in novedad.texto:
                paso['tipo'] = 'nadar'
            if '[largo]' in novedad.texto:
                paso['texto'] = 'x' * 200
            pasos = [paso] * 3 if '[tres]' in novedad.texto else [] if '[sin-pasos]' in novedad.texto else [paso]
            resultado.append({clave: novedad.numero, 'pasos': pasos})
            if '[ajeno]' in novedad.texto:
                resultado.append({clave: 999, 'pasos': [paso]})
        return resultado

    def sugerir_preguntas(self, contexto) -> dict:
        """Tres preguntas nuevas, distintas en cada llamada, más una que repite la primera base (el servicio la
        filtra). Marcas en los textos: `[falla]` lanza error; `[malformado]` sale del esquema; `[vacio]` no propone."""
        self.llamadas_guion += 1
        self.contextos_guion.append(contexto)
        textos = ' '.join((contexto.dia, contexto.necesita, contexto.duda))
        if '[falla]' in textos:
            raise RuntimeError("Fallo simulado de las sugerencias del guion")
        if '[malformado]' in textos:
            return {'preguntas': 'DATO DE PRUEBA'}
        if '[vacio]' in textos:
            return {'preguntas': []}
        n = self.llamadas_guion
        return {'preguntas': [contexto.preguntas_base[0],
                              f'¿Qué te sorprendió al empezar en {contexto.familia}? ({n})',
                              f'¿Qué parte de tu trabajo casi nadie conoce? ({n})',
                              f'¿Qué harías distinto si empezaras hoy? ({n})']}
