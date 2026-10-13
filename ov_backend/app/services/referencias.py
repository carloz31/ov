"""Resolución de referencias por cuenta (HU-009, RNF-20): solo tipos del catálogo y solo datos de la cuenta.

ELECCION: disponible desde la primera entrega del ítem fuente, sea cual sea su clasificación; la elección no se
edita y lo que puede quedar poco desarrollado es la justificación, no la decisión.
TEXTO: según la clasificación de la última evaluación del ítem fuente; la poco desarrollada no se cita.
RESULTADO y COINCIDENCIAS: el resultado vigente (revelado) de la aplicación fuente; con perfil plano, sin opciones.
RESPUESTA_CUESTIONARIO: la etiqueta elegida en un ítem de la aplicación fuente, cuando su actividad está completada.
"""

from sqlalchemy import select

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import LONGITUD_CODIGO_INTERES
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, ActividadItem, AplicacionActividad, Bloque, Cuenta, EstadoProgreso, EvaluacionRespuesta, ItemRegistro,
    OpcionEscala, ProgresoActividad, RespuestaItem, RespuestaRegistro, ResultadoInstrumento, Rol,
)
from app.models.enums import (
    ClasificacionRespuesta, EstadoReferencia, EstadoRespuestaRegistro, TipoReferencia,
)
from app.schemas.referencias import OpcionReferida, ReferenciaResuelta, ReferenciasConsultadas
from app.services.comun import buscar_por_codigo
from app.services.instrumentos.consultas import cargar_representaciones, representar_resultado


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


def _leer_resultados(sesion, cuenta, aplicaciones):
    """Resultado vigente de cada aplicación fuente, solo de esta cuenta, ya representado."""
    if not aplicaciones:
        return {}
    resultados = list(sesion.scalars(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None))))
    cargar_representaciones(sesion, resultados)
    return {r.aplicacion_id: representar_resultado(sesion, r) for r in resultados}


def _leer_respuestas_cuestionario(sesion, cuenta, referencias):
    """Etiqueta elegida por (aplicación, ítem), solo en actividades COMPLETADA de esta cuenta: una lectura."""
    if not referencias:
        return {}
    filas = sesion.execute(select(AplicacionActividad.aplicacion_id, RespuestaItem.item_id, OpcionEscala.etiqueta).select_from(
        AplicacionActividad).join(
        ProgresoActividad, (ProgresoActividad.actividad_id == AplicacionActividad.actividad_id)
        & (ProgresoActividad.cuenta_id == cuenta.id) & (ProgresoActividad.estado == EstadoProgreso.COMPLETADA)).join(
        RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id).join(
        ActividadItem, (ActividadItem.actividad_id == ProgresoActividad.actividad_id)
        & (ActividadItem.item_id == RespuestaItem.item_id)).join(
        OpcionEscala, OpcionEscala.id == RespuestaItem.opcion_id).where(
        AplicacionActividad.aplicacion_id.in_({r.aplicacion_id for r in referencias}),
        RespuestaItem.item_id.in_({r.item_instrumento_id for r in referencias})))
    return {(aplicacion_id, item_id): etiqueta for aplicacion_id, item_id, etiqueta in filas}


def _opciones_de_resultado(tipo, resultado):
    if resultado.perfil_plano:
        return []
    if tipo == TipoReferencia.COINCIDENCIAS:
        return [OpcionReferida(codigo=c.codigo or c.codigo_onet, texto=c.titulo) for c in resultado.coincidencias or ()]
    if resultado.dimensiones_destacadas is not None:
        dimensiones = resultado.dimensiones_destacadas
    else:
        # Código de interés: las de mayor puntaje, con el orden del instrumento como desempate.
        dimensiones = [d for _, d in sorted(enumerate(resultado.dimensiones),
                                            key=lambda par: (-par[1].puntaje, par[0]))][:LONGITUD_CODIGO_INTERES]
    return [OpcionReferida(codigo=d.codigo, texto=d.nombre) for d in dimensiones]


def resolver(sesion, cuenta, referencias):
    """{código: ReferenciaResuelta} para `referencias` (filas del catálogo), con datos de `cuenta`."""
    definiciones = contexto(sesion).definiciones
    de_registro = [r for r in referencias if r.aplicacion_id is None]
    respuestas, vigentes = _leer_fuentes(sesion, cuenta, {r.item_registro_id for r in de_registro})
    de_cuestionario = [r for r in referencias if r.tipo == TipoReferencia.RESPUESTA_CUESTIONARIO]
    respuestas_cuestionario = _leer_respuestas_cuestionario(sesion, cuenta, de_cuestionario)
    resultados = _leer_resultados(sesion, cuenta, {r.aplicacion_id for r in referencias
                                                   if r.aplicacion_id is not None and r not in de_cuestionario})
    resueltas = {}
    for referencia in referencias:
        base = dict(codigo=referencia.codigo, tipo=referencia.tipo)
        if referencia.tipo == TipoReferencia.RESPUESTA_CUESTIONARIO:
            etiqueta = respuestas_cuestionario.get((referencia.aplicacion_id, referencia.item_instrumento_id))
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if etiqueta is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, texto=etiqueta))
            continue
        if referencia.aplicacion_id is not None:
            resultado = resultados.get(referencia.aplicacion_id)
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if resultado is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE,
                                   opciones=_opciones_de_resultado(referencia.tipo, resultado)))
            continue
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
