from sqlalchemy import bindparam, delete, func, insert, select, update
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_REINICIOS_PERFIL_PLANO
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, ActividadItem, AplicacionActividad, Bloque, ColeccionOcupacion, Cuenta, Dimension, EstadoProgreso,
    EstadoRespuestaRegistro, Instrumento, ItemInstrumento, Ocupacion, OpcionEscala, ProgresoActividad, RespuestaItem,
    PreguntaBatalla, RespuestaBatalla, RespuestaRegistro, ResultadoBatalla, ResultadoCaso, ResultadoInstrumento, Rol,
    TipoActividad, TipoEventoUso,
    TipoObjetivo, TipoResultado, Visibilidad,
)
from app.schemas.acciones import (
    CompletarActividadEntrada, ProgresoRespuestas, ReiniciarInstrumentoEntrada,
    ResolverBatallaEntrada, ResolverCasoEntrada, ResponderItemsEntrada, RespuestaAccion,
    RespuestaItemGuardada, RespuestaItemsGuardados, RespuestaResolverBatalla, RespuestaResolverCaso,
    RespuestaReiniciarInstrumento,
    RespuestaRevelarResultado, ResultadoAnulado, RevelarResultadoEntrada,
)
from app.schemas.actividades import ActividadCuenta, BloqueActividades
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, existe_evento, fecha_accion, responder_con_eventos,
)
from app.services.instrumentos.consultas import actividades_de_aplicacion, seleccionar_aplicacion
from app.services.instrumentos.resultados import generar_resultado
from app.services.motor.reglas import motivos_bloqueo, objetivo_disponible


@usar_contexto
def completar_progreso(sesion: Session, cuenta: Cuenta, actividad: Actividad):
    datos = contexto(sesion)
    progresos = datos.progresos_de(cuenta.id)
    progreso = progresos.get(actividad.id)
    if progreso is None:
        progreso = ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id,
                                     estado=EstadoProgreso.COMPLETADA)
        sesion.add(progreso)
        progresos[actividad.id] = progreso
    else:
        progreso.estado = EstadoProgreso.COMPLETADA
    sesion.flush()
    eventos = [(TipoEventoUso.COMPLETA_ACTIVIDAD, actividad.id)]
    # Las actividades opcionales no cuentan para cerrar el bloque.
    actividades = [otra for otra in datos.definiciones.listar(Actividad)
                   if otra.bloque_id == actividad.bloque_id and otra.requerida]
    completo = all(otra.id in progresos and progresos[otra.id].estado == EstadoProgreso.COMPLETADA for otra in actividades)
    if completo and not existe_evento(sesion, cuenta, TipoEventoUso.COMPLETA_BLOQUE, actividad.bloque_id):
        eventos.append((TipoEventoUso.COMPLETA_BLOQUE, actividad.bloque_id))
    return progreso, eventos


@usar_contexto
def items_de_actividad(sesion: Session, actividad: Actividad) -> list[ItemInstrumento]:
    definiciones = contexto(sesion).definiciones
    presentaciones = sorted((fila for fila in definiciones.listar(ActividadItem) if fila.actividad_id == actividad.id),
                            key=lambda fila: (fila.orden, definiciones.obtener(ItemInstrumento, fila.item_id).numero))
    return [definiciones.obtener(ItemInstrumento, fila.item_id) for fila in presentaciones]


@usar_contexto
def iniciar_progreso(sesion: Session, cuenta: Cuenta, actividad: Actividad) -> ProgresoActividad:
    progresos = contexto(sesion).progresos_de(cuenta.id)
    if actividad.id not in progresos:
        progresos[actividad.id] = ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id,
                                                    estado=EstadoProgreso.EN_CURSO)
        sesion.add(progresos[actividad.id])
        sesion.flush()
    return progresos[actividad.id]


@usar_contexto
def progreso_de_actividad(sesion: Session, cuenta: Cuenta, actividad: Actividad) -> ProgresoActividad | None:
    return contexto(sesion).progresos_de(cuenta.id).get(actividad.id)


