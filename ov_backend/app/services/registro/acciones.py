"""Registro con entrega y seguimiento (B03); lectura y escritura separadas de la evaluación."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import insert, select, update

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_SEGUIMIENTOS_POR_REGISTRO
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Cuenta, EstadoProgreso, EvaluacionRespuesta, ProgresoActividad,
    RespuestaRegistro, Rol, TipoEventoUso, TipoObjetivo, TurnoSeguimiento,
)
from app.models.enums import ClasificacionRespuesta, EstadoRespuestaRegistro, OrigenEvaluacion
from app.schemas.registro import (
    EstadoItemRegistro, MensajePreguntaRegistro, MensajeRespuestaRegistro, OpcionElegida, RespuestaRegistroAccion,
    RespuestaRegistroPublica,
)
from app.services.actividades import completar_progreso
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, fecha_accion, responder_con_eventos,
)
from app.services.registro.eleccion import CODIGO_OTRA, invalida, validar_eleccion
from app.services.registro.evaluacion import (
    CriterioEvaluacion, ItemPorEvaluar, RespuestaOtroItem, TurnoEvaluacion, procesar_entrega, procesar_seguimiento,
)


def validar_registro(sesion, codigo_actividad, codigo_cuenta=None, disponible=False):
    actividad = buscar_por_codigo(sesion, Actividad, codigo_actividad)
    definiciones = contexto(sesion).definiciones
    bloque = definiciones.obtener(Bloque, actividad.bloque_id)
    if bloque.audiencia.value != Rol.ESTUDIANTE.value:
        raise ErrorAccion("Actividad de estudiante no encontrada", estado_http=404)
    cuenta = None
    if codigo_cuenta is not None:
        cuenta = buscar_por_codigo(sesion, Cuenta, codigo_cuenta)
        if cuenta.rol != Rol.ESTUDIANTE:
            raise ErrorAccion("Registro no encontrado para esta cuenta", estado_http=404)
        if disponible:
            exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    return cuenta, actividad, definiciones.items_registro_por_actividad.get(actividad.id, ())


def validar_item(items, codigo):
    item = next((item for item in items if item.codigo == codigo), None)
    if item is None:
        raise ErrorAccion("El ítem no pertenece a esta actividad")
    return item


def opciones_de(sesion, item):
    return contexto(sesion).definiciones.opciones_por_lista.get(item.lista_id, ())


def criterios_de(sesion, item):
    return tuple(CriterioEvaluacion(c.codigo, c.tipo.value, c.descripcion, c.repregunta)
                 for c in contexto(sesion).definiciones.criterios_por_item_registro.get(item.id, ()))


def textos_elegidos(sesion, item, elegidas):
    """Textos de las opciones elegidas, para el evaluador (RNF-13)."""
    textos = {opcion.codigo: opcion.texto for opcion in opciones_de(sesion, item)}
    return tuple(e.get('texto', '') if e['codigo'] == CODIGO_OTRA else textos.get(e['codigo'], e['codigo'])
                 for e in elegidas or ())


@dataclass(frozen=True, slots=True)
class TurnoLeido:
    id: int
    orden: int
    pregunta: str
    criterios_objetivo: tuple[str, ...]
    respuesta: str | None
    respondido_en: datetime | None


@dataclass(frozen=True, slots=True)
class EvaluacionLeida:
    numero: int
    origen: OrigenEvaluacion
    clasificacion: ClasificacionRespuesta
    criterios_faltantes: tuple[str, ...]
    pregunta: str | None


@dataclass(frozen=True, slots=True)
class RegistroLeido:
    progreso: ProgresoActividad | None
    respuestas: dict[int, RespuestaRegistro]
    turnos: dict[int, tuple[TurnoLeido, ...]]
    evaluaciones: dict[int, tuple[EvaluacionLeida, ...]]

    @property
    def entregado(self):
        return any(r.clasificacion_inicial is not None for r in self.respuestas.values())

    @property
    def total_turnos(self):
        return sum(len(turnos) for turnos in self.turnos.values())

    def ultima_evaluacion(self, respuesta):
        evaluaciones = self.evaluaciones.get(respuesta.id, ())
        return evaluaciones[-1] if evaluaciones else None

    def clasificacion_vigente(self, respuesta):
        ultima = self.ultima_evaluacion(respuesta)
        return ultima.clasificacion if ultima is not None else None


def leer_registro(sesion, cuenta, actividad):
    # Una lectura para progreso, respuestas y turnos, y otra para las evaluaciones. Relee las filas
    # aunque ya estén en la sesión: las acciones escriben con sentencias, no con el ORM.
    filas = sesion.execute(select(ProgresoActividad, RespuestaRegistro, TurnoSeguimiento).outerjoin(
        RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).outerjoin(
        TurnoSeguimiento, TurnoSeguimiento.respuesta_id == RespuestaRegistro.id).where(
        ProgresoActividad.cuenta_id == cuenta.id, ProgresoActividad.actividad_id == actividad.id,
    ).order_by(TurnoSeguimiento.orden).execution_options(populate_existing=True)).all()
    respuestas, turnos = {}, {}
    for _, respuesta, turno in filas:
        if respuesta is None:
            continue
        respuestas[respuesta.item_registro_id] = respuesta
        if turno is not None:
            turnos.setdefault(respuesta.id, {})[turno.id] = TurnoLeido(
                turno.id, turno.orden, turno.pregunta, tuple(turno.criterios_objetivo), turno.respuesta,
                turno.respondido_en)
    evaluaciones = {}
    if respuestas:
        for fila in sesion.execute(select(
                EvaluacionRespuesta.respuesta_id, EvaluacionRespuesta.numero, EvaluacionRespuesta.origen,
                EvaluacionRespuesta.clasificacion, EvaluacionRespuesta.criterios_faltantes,
                EvaluacionRespuesta.pregunta_generada).where(EvaluacionRespuesta.respuesta_id.in_(
                    [r.id for r in respuestas.values()])).order_by(EvaluacionRespuesta.numero)):
            evaluaciones.setdefault(fila.respuesta_id, []).append(EvaluacionLeida(
                fila.numero, fila.origen, fila.clasificacion, tuple(fila.criterios_faltantes), fila.pregunta_generada))
    return RegistroLeido(filas[0][0] if filas else None, respuestas,
                         {identificador: tuple(t.values()) for identificador, t in turnos.items()},
                         {identificador: tuple(e) for identificador, e in evaluaciones.items()})


def conversacion_publica(texto_inicial, turnos):
    mensajes = [MensajeRespuestaRegistro(tipo='respuesta', texto=texto_inicial)]
    for turno in turnos:
        mensajes.append(MensajePreguntaRegistro(tipo='pregunta', orden=turno.orden, texto=turno.pregunta))
        if turno.respuesta is not None:
            mensajes.append(MensajeRespuestaRegistro(tipo='respuesta', orden=turno.orden, texto=turno.respuesta,
                                                     borrador=turno.respondido_en is None))
    return mensajes


def registro_publico(registro, items):
    progreso, respuestas = registro.progreso, registro.respuestas
    return dict(posicion=progreso.posicion if progreso is not None else None,
                estado=progreso.estado if progreso is not None else None,
                respuestas=[RespuestaRegistroPublica(item=item.codigo, estado=respuestas[item.id].estado,
                    opciones_elegidas=respuestas[item.id].opciones_elegidas,
                    conversacion=conversacion_publica(respuestas[item.id].texto_inicial,
                                                      registro.turnos.get(respuestas[item.id].id, ())))
                    for item in items if item.id in respuestas])


def crear_progreso(sesion, cuenta, actividad):
    progreso = ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id, estado=EstadoProgreso.EN_CURSO)
    sesion.add(progreso)
    sesion.flush()
    return progreso


def marca_actualizacion(anterior=None):
    """Avanza aunque la fecha simulada o el reloj retrocedan."""
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    return max(ahora, anterior + timedelta(microseconds=1)) if anterior is not None else ahora


def comprobar_cambio(sesion, respuesta, valores):
    resultado = sesion.execute(update(RespuestaRegistro.__table__).where(
        RespuestaRegistro.id == respuesta.id, RespuestaRegistro.estado == respuesta.estado,
        RespuestaRegistro.actualizada_en == respuesta.actualizada_en).values(**valores))
    if resultado.rowcount != 1:
        raise ErrorAccion("La respuesta cambió durante el envío; vuelve a intentarlo")


def turno_pendiente(turnos):
    if not turnos or turnos[-1].respondido_en is not None:
        raise ErrorAccion("No hay una pregunta de seguimiento pendiente")
    return turnos[-1]


def version(registro):
    return {item_id: (r.id, r.estado, r.actualizada_en) for item_id, r in registro.respuestas.items()}


def exigir_sin_cambios(registro, anterior):
    if version(registro) != anterior:
        raise ErrorAccion("El registro cambió durante la evaluación; vuelve a intentarlo")


def exigir_abierto(registro):
    if registro.progreso is not None and registro.progreso.estado == EstadoProgreso.COMPLETADA:
        raise ErrorAccion("El registro ya está cerrado")


@usar_contexto
def guardar_borrador(sesion, entrada):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    item = validar_item(items, entrada.item)
    registro = leer_registro(sesion, cuenta, actividad)
    respuesta = registro.respuestas.get(item.id)
    if respuesta is not None and respuesta.estado == EstadoRespuestaRegistro.FINAL:
        raise ErrorAccion("La respuesta ya fue entregada")
    pendiente = respuesta is not None and respuesta.estado == EstadoRespuestaRegistro.PENDIENTE_SEGUIMIENTO
    if not pendiente and registro.entregado:
        raise ErrorAccion("El registro ya fue entregado")
    if pendiente and entrada.opciones:
        raise invalida("La elección se guarda con la respuesta inicial, no con el seguimiento")
    elegidas = None if pendiente else validar_eleccion(item, opciones_de(sesion, item), entrada.opciones, False)
    marca = marca_actualizacion(respuesta.actualizada_en if respuesta is not None else None)
    progreso = registro.progreso or crear_progreso(sesion, cuenta, actividad)
    if entrada.posicion is not None:
        sesion.execute(update(ProgresoActividad.__table__).where(ProgresoActividad.id == progreso.id)
                       .values(posicion=entrada.posicion))
    if respuesta is None:
        sesion.execute(insert(RespuestaRegistro.__table__), dict(progreso_id=progreso.id, item_registro_id=item.id,
            texto_inicial=entrada.texto, opciones_elegidas=elegidas, estado=EstadoRespuestaRegistro.BORRADOR,
            creada_en=fecha_accion(entrada), actualizada_en=marca, ampliada=False))
        estado = EstadoRespuestaRegistro.BORRADOR
    else:
        estado = respuesta.estado
        valores = dict(actualizada_en=marca)
        if estado == EstadoRespuestaRegistro.BORRADOR:
            valores.update(texto_inicial=entrada.texto, opciones_elegidas=elegidas)
        comprobar_cambio(sesion, respuesta, valores)
        if pendiente:
            turno = turno_pendiente(registro.turnos.get(respuesta.id, ()))
            sesion.execute(update(TurnoSeguimiento.__table__).where(TurnoSeguimiento.id == turno.id)
                           .values(respuesta=entrada.texto))
    return EstadoItemRegistro(item=item.codigo, estado=estado)


# --- Entregar -------------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class LecturaEntrega:
    titulo: str
    items: tuple[ItemPorEvaluar, ...]
    elecciones: dict[str, list[dict]]
    version: dict


@usar_contexto
def preparar_entrega(sesion, entrada):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    registro = leer_registro(sesion, cuenta, actividad)
    exigir_abierto(registro)
    if registro.entregado:
        raise ErrorAccion("El registro ya fue entregado")
    con_texto = {item.id: registro.respuestas[item.id] for item in items
                 if item.id in registro.respuestas and registro.respuestas[item.id].texto_inicial.strip()}
    faltantes = [item.codigo for item in items if item.obligatorio and item.id not in con_texto]
    if faltantes:
        raise ErrorAccion("Faltan ítems por responder antes de entregar", items_faltantes=faltantes)
    por_evaluar, elecciones = [], {}
    for item in items:
        if item.id not in con_texto:
            continue
        respuesta = con_texto[item.id]
        elegidas = validar_eleccion(item, opciones_de(sesion, item),
                                    [OpcionElegida(**e) for e in respuesta.opciones_elegidas or ()], True)
        elecciones[item.codigo] = elegidas
        por_evaluar.append(ItemPorEvaluar(item.codigo, item.consigna, criterios_de(sesion, item),
            textos_elegidos(sesion, item, elegidas), respuesta.texto_inicial, item.min_caracteres,
            item.repregunta_generica))
    return LecturaEntrega(actividad.titulo, tuple(por_evaluar), elecciones, version(registro))


def insertar_evaluacion(sesion, respuesta_id, numero, evaluacion, fecha):
    sesion.execute(insert(EvaluacionRespuesta.__table__), dict(respuesta_id=respuesta_id, numero=numero,
        origen=evaluacion.origen, clasificacion=evaluacion.clasificacion,
        criterios_faltantes=list(evaluacion.criterios_faltantes), pregunta_generada=evaluacion.pregunta,
        requiere_atencion=False, modelo=evaluacion.modelo, version_prompt=evaluacion.version_prompt,
        latencia_ms=evaluacion.latencia_ms, error=evaluacion.error, texto_evaluado=evaluacion.texto_evaluado,
        fecha_hora=fecha))


@usar_contexto
def persistir_entrega(sesion, entrada, lectura, evaluaciones):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    registro = leer_registro(sesion, cuenta, actividad)
    exigir_sin_cambios(registro, lectura.version)
    exigir_abierto(registro)
    fecha = fecha_accion(entrada)
    for item in items:
        evaluacion = evaluaciones.get(item.codigo)
        if evaluacion is None:
            continue
        respuesta = registro.respuestas[item.id]
        comprobar_cambio(sesion, respuesta, dict(estado=EstadoRespuestaRegistro.FINAL,
            actualizada_en=marca_actualizacion(respuesta.actualizada_en), clasificacion_inicial=evaluacion.clasificacion,
            texto_consolidado=respuesta.texto_inicial, opciones_elegidas=lectura.elecciones[item.codigo]))
        insertar_evaluacion(sesion, respuesta.id, 1, evaluacion, fecha)
    return avanzar(sesion, cuenta, actividad, items, fecha)


def entregar(fabrica_sesiones, entrada, evaluador, **opciones_evaluacion):
    with fabrica_sesiones.begin() as sesion:
        lectura = preparar_entrega(sesion, entrada)
    evaluaciones = procesar_entrega(lectura.titulo, lectura.items, evaluador, **opciones_evaluacion)
    with fabrica_sesiones.begin() as sesion:
        return persistir_entrega(sesion, entrada, lectura, evaluaciones)


# --- Seguimiento ----------------------------------------------------------------------------

def avanzar(sesion, cuenta, actividad, items, fecha):
    """Abre la siguiente pregunta o cierra el registro.

    La pregunta va al primer ítem, por orden, que sigue poco desarrollado y tiene turnos libres:
    así se repite en el mismo ítem mientras siga así y, si no, pasa al siguiente.
    """
    registro = leer_registro(sesion, cuenta, actividad)
    if registro.total_turnos < MAXIMO_SEGUIMIENTOS_POR_REGISTRO:
        for item in items:
            respuesta = registro.respuestas.get(item.id)
            if (respuesta is None or registro.clasificacion_vigente(respuesta) != ClasificacionRespuesta.POCO_DESARROLLADA
                    or len(registro.turnos.get(respuesta.id, ())) >= MAXIMO_SEGUIMIENTOS_POR_REGISTRO):
                continue
            ultima = registro.ultima_evaluacion(respuesta)
            sesion.execute(update(RespuestaRegistro.__table__).where(RespuestaRegistro.id == respuesta.id).values(
                estado=EstadoRespuestaRegistro.PENDIENTE_SEGUIMIENTO,
                actualizada_en=marca_actualizacion(respuesta.actualizada_en)))
            sesion.execute(insert(TurnoSeguimiento.__table__), dict(respuesta_id=respuesta.id,
                orden=len(registro.turnos.get(respuesta.id, ())) + 1, pregunta=ultima.pregunta,
                criterios_objetivo=list(ultima.criterios_faltantes), creado_en=fecha))
            return RespuestaRegistroAccion(**registro_publico(leer_registro(sesion, cuenta, actividad), items),
                                           eventos_registrados=[], nuevos_desbloqueos=[])
    return cerrar(sesion, cuenta, actividad, items, registro, fecha)


def cerrar(sesion, cuenta, actividad, items, registro, fecha):
    _, eventos = completar_progreso(sesion, cuenta, actividad)
    evaluadas = [registro.respuestas[item.id] for item in items if item.id in registro.respuestas
                 and registro.respuestas[item.id].clasificacion_inicial is not None]
    eventos += [(TipoEventoUso.RESPUESTA_REFLEXIVA, None) for respuesta in evaluadas
                if respuesta.clasificacion_inicial == ClasificacionRespuesta.ADECUADA or respuesta.ampliada]
    por_ampliar = [item.codigo for item in items if item.id in registro.respuestas and registro.clasificacion_vigente(
        registro.respuestas[item.id]) == ClasificacionRespuesta.POCO_DESARROLLADA]
    if not por_ampliar:
        eventos.append((TipoEventoUso.REGISTRO_ADECUADO, actividad.id))
    respuesta = responder_con_eventos(sesion, cuenta, eventos, fecha)
    return RespuestaRegistroAccion(**registro_publico(leer_registro(sesion, cuenta, actividad), items),
                                   eventos_registrados=respuesta.eventos_registrados,
                                   nuevos_desbloqueos=respuesta.nuevos_desbloqueos, items_por_ampliar=por_ampliar)


@dataclass(frozen=True, slots=True)
class LecturaSeguimiento:
    titulo: str
    item: ItemPorEvaluar
    turnos: tuple[TurnoEvaluacion, ...]
    previos: tuple[str, ...]
    otras: tuple[RespuestaOtroItem, ...]
    pregunta_generica: bool
    version: dict


def pendiente_de(registro, item):
    respuesta = registro.respuestas.get(item.id)
    if respuesta is None or respuesta.estado != EstadoRespuestaRegistro.PENDIENTE_SEGUIMIENTO:
        raise ErrorAccion("Este ítem no tiene una pregunta de seguimiento pendiente")
    turnos = registro.turnos.get(respuesta.id, ())
    return respuesta, turnos, turno_pendiente(turnos)


@usar_contexto
def preparar_seguimiento(sesion, entrada):
    if not entrada.texto.strip():
        raise ErrorAccion("La respuesta no puede estar vacía", estado_http=422)
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    item = validar_item(items, entrada.item)
    registro = leer_registro(sesion, cuenta, actividad)
    respuesta, turnos, turno = pendiente_de(registro, item)
    criterios = criterios_de(sesion, item)
    conversacion = tuple(TurnoEvaluacion(t.pregunta, entrada.texto if t.id == turno.id else t.respuesta)
                         for t in turnos)
    otras = tuple(RespuestaOtroItem(otro.consigna, registro.respuestas[otro.id].texto_consolidado
                                    or registro.respuestas[otro.id].texto_inicial)
                  for otro in items if otro.id != item.id and otro.id in registro.respuestas
                  and registro.respuestas[otro.id].clasificacion_inicial is not None)
    ultima = registro.ultima_evaluacion(respuesta)
    return LecturaSeguimiento(actividad.titulo, ItemPorEvaluar(item.codigo, item.consigna, criterios,
        textos_elegidos(sesion, item, respuesta.opciones_elegidas), respuesta.texto_inicial, item.min_caracteres,
        item.repregunta_generica), conversacion, turno.criterios_objetivo, otras,
        ultima is not None and ultima.origen == OrigenEvaluacion.EXTENSION_MINIMA, version(registro))


@usar_contexto
def persistir_seguimiento(sesion, entrada, lectura, evaluacion):
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    item = validar_item(items, entrada.item)
    registro = leer_registro(sesion, cuenta, actividad)
    exigir_sin_cambios(registro, lectura.version)
    respuesta, turnos, turno = pendiente_de(registro, item)
    fecha = fecha_accion(entrada)
    sesion.execute(update(TurnoSeguimiento.__table__).where(TurnoSeguimiento.id == turno.id)
                   .values(respuesta=entrada.texto, respondido_en=fecha))
    comprobar_cambio(sesion, respuesta, dict(estado=EstadoRespuestaRegistro.FINAL, ampliada=True,
        texto_consolidado=evaluacion.consolidada, actualizada_en=marca_actualizacion(respuesta.actualizada_en)))
    insertar_evaluacion(sesion, respuesta.id, len(registro.evaluaciones.get(respuesta.id, ())) + 1, evaluacion, fecha)
    return avanzar(sesion, cuenta, actividad, items, fecha)


def responder_seguimiento(fabrica_sesiones, entrada, evaluador, **opciones_evaluacion):
    with fabrica_sesiones.begin() as sesion:
        lectura = preparar_seguimiento(sesion, entrada)
    evaluacion = procesar_seguimiento(lectura.titulo, lectura.item, lectura.turnos, lectura.previos, lectura.otras,
                                      evaluador, pregunta_generica=lectura.pregunta_generica, **opciones_evaluacion)
    with fabrica_sesiones.begin() as sesion:
        return persistir_seguimiento(sesion, entrada, lectura, evaluacion)


@usar_contexto
def continuar_sin_responder(sesion, entrada):
    """Omitir cierra todo el registro; el turno queda sin respuesta, que es la marca de la omisión."""
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    item = validar_item(items, entrada.item)
    registro = leer_registro(sesion, cuenta, actividad)
    respuesta, _, turno = pendiente_de(registro, item)
    comprobar_cambio(sesion, respuesta, dict(estado=EstadoRespuestaRegistro.FINAL,
                                            actualizada_en=marca_actualizacion(respuesta.actualizada_en)))
    if turno.respuesta is not None:
        sesion.execute(update(TurnoSeguimiento.__table__).where(TurnoSeguimiento.id == turno.id).values(respuesta=None))
    return cerrar(sesion, cuenta, actividad, items, leer_registro(sesion, cuenta, actividad), fecha_accion(entrada))
