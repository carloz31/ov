"""Flujo ítem por ítem del registro con el LLM v7 (ajuste registros llm, lote 3).

Responder (también editar), responder el seguimiento, reenviar lo no evaluado y terminar. La respuesta se guarda y se
confirma **antes** de llamar al LLM (puede tardar hasta `TIEMPO_MAXIMO_LLM_SEGUNDOS`); la evaluación se escribe en una
segunda transacción sobre el mismo intento, por su id. Si el proceso muere entre las dos, el intento queda SIN_EVALUAR
y se puede reenviar. El estudiante recibe el paso siguiente, nunca el tipo, el `motivo` ni la marca `sensible`.

La `Entrada` del LLM se arma siempre desde `valores_contexto` (lo que vio el estudiante al responder), también al
reenviar: no se recalcula el contexto.
"""

import logging
from dataclasses import dataclass

from sqlalchemy import func, select, update

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_CARACTERES_TEXTO_LLM, MAXIMO_INTENTOS_ITEM_REGISTRO
from app.exceptions import ErrorAccion
from app.models import EstadoProgreso, RespuestaRegistro, TextoFijo, TipoEventoUso
from app.models.enums import EstadoRespuestaRegistro
from app.schemas.registro import PasoRegistro
from app.services.actividades import completar_progreso
from app.services.comun import fecha_accion, responder_con_eventos
from app.services.registro.acciones import (
    crear_progreso, guardar_intento, leer_registro, marca_actualizacion, registro_adecuado_emitido,
    validar_registro,
)
from app.services.registro.consultas import registro_cuenta
from app.services.registro.contexto import MarcadorSinValor, entrada_guardada, resolver_contexto, valores_guardados
from app.services.registro.eleccion import invalida, validar_eleccion
from app.services.registro.llm import (
    VERSION_PROMPT_LLM, EntradaInvalida, Evaluacion, estado_final, evaluar_primera, evaluar_seguimiento,
)

registro_log = logging.getLogger(__name__)

SIGUIENTE, REPREGUNTA, MENSAJE = 'SIGUIENTE', 'REPREGUNTA', 'MENSAJE'
INADECUADOS = ('vacio', 'fuera_de_tema')


# --- Regla de adecuado (§6) ------------------------------------------------------------------

def item_adecuado(respuesta) -> tuple[bool, bool]:
    """(cuenta, es abierto) de un intento vigente. Sin LLM cuenta si está COMPLETADO; `sensible` cuenta y nunca es
    abierto, sea cual sea su tipo; con el seguimiento sin evaluar, cuenta el tipo que conserva."""
    if respuesta is None or respuesta.estado == EstadoRespuestaRegistro.SIN_EVALUAR:
        return False, False
    if respuesta.estado == EstadoRespuestaRegistro.COMPLETADO or respuesta.sensible:
        return True, False
    if respuesta.tipo_final in INADECUADOS:
        return False, False
    return True, respuesta.tipo_final == 'no_sabe'


def registro_adecuado(items, vigentes, requerida=True, completada=False) -> bool:
    """Sobre los intentos vigentes de los ítems obligatorios: ninguno `vacio`, `fuera_de_tema` ni SIN_EVALUAR y como
    máximo un abierto. En un registro opcional, adecuado equivale a completado."""
    if not requerida:
        return completada
    abiertos = 0
    for item in items:
        if not item.obligatorio:
            continue
        cuenta, abierto = item_adecuado(vigentes.get(item.id))
        if not cuenta:
            return False
        abiertos += abierto
    return abiertos <= 1


def eventos_adecuado(sesion, cuenta, actividad, items):
    """REGISTRO_ADECUADO la primera vez que la regla se cumple con la actividad completada; nunca se revoca."""
    registro = leer_registro(sesion, cuenta, actividad)
    completada = registro.progreso is not None and registro.progreso.estado == EstadoProgreso.COMPLETADA
    if not completada or registro_adecuado_emitido(sesion, cuenta, actividad):
        return []
    if not registro_adecuado(items, registro.vigentes, actividad.requerida, completada):
        return []
    return [(TipoEventoUso.REGISTRO_ADECUADO, actividad.id)]