@usar_contexto
def responder_items(sesion: Session, entrada: ResponderItemsEntrada) -> RespuestaItemsGuardados:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    if cuenta.rol != Rol.ESTUDIANTE:
        raise ErrorAccion("Instrumentos no encontrados para esta cuenta", estado_http=404)
    actividad = buscar_por_codigo(sesion, Actividad, entrada.actividad)
    exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    items = {item.codigo: item for item in items_de_actividad(sesion, actividad)}
    if not items:
        raise ErrorAccion("La actividad no presenta ítems de instrumento")
    if sesion.scalar(select(ResultadoInstrumento.id).join(
        AplicacionActividad, AplicacionActividad.aplicacion_id == ResultadoInstrumento.aplicacion_id,
    ).where(ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
            AplicacionActividad.actividad_id == actividad.id).limit(1)) is not None:
        raise ErrorAccion("Las respuestas están fijas: la aplicación tiene un resultado vigente")
    progreso = progreso_de_actividad(sesion, cuenta, actividad)
    definiciones = contexto(sesion).definiciones
    instrumentos_comparacion = {instrumento.id for instrumento in definiciones.listar(Instrumento)
                               if instrumento.tipo_resultado == TipoResultado.COMPARACION}
    opciones = {(opcion.escala_id, opcion.orden): opcion for opcion in definiciones.listar(OpcionEscala)}
    validadas = []
    for respuesta in entrada.respuestas:
        item = items.get(respuesta.item)
        if item is None:
            raise ErrorAccion(f"El ítem {respuesta.item} no se presenta en {actividad.codigo}")
        if progreso is not None and progreso.estado == EstadoProgreso.COMPLETADA and (
            item.instrumento_id in instrumentos_comparacion
        ):
            raise ErrorAccion("Las respuestas están fijas: el cuestionario de partida o llegada está completado")
        opcion = opciones.get((item.escala_id, respuesta.opcion))
        if opcion is None:
            raise ErrorAccion(f"La opción {respuesta.opcion} no pertenece a la escala de {item.codigo}", estado_http=422)
        validadas.append((item, opcion))
    # Todo el lote se valida antes de crear progreso o modificar respuestas.
    fecha = fecha_accion(entrada)
    if progreso is None:
        progreso = ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id, estado=EstadoProgreso.EN_CURSO)
        sesion.add(progreso)
        sesion.flush()
    contexto(sesion).progresos_de(cuenta.id)[actividad.id] = progreso
    existentes = {respuesta.item_id: respuesta for respuesta in sesion.scalars(select(RespuestaItem).where(
        RespuestaItem.progreso_id == progreso.id,
    ))}
    nuevas, actualizadas = [], []
    for item, opcion in validadas:
        respuesta = existentes.get(item.id)
        if respuesta is None:
            nuevas.append(dict(progreso_id=progreso.id, item_id=item.id, opcion_id=opcion.id,
                               creada_en=fecha, actualizada_en=fecha))
        else:
            actualizadas.append(dict(respuesta_id=respuesta.id, nueva_opcion=opcion.id, nueva_fecha=fecha))
    if nuevas:
        sesion.execute(insert(RespuestaItem.__table__), nuevas)
    if actualizadas:
        sesion.execute(update(RespuestaItem.__table__).where(RespuestaItem.id == bindparam('respuesta_id')).values(
            opcion_id=bindparam('nueva_opcion'), actualizada_en=bindparam('nueva_fecha'),
        ), actualizadas)
    respondidos = len((set(existentes) | {item.id for item, _ in validadas}) & {item.id for item in items.values()})
    return RespuestaItemsGuardados(
        cuenta=cuenta.codigo, actividad=actividad.codigo,
        respuestas_guardadas=[RespuestaItemGuardada(item=item.codigo, opcion=opcion.orden) for item, opcion in validadas],
        progreso=ProgresoRespuestas(estado=progreso.estado, respondidos=respondidos, total=len(items)),
    )


