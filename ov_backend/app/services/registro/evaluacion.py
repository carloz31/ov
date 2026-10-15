"""Evaluación de registros (B03); sin base de datos, routers ni configuración de red.

Una llamada al entregar el registro (todos los ítems con criterios) y una por cada respuesta a
una pregunta de seguimiento (reevalúa el ítem y lo consolida). Lo que no pasa por el LLM se
resuelve en código con origen EXTENSION_MINIMA.
"""

import json
import re
import unicodedata
from dataclasses import asdict, dataclass
from math import isfinite
from time import perf_counter
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.parametros import (
    FACTOR_MAXIMO_CONSOLIDADA, MAXIMO_CARACTERES_PREGUNTA, MIN_CARACTERES_RESPALDO, PALABRAS_EVALUATIVAS,
    TIEMPO_MAXIMO_EVALUACION_SEGUNDOS, VERSION_PROMPT_REGISTRO,
)
from app.models.enums import ClasificacionRespuesta, OrigenEvaluacion


@dataclass(frozen=True, slots=True)
class CriterioEvaluacion:
    codigo: str
    tipo: str
    descripcion: str
    repregunta: str


@dataclass(frozen=True, slots=True)
class TurnoEvaluacion:
    pregunta: str
    respuesta: str | None


@dataclass(frozen=True, slots=True)
class ItemEntrega:
    item: str
    consigna: str
    criterios: tuple[CriterioEvaluacion, ...]
    opciones_elegidas: tuple[str, ...]
    texto: str


@dataclass(frozen=True, slots=True)
class ContextoEntrega:
    titulo_actividad: str
    items: tuple[ItemEntrega, ...]


@dataclass(frozen=True, slots=True)
class RespuestaOtroItem:
    consigna: str
    texto: str


@dataclass(frozen=True, slots=True)
class ContextoSeguimiento:
    titulo_actividad: str
    consigna: str
    criterios: tuple[CriterioEvaluacion, ...]
    criterios_faltantes_previos: tuple[str, ...]
    opciones_elegidas: tuple[str, ...]
    texto_inicial: str
    turnos: tuple[TurnoEvaluacion, ...]
    otras_respuestas: tuple[RespuestaOtroItem, ...]


class _Estricto(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)


class ResultadoItemEntrega(_Estricto):
    item: str
    clasificacion: Literal["ADECUADA", "POCO_DESARROLLADA"]
    criterios_faltantes: list[str]
    pregunta: str | None


class ResultadoEntrega(_Estricto):
    items: list[ResultadoItemEntrega]


class ResultadoSeguimiento(_Estricto):
    clasificacion: Literal["ADECUADA", "POCO_DESARROLLADA"]
    criterios_faltantes: list[str]
    pregunta: str | None
    consolidada: str


class EvaluadorRespuestas(Protocol):
    def evaluar_entrega(self, contexto: ContextoEntrega) -> ResultadoEntrega: ...

    def evaluar_seguimiento(self, contexto: ContextoSeguimiento) -> ResultadoSeguimiento: ...


class ErrorResultadoEvaluacion(ValueError):
    """Resultado que no cumple el esquema o las reglas de consistencia."""


@dataclass(frozen=True, slots=True)
class EvaluacionProcesada:
    origen: OrigenEvaluacion
    clasificacion: ClasificacionRespuesta
    criterios_faltantes: tuple[str, ...]
    pregunta: str | None
    modelo: str | None
    version_prompt: str | None
    latencia_ms: int | None
    error: str | None
    texto_evaluado: str
    consolidada: str | None = None


@dataclass(frozen=True, slots=True)
class ItemPorEvaluar:
    """Lo que la acción sabe de un ítem; `criterios` vacío significa que se evalúa en código."""
    codigo: str
    consigna: str
    criterios: tuple[CriterioEvaluacion, ...]
    opciones_elegidas: tuple[str, ...]
    texto: str
    min_caracteres: int | None
    repregunta_generica: str


# --- Textos ---------------------------------------------------------------------------------

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


def repregunta_base(criterios, faltantes) -> str:
    """La repregunta del primer criterio faltante, por orden de criterio."""
    return next(c.repregunta for c in criterios if c.codigo in faltantes)


def pregunta_o_base(pregunta, criterios, faltantes) -> str:
    return pregunta.strip() if pregunta_valida(pregunta) else repregunta_base(criterios, faltantes)


def concatenar(texto_inicial: str, turnos) -> str:
    partes = [texto_inicial.strip()] + [t.respuesta.strip() for t in turnos if t.respuesta and t.respuesta.strip()]
    return '\n\n'.join(partes)