# --- Lo que va de una transacción a otra -------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Pendiente:
    """Un intento guardado que falta evaluar. `primera`: la evaluación ya guardada de la primera (en el
    seguimiento); `entrada`: la del LLM, armada desde `valores_contexto`."""
    respuesta_id: int
    texto_primera: str
    entrada: object = None
    primera: Evaluacion | None = None


def _texto(texto, vacio_permitido=False):
    if not vacio_permitido and not (texto or '').strip():
        raise invalida('La respuesta no puede estar vacía')
    if len(texto or '') > MAXIMO_CARACTERES_TEXTO_LLM:
        raise invalida(f'La respuesta puede tener como máximo {MAXIMO_CARACTERES_TEXTO_LLM} caracteres')
    return texto or ''


def _item(items, codigo):
    item = next((i for i in items if i.codigo == codigo), None)
    if item is None:
        raise ErrorAccion('El ítem no pertenece a esta actividad', estado_http=404)
    return item


def _texto_fijo(sesion, codigo):
    return contexto(sesion).definiciones.por_codigo(TextoFijo, codigo).texto


def _primera_guardada(respuesta) -> Evaluacion:
    """La evaluación de la primera tal como quedó guardada (para `estado_final` en el seguimiento)."""
    return Evaluacion(sin_evaluar=False, motivo=respuesta.primera_motivo, tipo=respuesta.primera_tipo,
                      sensible=False, repregunta=respuesta.repregunta)


def _entrada(item, respuesta, **seguimiento):
    try:
        return entrada_guardada(item, respuesta.opciones_elegidas, respuesta.valores_contexto,
                                respuesta.primera_respuesta if not seguimiento else respuesta.segunda_respuesta,
                                **seguimiento)
    except EntradaInvalida as error:
        raise invalida(str(error)) from error


def _estado(final):
    if final.sin_evaluar:
        return EstadoRespuestaRegistro.SIN_EVALUAR
    return EstadoRespuestaRegistro.ABIERTO if final.abierto and not final.sensible else EstadoRespuestaRegistro.CERRADO


def _columnas_finales(final):
    return dict(tipo_final=final.tipo, estado=_estado(final), sensible=final.sensible, pista=final.pista,
                texto_citable=list(final.texto_citable), seguimiento_sin_evaluar=final.seguimiento_sin_evaluar)


def _paso(sesion, evaluacion: Evaluacion, con_repregunta: bool):
    """El paso siguiente según la evaluación: `sensible` manda sobre `emocional`."""
    if evaluacion.sin_evaluar:
        return dict(paso=MENSAJE, mensaje=_texto_fijo(sesion, 'LUMI_SIN_EVALUAR'))
    if evaluacion.sensible:
        return dict(paso=MENSAJE, mensaje=_texto_fijo(sesion, 'LUMI_SENSIBLE'))
    if evaluacion.tipo == 'emocional':
        return dict(paso=MENSAJE, mensaje=_texto_fijo(sesion, 'LUMI_EMOCIONAL'))
    if con_repregunta and evaluacion.repregunta:
        return dict(paso=REPREGUNTA, repregunta=evaluacion.repregunta)
    return dict(paso=SIGUIENTE)


def _registrar_fallo(item, evaluacion, etapa):
    if evaluacion.sin_evaluar:
        # Solo el ítem, la etapa y la causa: nunca el texto del estudiante.
        registro_log.warning('Registro sin evaluar: ítem %s, %s, causa %s', item.codigo, etapa, evaluacion.causa_fallo)


def _actualizar(sesion, respuesta_id, valores):
    sesion.execute(update(RespuestaRegistro.__table__).where(RespuestaRegistro.id == respuesta_id).values(
        actualizada_en=marca_actualizacion(), **valores))


@usar_contexto
def _escribir(sesion, entrada, item_codigo, valores, paso):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta)
    if valores is not None:
        _actualizar(sesion, *valores)
    eventos = eventos_adecuado(sesion, cuenta, actividad, items)
    campos = responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada)).campos()
    return PasoRegistro(item=item_codigo, **paso(sesion), registro=registro_cuenta(sesion, cuenta, actividad, items),
                        **campos)