@usar_contexto
def completar_actividad(sesion: Session, entrada: CompletarActividadEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    actividad = buscar_por_codigo(sesion, Actividad, entrada.actividad)
    items = items_de_actividad(sesion, actividad)
    items_registro = contexto(sesion).definiciones.items_registro_por_actividad.get(actividad.id, ())
    if (items or items_registro) and cuenta.rol != Rol.ESTUDIANTE:
        mensaje = "Instrumentos no encontrados para esta cuenta" if items else "Registro no encontrado para esta cuenta"
        raise ErrorAccion(mensaje, estado_http=404)
    exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    if actividad.tipo == TipoActividad.CASO:
        raise ErrorAccion("Los casos deben completarse mediante resolver-caso")
    if actividad.tipo == TipoActividad.BATALLA:
        raise ErrorAccion("Las batallas deben completarse mediante resolver-batalla")
    if items:
        progreso = progreso_de_actividad(sesion, cuenta, actividad)
        respondidos = set() if progreso is None else set(sesion.scalars(select(RespuestaItem.item_id).where(
            RespuestaItem.progreso_id == progreso.id,
        )))
        faltantes = [item.codigo for item in items if item.id not in respondidos]
        if faltantes:
            raise ErrorAccion("Faltan ítems por responder", items_faltantes=faltantes)
    obligatorios = [item for item in items_registro if item.obligatorio]
    if obligatorios:
        progreso = progreso_de_actividad(sesion, cuenta, actividad)
        finalizados = set() if progreso is None else set(sesion.scalars(select(RespuestaRegistro.item_registro_id).where(
            RespuestaRegistro.progreso_id == progreso.id,
            RespuestaRegistro.estado == EstadoRespuestaRegistro.FINAL,
        )))
        faltantes = [item.codigo for item in obligatorios if item.id not in finalizados]
        if faltantes:
            raise ErrorAccion("Faltan ítems de registro por finalizar", items_faltantes=faltantes)
    fecha = fecha_accion(entrada)
    _, eventos = completar_progreso(sesion, cuenta, actividad)
    return responder_con_eventos(sesion, cuenta, eventos, fecha)


def instrumento_y_aplicacion(sesion: Session, cuenta: Cuenta, codigo_instrumento: str, codigo_aplicacion: str | None):
    if cuenta.rol != Rol.ESTUDIANTE:
        raise ErrorAccion("Instrumentos no encontrados para esta cuenta", estado_http=404)
    instrumento = buscar_por_codigo(sesion, Instrumento, codigo_instrumento)
    try:
        return instrumento, seleccionar_aplicacion(sesion, instrumento, codigo_aplicacion)
    except LookupError as error:
        raise ErrorAccion(str(error), estado_http=404) from error
    except ValueError as error:
        raise ErrorAccion(str(error), estado_http=422) from error


def resultado_vigente(sesion: Session, cuenta: Cuenta, aplicacion) -> ResultadoInstrumento | None:
    return sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id == aplicacion.id,
        ResultadoInstrumento.anulado_en.is_(None),
    ))


@usar_contexto
def revelar_resultado(sesion: Session, entrada: RevelarResultadoEntrada) -> RespuestaRevelarResultado:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    instrumento, aplicacion = instrumento_y_aplicacion(sesion, cuenta, entrada.instrumento, entrada.aplicacion)
    definiciones = contexto(sesion).definiciones
    if not any(d.instrumento_id == instrumento.id for d in definiciones.listar(Dimension)):
        raise ErrorAccion("Este instrumento no genera un resultado que revelar")
    progresos = contexto(sesion).progresos_de(cuenta.id)
    faltantes = [actividad.codigo for actividad in actividades_de_aplicacion(sesion, aplicacion)
                 if actividad.id not in progresos or progresos[actividad.id].estado != EstadoProgreso.COMPLETADA]
    if faltantes:
        raise ErrorAccion("Completa todas las misiones para revelar", items_faltantes=faltantes)
    if resultado_vigente(sesion, cuenta, aplicacion) is not None:
        raise ErrorAccion("Resultado ya revelado")
    fecha = fecha_accion(entrada)
    perfil_plano = generar_resultado(sesion, cuenta, aplicacion, fecha)
    respuesta = responder_con_eventos(sesion, cuenta, [(TipoEventoUso.REVELA_RESULTADO, aplicacion.id)], fecha)
    return RespuestaRevelarResultado(
        cuenta=cuenta.codigo, instrumento=instrumento.codigo, aplicacion=aplicacion.codigo, perfil_plano=perfil_plano,
        **respuesta.campos(),
    )