def consolidada_o_concatenacion(consolidada, texto_inicial: str, turnos) -> str:
    concatenacion = concatenar(texto_inicial, turnos)
    if isinstance(consolidada, str) and consolidada.strip() and (
            len(consolidada.strip()) <= FACTOR_MAXIMO_CONSOLIDADA * len(concatenacion)):
        return consolidada.strip()
    return concatenacion


def serializar_conversacion(texto_inicial: str, turnos=()) -> str:
    return json.dumps({'texto_inicial': texto_inicial, 'turnos': [asdict(t) for t in turnos]}, ensure_ascii=False)


# --- Validación -----------------------------------------------------------------------------

def _validar_faltantes(clasificacion, faltantes, codigos, previos):
    if len(faltantes) != len(set(faltantes)):
        raise ErrorResultadoEvaluacion("Los criterios faltantes no pueden repetirse")
    if any(codigo not in codigos for codigo in faltantes):
        raise ErrorResultadoEvaluacion("Los criterios faltantes no pertenecen al ítem")
    if not set(faltantes).issubset(previos):
        raise ErrorResultadoEvaluacion("No pueden faltar criterios ya cumplidos")
    if clasificacion == "ADECUADA" and faltantes:
        raise ErrorResultadoEvaluacion("Una respuesta adecuada no puede tener criterios faltantes")
    if clasificacion == "POCO_DESARROLLADA" and not faltantes:
        raise ErrorResultadoEvaluacion("Una respuesta poco desarrollada requiere criterios faltantes")


def _revalidar(modelo, resultado):
    # Validar también instancias construidas sin validación o listas mutadas.
    datos = resultado.model_dump(warnings=False) if isinstance(resultado, BaseModel) else resultado
    try:
        return modelo.model_validate(datos)
    except ValidationError:
        raise ErrorResultadoEvaluacion("El resultado no cumple el esquema de evaluación") from None


def validar_entrega(resultado, contexto: ContextoEntrega) -> ResultadoEntrega:
    validado = _revalidar(ResultadoEntrega, resultado)
    enviados = {item.item: item for item in contexto.items}
    recibidos = [r.item for r in validado.items]
    if len(recibidos) != len(set(recibidos)) or set(recibidos) != set(enviados):
        raise ErrorResultadoEvaluacion("El resultado no corresponde a los ítems enviados")
    for r in validado.items:
        codigos = {c.codigo for c in enviados[r.item].criterios}
        _validar_faltantes(r.clasificacion, r.criterios_faltantes, codigos, codigos)
    return validado


def validar_seguimiento(resultado, contexto: ContextoSeguimiento) -> ResultadoSeguimiento:
    validado = _revalidar(ResultadoSeguimiento, resultado)
    _validar_faltantes(validado.clasificacion, validado.criterios_faltantes,
                       {c.codigo for c in contexto.criterios}, set(contexto.criterios_faltantes_previos))
    return validado


# --- Procesamiento --------------------------------------------------------------------------

def _validar_parametros(tiempo_maximo_segundos):
    if isinstance(tiempo_maximo_segundos, bool) or not isfinite(tiempo_maximo_segundos) or tiempo_maximo_segundos <= 0:
        raise ValueError("El tiempo máximo de evaluación debe ser positivo y finito")


def _llamar(funcion, validar, contexto, tiempo_maximo_segundos):
    """Devuelve (resultado o None, error o None, latencia_ms)."""
    inicio = perf_counter()
    resultado, error = None, None
    try:
        resultado = validar(funcion(contexto), contexto)
    except TimeoutError:
        error = "Se agotó el tiempo máximo de evaluación"
    except (ErrorResultadoEvaluacion, ValidationError):
        error = "El resultado del evaluador no cumple el esquema o las reglas de consistencia"
    except Exception:
        # Nunca persistir el mensaje de una excepción externa: podría incluir secretos.
        error = "Falló el evaluador de respuestas"
    duracion = perf_counter() - inicio
    if duracion > tiempo_maximo_segundos:
        error = "Se agotó el tiempo máximo de evaluación"
    return (None if error else resultado), error, max(0, round(duracion * 1000))


def _en_codigo(clasificacion, pregunta, texto_evaluado, *, faltantes=(), error=None, latencia_ms=None,
               modelo=None, version_prompt=None, consolidada=None):
    return EvaluacionProcesada(OrigenEvaluacion.EXTENSION_MINIMA, clasificacion, tuple(faltantes), pregunta,
                               modelo, version_prompt, latencia_ms, error, texto_evaluado, consolidada)