def _cerrar(fabrica, entrada, item_codigo, valores, paso):
    """Segunda transacción: escribe la evaluación en el intento (por su id), aplica §6 si la actividad ya está
    completada y devuelve el paso con el registro actualizado."""
    with fabrica.begin() as sesion:
        return _escribir(sesion, entrada, item_codigo, valores, paso)


def _evaluar_primera(fabrica, entrada, item, pendiente, cliente):
    evaluacion = evaluar_primera(pendiente.entrada, cliente)
    _registrar_fallo(item, evaluacion, 'primera')
    final = estado_final(evaluacion, pendiente.texto_primera)
    valores = dict(primera_tipo=evaluacion.tipo, primera_motivo=evaluacion.motivo, repregunta=evaluacion.repregunta,
                   version_prompt=VERSION_PROMPT_LLM, **_columnas_finales(final))
    return _cerrar(fabrica, entrada, item.codigo, (pendiente.respuesta_id, valores),
                   lambda sesion: _paso(sesion, evaluacion, con_repregunta=True))


def _evaluar_seguimiento(fabrica, entrada, item, pendiente, cliente):
    evaluacion = evaluar_seguimiento(pendiente.entrada, cliente)
    _registrar_fallo(item, evaluacion, 'seguimiento')
    final = estado_final(pendiente.primera, pendiente.texto_primera, evaluacion)
    valores = dict(conjunto_tipo=evaluacion.tipo, conjunto_motivo=evaluacion.motivo, arranque=evaluacion.arranque,
                   linea_registro=final.linea_registro, **_columnas_finales(final))
    return _cerrar(fabrica, entrada, item.codigo, (pendiente.respuesta_id, valores),
                   lambda sesion: _paso(sesion, evaluacion, con_repregunta=False))


# --- Responder un ítem (§2) --------------------------------------------------------------------

@usar_contexto
def _guardar_respuesta(sesion, entrada):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    item = _item(items, entrada.item)
    try:
        contexto_item = resolver_contexto(sesion, cuenta, item.codigo)
    except MarcadorSinValor as error:
        raise ErrorAccion(f'Este ítem todavía no se puede responder: falta {{{error.marcador}}}') from error
    elegidas = validar_eleccion(item, contexto_item.opciones, entrada.opciones, exigir_minimo=True)
    marcada = contexto_item.opcion(elegidas[0]['codigo']) if elegidas else None
    sin_llm = contexto_item.sin_llm or (marcada is not None and marcada.sin_llm)
    # Solo una opción marcada `sin_llm` admite el texto vacío; un ítem sin tarjeta, no.
    texto = _texto(entrada.texto, vacio_permitido=marcada is not None and marcada.sin_llm)
    registro = leer_registro(sesion, cuenta, actividad)
    progreso = registro.progreso or crear_progreso(sesion, cuenta, actividad)
    intentos = sesion.scalar(select(func.count()).select_from(RespuestaRegistro).where(
        RespuestaRegistro.progreso_id == progreso.id, RespuestaRegistro.item_registro_id == item.id))
    if intentos >= MAXIMO_INTENTOS_ITEM_REGISTRO:
        raise ErrorAccion(f'Este ítem ya tiene {MAXIMO_INTENTOS_ITEM_REGISTRO} intentos: no se puede editar más')
    valores = valores_guardados(contexto_item, elegidas)
    estado = EstadoRespuestaRegistro.COMPLETADO if sin_llm else EstadoRespuestaRegistro.SIN_EVALUAR
    respuesta_id = guardar_intento(sesion, progreso.id, item.id, dict(
        opciones_elegidas=elegidas, valores_contexto=valores, primera_respuesta=texto, estado=estado),
        fecha_accion(entrada))
    if sin_llm:
        return item, None
    respuesta = sesion.get(RespuestaRegistro, respuesta_id)
    return item, Pendiente(respuesta_id, texto, entrada=_entrada(item, respuesta))