@usar_contexto
def reiniciar_instrumento(sesion: Session, entrada: ReiniciarInstrumentoEntrada) -> RespuestaReiniciarInstrumento:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    instrumento, aplicacion = instrumento_y_aplicacion(sesion, cuenta, entrada.instrumento, entrada.aplicacion)
    actividades = actividades_de_aplicacion(sesion, aplicacion)
    progresos = list(sesion.scalars(select(ProgresoActividad).where(
        ProgresoActividad.cuenta_id == cuenta.id,
        ProgresoActividad.actividad_id.in_([actividad.id for actividad in actividades]),
    )))
    filtro_respuestas = (
        RespuestaItem.progreso_id.in_([progreso.id for progreso in progresos]),
        RespuestaItem.item_id.in_(select(ItemInstrumento.id).where(ItemInstrumento.instrumento_id == instrumento.id)),
    )
    resultado = resultado_vigente(sesion, cuenta, aplicacion)
    if resultado is None or not resultado.perfil_plano:
        raise ErrorAccion("Solo se puede reiniciar un resultado revelado con perfil plano")
    reinicios = sesion.scalar(select(func.count()).select_from(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id == aplicacion.id,
        ResultadoInstrumento.anulado_en.is_not(None), ResultadoInstrumento.perfil_plano,
    ))
    if reinicios >= MAXIMO_REINICIOS_PERFIL_PLANO:
        raise ErrorAccion("Ya usaste el reinicio de este cuestionario")
    fecha = fecha_accion(entrada)
    resultado.anulado_en = fecha
    anulado = ResultadoAnulado(instrumento=instrumento.codigo, aplicacion=aplicacion.codigo,
                              calculado_en=resultado.calculado_en, anulado_en=fecha)
    sesion.execute(delete(RespuestaItem).where(*filtro_respuestas))
    for progreso in progresos:
        progreso.estado = EstadoProgreso.EN_CURSO
    sesion.flush()
    respuesta = responder_con_eventos(sesion, cuenta, [(TipoEventoUso.REINICIA_INSTRUMENTO, instrumento.id)], fecha)
    ids_reiniciados = {progreso.actividad_id for progreso in progresos}
    return RespuestaReiniciarInstrumento(
        cuenta=cuenta.codigo, instrumento=instrumento.codigo, aplicacion=aplicacion.codigo, resultado_anulado=anulado,
        actividades_reiniciadas=[actividad.codigo for actividad in actividades if actividad.id in ids_reiniciados],
        **respuesta.campos(),
    )


@usar_contexto
def resolver_caso(sesion: Session, entrada: ResolverCasoEntrada) -> RespuestaResolverCaso:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    actividad = buscar_por_codigo(sesion, Actividad, entrada.actividad)
    exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    if actividad.tipo != TipoActividad.CASO:
        raise ErrorAccion("La actividad debe ser de tipo CASO")
    codigos = list(dict.fromkeys(entrada.ocupaciones))
    ocupaciones = {ocupacion.codigo: ocupacion for ocupacion in sesion.scalars(
        select(Ocupacion).where(Ocupacion.codigo.in_(codigos)))} if codigos else {}
    desconocidas = [codigo for codigo in codigos if codigo not in ocupaciones]
    if desconocidas:
        raise ErrorAccion(f"Ocupaciones inexistentes: {', '.join(desconocidas)}", estado_http=422)
    fecha = fecha_accion(entrada)
    nuevas = []
    # Fallar guarda el intento sin completar el caso; solo superarlo libera testimonios y colección.
    if entrada.puntaje >= actividad.puntaje_minimo:
        progreso, eventos = completar_progreso(sesion, cuenta, actividad)
        if not existe_evento(sesion, cuenta, TipoEventoUso.SUPERA_CASO, actividad.id):
            eventos.append((TipoEventoUso.SUPERA_CASO, actividad.id))
        obtenidas = set(sesion.scalars(select(ColeccionOcupacion.ocupacion_id).where(
            ColeccionOcupacion.cuenta_id == cuenta.id)))
        nuevas = [codigo for codigo in codigos if ocupaciones[codigo].id not in obtenidas]
        sesion.add_all(ColeccionOcupacion(cuenta_id=cuenta.id, ocupacion_id=ocupaciones[codigo].id,
                                          actividad_id=actividad.id, obtenida_en=fecha) for codigo in nuevas)
    else:
        progreso, eventos = iniciar_progreso(sesion, cuenta, actividad), []
    sesion.add(ResultadoCaso(progreso_id=progreso.id, puntaje=entrada.puntaje, fecha_hora=fecha))
    respuesta = responder_con_eventos(sesion, cuenta, eventos, fecha)
    return RespuestaResolverCaso(**respuesta.campos(), ocupaciones_nuevas=nuevas)