def evaluar_por_extension(texto: str, min_caracteres: int | None, repregunta_generica: str, texto_evaluado: str,
                          consolidada=None) -> EvaluacionProcesada:
    """Ítem sin criterios: la extensión mínima, si la tiene, es su único criterio."""
    if min_caracteres is not None and len(texto.strip()) < min_caracteres:
        return _en_codigo(ClasificacionRespuesta.POCO_DESARROLLADA, repregunta_generica, texto_evaluado,
                          consolidada=consolidada)
    return _en_codigo(ClasificacionRespuesta.ADECUADA, None, texto_evaluado, consolidada=consolidada)


def procesar_entrega(titulo_actividad: str, items: tuple[ItemPorEvaluar, ...], evaluador: EvaluadorRespuestas, *,
                     modelo: str | None = None, version_prompt: str = VERSION_PROMPT_REGISTRO,
                     tiempo_maximo_segundos: float = TIEMPO_MAXIMO_EVALUACION_SEGUNDOS,
                     ) -> dict[str, EvaluacionProcesada]:
    """Evalúa todos los ítems entregados con una sola llamada al evaluador."""
    _validar_parametros(tiempo_maximo_segundos)
    evaluaciones = {}
    con_criterios = tuple(item for item in items if item.criterios)
    for item in items:
        if not item.criterios:
            evaluaciones[item.codigo] = evaluar_por_extension(
                item.texto, item.min_caracteres, item.repregunta_generica, serializar_conversacion(item.texto))
    if not con_criterios:
        return evaluaciones
    contexto = ContextoEntrega(titulo_actividad, tuple(
        ItemEntrega(i.codigo, i.consigna, i.criterios, i.opciones_elegidas, i.texto) for i in con_criterios))
    resultado, error, latencia_ms = _llamar(evaluador.evaluar_entrega, validar_entrega, contexto, tiempo_maximo_segundos)
    por_item = {r.item: r for r in resultado.items} if resultado is not None else {}
    for item in con_criterios:
        texto_evaluado = serializar_conversacion(item.texto)
        if error is not None:
            minimo = MIN_CARACTERES_RESPALDO if item.min_caracteres is None else item.min_caracteres
            corto = len(item.texto.strip()) < minimo
            evaluaciones[item.codigo] = _en_codigo(
                ClasificacionRespuesta.POCO_DESARROLLADA if corto else ClasificacionRespuesta.NO_EVALUADA,
                item.repregunta_generica if corto else None, texto_evaluado,
                faltantes=tuple(c.codigo for c in item.criterios) if corto else (), error=error,
                latencia_ms=latencia_ms, modelo=modelo, version_prompt=version_prompt)
            continue
        r = por_item[item.codigo]
        poco = r.clasificacion == "POCO_DESARROLLADA"
        evaluaciones[item.codigo] = EvaluacionProcesada(
            OrigenEvaluacion.LLM, ClasificacionRespuesta(r.clasificacion), tuple(r.criterios_faltantes),
            pregunta_o_base(r.pregunta, item.criterios, r.criterios_faltantes) if poco else None,
            modelo, version_prompt, latencia_ms, None, texto_evaluado)
    return evaluaciones


def procesar_seguimiento(titulo_actividad: str, item: ItemPorEvaluar, turnos: tuple[TurnoEvaluacion, ...],
                         criterios_faltantes_previos: tuple[str, ...], otras_respuestas: tuple[RespuestaOtroItem, ...],
                         evaluador: EvaluadorRespuestas, *, pregunta_generica: bool, modelo: str | None = None,
                         version_prompt: str = VERSION_PROMPT_REGISTRO,
                         tiempo_maximo_segundos: float = TIEMPO_MAXIMO_EVALUACION_SEGUNDOS) -> EvaluacionProcesada:
    """Reevalúa un ítem tras responder su pregunta y devuelve también la consolidada.

    `item.texto` es el texto inicial y `turnos` incluye la respuesta recién escrita.
    """
    _validar_parametros(tiempo_maximo_segundos)
    texto_evaluado = serializar_conversacion(item.texto, turnos)
    concatenacion = concatenar(item.texto, turnos)
    if not item.criterios:
        return evaluar_por_extension(concatenacion, item.min_caracteres, item.repregunta_generica, texto_evaluado,
                                     consolidada=concatenacion)
    if pregunta_generica:
        return _en_codigo(ClasificacionRespuesta.NO_EVALUADA, None, texto_evaluado, consolidada=concatenacion)
    contexto = ContextoSeguimiento(titulo_actividad, item.consigna, item.criterios, criterios_faltantes_previos,
                                   item.opciones_elegidas, item.texto, turnos, otras_respuestas)
    resultado, error, latencia_ms = _llamar(evaluador.evaluar_seguimiento, validar_seguimiento, contexto,
                                            tiempo_maximo_segundos)
    if error is not None:
        return _en_codigo(ClasificacionRespuesta.NO_EVALUADA, None, texto_evaluado, error=error,
                          latencia_ms=latencia_ms, modelo=modelo, version_prompt=version_prompt,
                          consolidada=concatenacion)
    poco = resultado.clasificacion == "POCO_DESARROLLADA"
    return EvaluacionProcesada(
        OrigenEvaluacion.LLM, ClasificacionRespuesta(resultado.clasificacion), tuple(resultado.criterios_faltantes),
        pregunta_o_base(resultado.pregunta, item.criterios, resultado.criterios_faltantes) if poco else None,
        modelo, version_prompt, latencia_ms, None, texto_evaluado,
        consolidada_o_concatenacion(resultado.consolidada, item.texto, turnos))