def responder(fabrica, entrada, cliente) -> PasoRegistro:
    """Guarda la elección y el texto del ítem (un intento nuevo: si ya había uno, es una edición), lo evalúa y
    devuelve el paso siguiente."""
    with fabrica.begin() as sesion:
        item, pendiente = _guardar_respuesta(sesion, entrada)
    if pendiente is None:
        return _cerrar(fabrica, entrada, item.codigo, None, lambda _: dict(paso=SIGUIENTE))
    return _evaluar_primera(fabrica, entrada, item, pendiente, cliente)


# --- Responder el seguimiento (§3) -----------------------------------------------------------

def _vigente(sesion, entrada, disponible=True):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=disponible)
    item = _item(items, entrada.item)
    respuesta = leer_registro(sesion, cuenta, actividad).vigentes.get(item.id)
    return item, respuesta


@usar_contexto
def _guardar_seguimiento(sesion, entrada):
    item, respuesta = _vigente(sesion, entrada)
    if (respuesta is None or respuesta.repregunta is None or respuesta.segunda_respuesta is not None
            or respuesta.estado == EstadoRespuestaRegistro.SIN_EVALUAR):
        raise ErrorAccion('Este ítem no tiene una repregunta pendiente')
    texto = _texto(entrada.texto)
    _actualizar(sesion, respuesta.id, dict(segunda_respuesta=texto))
    respuesta.segunda_respuesta = texto
    return item, _pendiente_seguimiento(item, respuesta)


def _pendiente_seguimiento(item, respuesta):
    return Pendiente(respuesta.id, respuesta.primera_respuesta, primera=_primera_guardada(respuesta),
                     entrada=_entrada(item, respuesta, anterior=respuesta.primera_respuesta,
                                      repregunta=respuesta.repregunta))


def responder_seguimiento(fabrica, entrada, cliente) -> PasoRegistro:
    with fabrica.begin() as sesion:
        item, pendiente = _guardar_seguimiento(sesion, entrada)
    return _evaluar_seguimiento(fabrica, entrada, item, pendiente, cliente)


# --- Reenviar (§4) ---------------------------------------------------------------------------

@usar_contexto
def _leer_reenvio(sesion, entrada):
    item, respuesta = _vigente(sesion, entrada)
    if respuesta is not None and respuesta.estado == EstadoRespuestaRegistro.SIN_EVALUAR:
        return item, 'primera', Pendiente(respuesta.id, respuesta.primera_respuesta, entrada=_entrada(item, respuesta))
    if respuesta is not None and respuesta.seguimiento_sin_evaluar:
        return item, 'seguimiento', _pendiente_seguimiento(item, respuesta)
    raise ErrorAccion('Este ítem no tiene nada que reenviar')


def reenviar(fabrica, entrada, cliente) -> PasoRegistro:
    """Vuelve a evaluar el intento vigente, sin crear uno nuevo, con lo guardado en `valores_contexto`."""
    with fabrica.begin() as sesion:
        item, etapa, pendiente = _leer_reenvio(sesion, entrada)
    if etapa == 'primera':
        return _evaluar_primera(fabrica, entrada, item, pendiente, cliente)
    return _evaluar_seguimiento(fabrica, entrada, item, pendiente, cliente)


# --- Terminar (§5) ---------------------------------------------------------------------------

@usar_contexto
def terminar(sesion, entrada):
    """Completa la actividad cuando todos los obligatorios tienen intento vigente y aplica §6. Un registro no adecuado
    igual se completa. Si ya estaba completada, devuelve el registro tal como está y vuelve a aplicar §6."""
    from app.schemas.registro import RespuestaRegistroAccion
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    registro = leer_registro(sesion, cuenta, actividad)
    eventos = []
    if registro.progreso is None or registro.progreso.estado != EstadoProgreso.COMPLETADA:
        faltantes = [item.codigo for item in items if item.obligatorio and item.id not in registro.vigentes]
        if faltantes:
            raise ErrorAccion('Faltan ítems por responder antes de terminar', items_faltantes=faltantes)
        _, eventos = completar_progreso(sesion, cuenta, actividad)
    eventos = [*eventos, *eventos_adecuado(sesion, cuenta, actividad, items)]
    respuesta = responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada))
    return RespuestaRegistroAccion(**registro_cuenta(sesion, cuenta, actividad, items).model_dump(),
                                   **respuesta.campos())