@usar_contexto
def resolver_batalla(sesion: Session, entrada: ResolverBatallaEntrada) -> RespuestaResolverBatalla:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    actividad = buscar_por_codigo(sesion, Actividad, entrada.actividad)
    exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    if actividad.tipo != TipoActividad.BATALLA:
        raise ErrorAccion("La actividad debe ser de tipo BATALLA")
    respondidas = _respuestas_batalla(sesion, actividad, entrada)
    victoria, destellos = _recorrer_intento(actividad, [correcta for _, _, correcta in respondidas])
    aciertos, preguntas = sum(correcta for _, _, correcta in respondidas), len(respondidas)
    fecha = fecha_accion(entrada)
    eventos = []
    # Solo la primera victoria completa y abre el siguiente paso; los intentos posteriores son práctica.
    practica = existe_evento(sesion, cuenta, TipoEventoUso.SUPERA_BATALLA, actividad.id)
    if victoria and not practica:
        progreso, eventos = completar_progreso(sesion, cuenta, actividad)
        eventos.append((TipoEventoUso.SUPERA_BATALLA, actividad.id))
        if destellos == actividad.destellos:
            eventos.append((TipoEventoUso.VENCE_DESAFIO_INTACTO, None))
    else:
        progreso = iniciar_progreso(sesion, cuenta, actividad)
    resultado = ResultadoBatalla(progreso_id=progreso.id, victoria=victoria, aciertos=aciertos,
                                 preguntas=preguntas, fecha_hora=fecha)
    sesion.add(resultado)
    sesion.flush()
    # Las respuestas del intento, en una sola escritura.
    sesion.execute(insert(RespuestaBatalla), [
        {'resultado_batalla_id': resultado.id, 'pregunta_batalla_id': pregunta.id, 'opcion': opcion,
         'correcta': correcta}
        for pregunta, opcion, correcta in respondidas])
    respuesta = responder_con_eventos(sesion, cuenta, eventos, fecha)
    return RespuestaResolverBatalla(**respuesta.campos(), victoria=victoria, practica=practica, aciertos=aciertos,
                                    preguntas=preguntas, destellos_restantes=destellos)


def _recorrer_intento(actividad: Actividad, aciertos: list[bool]) -> tuple[bool, int]:
    """(victoria, destellos restantes). Cada acierto quita una vida al enemigo y cada error, un destello; el
    intento debe terminar justo en la última respuesta (422 si no termina o si sobran respuestas)."""
    vidas, destellos = actividad.vidas_enemigo, actividad.destellos
    for numero, acierto in enumerate(aciertos, start=1):
        if acierto:
            vidas -= 1
        else:
            destellos -= 1
        if vidas == 0 or destellos == 0:
            if numero < len(aciertos):
                raise ErrorAccion("Hay respuestas después del final del intento", estado_http=422)
            return vidas == 0, destellos
    raise ErrorAccion("El intento no terminó: faltan respuestas", estado_http=422)


