"""Resolución de referencias por cuenta (HU-009, RNF-20): solo tipos del catálogo y solo datos de la cuenta.

ELECCION: disponible desde la primera entrega del ítem fuente, sea cual sea su clasificación; la elección no se
edita y lo que puede quedar poco desarrollado es la justificación, no la decisión.
TEXTO: según la clasificación de la última evaluación del ítem fuente; la poco desarrollada no se cita.
"""

from sqlalchemy import select

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Cuenta, EvaluacionRespuesta, ItemRegistro, ProgresoActividad, RespuestaRegistro, Rol,
)
from app.models.enums import (
    ClasificacionRespuesta, EstadoReferencia, EstadoRespuestaRegistro, TipoReferencia,
)
from app.schemas.referencias import OpcionReferida, ReferenciaResuelta, ReferenciasConsultadas
from app.services.comun import buscar_por_codigo


CODIGO_OTRA = 'OTRA'


def _leer_fuentes(sesion, cuenta, items_fuente):
    """Respuesta y clasificación vigente de cada ítem fuente, solo de esta cuenta: dos lecturas en total."""
    if not items_fuente:
        return {}, {}
    respuestas = {r.item_registro_id: r for r in sesion.scalars(select(RespuestaRegistro).join(
        ProgresoActividad, ProgresoActividad.id == RespuestaRegistro.progreso_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, RespuestaRegistro.item_registro_id.in_(items_fuente)))}
    vigentes = {}
    if respuestas:
        for respuesta_id, clasificacion in sesion.execute(select(
                EvaluacionRespuesta.respuesta_id, EvaluacionRespuesta.clasificacion).where(
                EvaluacionRespuesta.respuesta_id.in_([r.id for r in respuestas.values()])).order_by(
                EvaluacionRespuesta.numero)):
            vigentes[respuesta_id] = clasificacion
    return respuestas, vigentes


def _opciones(sesion, item, elegidas):
    textos = {o.codigo: o.texto for o in contexto(sesion).definiciones.opciones_por_lista.get(item.lista_id, ())}
    return [OpcionReferida(codigo=e['codigo'],
                           texto=e.get('texto', '') if e['codigo'] == CODIGO_OTRA else textos.get(e['codigo'], e['codigo']))
            for e in elegidas or ()]


def resolver(sesion, cuenta, referencias):
    """{código: ReferenciaResuelta} para `referencias` (filas del catálogo), con datos de `cuenta`."""
    definiciones = contexto(sesion).definiciones
    respuestas, vigentes = _leer_fuentes(sesion, cuenta, {r.item_registro_id for r in referencias})
    resueltas = {}
    for referencia in referencias:
        base = dict(codigo=referencia.codigo, tipo=referencia.tipo)
        respuesta = respuestas.get(referencia.item_registro_id)
        if respuesta is None or respuesta.estado == EstadoRespuestaRegistro.BORRADOR:
            resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
        elif referencia.tipo == TipoReferencia.ELECCION:
            if respuesta.clasificacion_inicial is None:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
            else:
                item = definiciones.obtener(ItemRegistro, referencia.item_registro_id)
                resueltas[referencia.codigo] = ReferenciaResuelta(
                    **base, estado=EstadoReferencia.DISPONIBLE,
                    opciones=_opciones(sesion, item, respuesta.opciones_elegidas))
        else:
            clasificacion = vigentes.get(respuesta.id)
            if clasificacion is None:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
            elif clasificacion == ClasificacionRespuesta.POCO_DESARROLLADA:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.POR_DESARROLLAR)
            else:
                resueltas[referencia.codigo] = ReferenciaResuelta(
                    **base, estado=EstadoReferencia.DISPONIBLE, texto=respuesta.texto_consolidado)
    return resueltas


def validar_cuenta_y_actividad(sesion, codigo_cuenta, codigo_actividad):
    actividad = buscar_por_codigo(sesion, Actividad, codigo_actividad)
    bloque = contexto(sesion).definiciones.obtener(Bloque, actividad.bloque_id)
    if bloque.audiencia.value != Rol.ESTUDIANTE.value:
        raise ErrorAccion("Actividad de estudiante no encontrada", estado_http=404)
    cuenta = buscar_por_codigo(sesion, Cuenta, codigo_cuenta)
    if cuenta.rol != Rol.ESTUDIANTE:
        raise ErrorAccion("Referencias no encontradas para esta cuenta", estado_http=404)
    return cuenta, actividad


@usar_contexto
def consultar_referencias(sesion, codigo_cuenta, codigo_actividad):
    cuenta, actividad = validar_cuenta_y_actividad(sesion, codigo_cuenta, codigo_actividad)
    referencias = contexto(sesion).definiciones.referencias_por_actividad.get(actividad.id, ())
    resueltas = resolver(sesion, cuenta, referencias)
    return ReferenciasConsultadas(referencias=[resueltas[r.codigo] for r in referencias])