# --- Evaluador falso ------------------------------------------------------------------------

class EvaluadorFalso:
    """Determinista, por marcas en el texto más reciente de cada ítem.

    Sin marca: ADECUADA. `[vaga]`: faltan los criterios que faltaban. `[falta:C2]` o `[falta:RAZON]`:
    faltan esos códigos o los criterios de ese tipo. `[falla]`: lanza error (toda la llamada).
    `[pregunta-invalida]`: pregunta con código y sin «?». `[consolidada-invalida]`: consolidada demasiado larga.
    """

    def __init__(self):
        self.contextos: list = []
        self.llamadas_entrega = 0
        self.llamadas_seguimiento = 0
        # Diario (B09): `falla_diario` simula un fallo del LLM al personalizar.
        self.contextos_diario: list = []
        self.llamadas_diario = 0
        self.falla_diario = False
        # Planes (B11): `falla_sugerencias` simula un fallo del LLM al sugerir pasos.
        self.contextos_sugerencias: list = []
        self.llamadas_sugerencias = 0
        self.falla_sugerencias = False

    @staticmethod
    def _clasificar(texto, criterios, previos):
        marcas = re.findall(r"\[falta:([^\]]*)\]", texto)
        if not marcas and "[vaga]" not in texto:
            return "ADECUADA", [], None
        faltantes = list(previos)
        if marcas:
            por_tipo = {}
            for criterio in criterios:
                por_tipo.setdefault(criterio.tipo, []).append(criterio.codigo)
            tokens = [t.strip() for marca in marcas for t in marca.split(',') if t.strip()]
            faltantes = list(dict.fromkeys(c for t in tokens for c in por_tipo.get(t, [t])))
        if "[pregunta-invalida]" in texto:
            return "POCO_DESARROLLADA", faltantes, f"Falta {', '.join(faltantes)}"
        base = next((c.repregunta for c in criterios if c.codigo in faltantes), "¿Podrías contarme más?")
        return "POCO_DESARROLLADA", faltantes, f"Sobre lo que contaste: {base}"

    def evaluar_entrega(self, contexto: ContextoEntrega) -> ResultadoEntrega:
        self.llamadas_entrega += 1
        self.contextos.append(contexto)
        if any("[falla]" in item.texto for item in contexto.items):
            raise RuntimeError("Fallo simulado del evaluador")
        resultados = []
        for item in contexto.items:
            clasificacion, faltantes, pregunta = self._clasificar(
                item.texto, item.criterios, [c.codigo for c in item.criterios])
            resultados.append(ResultadoItemEntrega(item=item.item, clasificacion=clasificacion,
                                                   criterios_faltantes=faltantes, pregunta=pregunta))
        return ResultadoEntrega(items=resultados)

    def evaluar_seguimiento(self, contexto: ContextoSeguimiento) -> ResultadoSeguimiento:
        self.llamadas_seguimiento += 1
        self.contextos.append(contexto)
        texto = contexto.turnos[-1].respuesta or ""
        if "[falla]" in texto:
            raise RuntimeError("Fallo simulado del evaluador")
        clasificacion, faltantes, pregunta = self._clasificar(
            texto, contexto.criterios, contexto.criterios_faltantes_previos)
        consolidada = concatenar(contexto.texto_inicial, contexto.turnos)
        if "[consolidada-invalida]" in texto:
            consolidada = consolidada * 3
        return ResultadoSeguimiento(clasificacion=clasificacion, criterios_faltantes=faltantes,
                                    pregunta=pregunta, consolidada=consolidada)

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