def _respuestas_batalla(sesion: Session, actividad: Actividad, entrada: ResolverBatallaEntrada):
    """(pregunta, opción, si acertó) por respuesta; 422 si no es de la batalla, se repite o no existe la opción."""
    codigos = [respuesta.pregunta for respuesta in entrada.respuestas]
    if len(set(codigos)) != len(codigos):
        raise ErrorAccion("Una pregunta se respondió más de una vez", estado_http=422)
    preguntas = {pregunta.codigo: pregunta for pregunta in sesion.scalars(select(PreguntaBatalla).where(
        PreguntaBatalla.actividad_id == actividad.id, PreguntaBatalla.codigo.in_(codigos)))}
    ajenas = [codigo for codigo in codigos if codigo not in preguntas]
    if ajenas:
        raise ErrorAccion(f"Preguntas que no son de esta batalla: {', '.join(ajenas)}", estado_http=422)
    respondidas = []
    for respuesta in entrada.respuestas:
        pregunta = preguntas[respuesta.pregunta]
        if respuesta.opcion >= len(pregunta.opciones):
            raise ErrorAccion(f"La pregunta {pregunta.codigo} no tiene la opción {respuesta.opcion}", estado_http=422)
        respondidas.append((pregunta, respuesta.opcion, respuesta.opcion == pregunta.correcta))
    return respondidas


@usar_contexto
def estado_actividad(sesion: Session, cuenta: Cuenta, actividad: Actividad) -> str:
    """BLOQUEADA, DISPONIBLE, EN_CURSO o COMPLETADA, como en la consulta de actividades."""
    disponible = (objetivo_disponible(sesion, cuenta, TipoObjetivo.BLOQUE, actividad.bloque_id)
                  and objetivo_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad.id))
    progreso = contexto(sesion).progresos_de(cuenta.id).get(actividad.id)
    return "BLOQUEADA" if not disponible else (progreso.estado.value if progreso else "DISPONIBLE")


@usar_contexto
def listar_bloques_cuenta(sesion: Session, cuenta: Cuenta) -> list[BloqueActividades]:
    datos = contexto(sesion)
    progresos = {identificador: progreso.estado for identificador, progreso in datos.progresos_de(cuenta.id).items()}
    bloques = []
    for bloque in sorted((bloque for bloque in datos.definiciones.listar(Bloque)
                         if bloque.audiencia == cuenta.rol.value), key=lambda bloque: (bloque.numero, bloque.codigo)):
        bloque_disponible = objetivo_disponible(sesion, cuenta, TipoObjetivo.BLOQUE, bloque.id)
        actividades = []
        for actividad in sorted((actividad for actividad in datos.definiciones.listar(Actividad)
                                 if actividad.bloque_id == bloque.id), key=lambda actividad: (actividad.orden, actividad.codigo)):
            disponible = bloque_disponible and objetivo_disponible(
                sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad.id,
            )
            estado = "BLOQUEADA" if not disponible else (
                progresos[actividad.id].value if actividad.id in progresos else "DISPONIBLE"
            )
            actividades.append(ActividadCuenta(
                codigo=actividad.codigo, titulo=actividad.titulo, tipo=actividad.tipo, orden=actividad.orden,
                contenido=actividad.contenido, visibilidad=actividad.visibilidad,
                visible=actividad.visibilidad == Visibilidad.SIEMPRE or estado != "BLOQUEADA", estado=estado,
                requerida=actividad.requerida, duracion_estimada_min=actividad.duracion_estimada_min,
                descripcion=actividad.descripcion,
                bloqueo=None if disponible else motivos_bloqueo(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad.id),
            ))
        bloques.append(BloqueActividades(
            codigo=bloque.codigo, nombre=bloque.nombre, numero=bloque.numero, espacio=bloque.espacio,
            estado="DISPONIBLE" if bloque_disponible else "BLOQUEADA",
            bloqueo=None if bloque_disponible else motivos_bloqueo(sesion, cuenta, TipoObjetivo.BLOQUE, bloque.id),
            actividades=actividades,
        ))
    return bloques
