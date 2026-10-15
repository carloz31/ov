"""Acciones sobre los planes de carrera (B11): crear, guardar una sección, medidores, paso hecho, ordenar y eliminar.

Cada acción valida todo antes de escribir y registra un solo evento con la carrera del plan. Ninguna actividad
escribe en los planes: solo estas acciones."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_PLANES, NUMERO_BLOQUE_OPCION_INICIAL
from app.exceptions import ErrorAccion
from app.models import (
    Audiencia, Bloque, Carrera, ComplicacionTarjeta, ConocimientoTarjeta, Cuenta, DudaTarjeta, Espacio, EstadoDuda,
    EstadoPaso, EstadoSugerencia, FinanciamientoTarjeta, GastoTarjeta, Institucion, InstitucionCarrera, MotivoTarjeta,
    OrigenDuda, PasoTarjeta, RespuestaConocimiento, SeccionTarjeta, SugerenciaTarjeta, TarjetaCarrera, TipoEventoUso,
    TipoObjetivo,
)
from app.schemas.acciones import RespuestaAccion
from app.schemas.planes import (
    GuardarSeccionEntrada, MedidoresEntrada, OrdenarPlanesEntrada, PasoHechoEntrada, PlanEntrada,
)
from app.services.comun import buscar_por_codigo, exigir_disponible, existe_evento, fecha_accion, responder_con_eventos
from app.services.planes.consultas import GUARDADA, exigir_planes, opcion_por_codigo, texto_duda_pregunta
from app.services.planes.sugerencias import COMPLICACIONES, DUDAS, Novedades, siguiente_numero, sugerir


def _invalido(mensaje: str) -> ErrorAccion:
    return ErrorAccion(mensaje, estado_http=422)


def _cuenta(sesion: Session, entrada) -> Cuenta:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_planes(sesion, cuenta)
    return cuenta


def _plan(sesion: Session, cuenta: Cuenta, codigo_carrera: str) -> tuple[TarjetaCarrera, Carrera]:
    carrera = buscar_por_codigo(sesion, Carrera, codigo_carrera)
    tarjeta = sesion.scalar(select(TarjetaCarrera).where(TarjetaCarrera.cuenta_id == cuenta.id,
                                                         TarjetaCarrera.carrera_id == carrera.id))
    if tarjeta is None:
        raise ErrorAccion('No tienes un plan para esa carrera')
    return tarjeta, carrera


def _responder(sesion, cuenta, tipo: TipoEventoUso, carrera, fecha) -> RespuestaAccion:
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [(tipo, carrera.id)], fecha)


def _antes_del_bloque_inicial(sesion: Session, cuenta: Cuenta) -> bool:
    bloque = next((b for b in contexto(sesion).definiciones.listar(Bloque)
                   if b.numero == NUMERO_BLOQUE_OPCION_INICIAL and b.espacio == Espacio.MISIONES_CAMPO
                   and b.audiencia == Audiencia.ESTUDIANTE), None)
    return bloque is None or not existe_evento(sesion, cuenta, TipoEventoUso.COMPLETA_BLOQUE, bloque.id)


# --- Crear, ordenar y eliminar ---------------------------------------------------------------------

@usar_contexto
def crear_plan(sesion: Session, entrada: PlanEntrada) -> RespuestaAccion:
    cuenta = _cuenta(sesion, entrada)
    carrera = buscar_por_codigo(sesion, Carrera, entrada.carrera)
    carreras = list(sesion.scalars(select(TarjetaCarrera.carrera_id).where(TarjetaCarrera.cuenta_id == cuenta.id)))
    if carrera.id in carreras:
        raise ErrorAccion('Ya tienes un plan para esa carrera')
    if len(carreras) >= MAXIMO_PLANES:
        raise ErrorAccion(f'Ya tienes {MAXIMO_PLANES} planes; elimina uno para crear otro')
    fecha = fecha_accion(entrada)
    sesion.add(TarjetaCarrera(cuenta_id=cuenta.id, carrera_id=carrera.id, prioridad=len(carreras) + 1,
                              creada_en=fecha, actualizada_en=fecha))
    # La opción inicial es la carrera del primer plan registrado antes de completar el bloque; no cambia después.
    if cuenta.opcion_inicial_id is None and _antes_del_bloque_inicial(sesion, cuenta):
        cuenta.opcion_inicial_id = carrera.id
    return _responder(sesion, cuenta, TipoEventoUso.CREA_PLAN, carrera, fecha)


def _asignar_prioridades(sesion: Session, tarjetas_en_orden: list[TarjetaCarrera]) -> None:
    """Pasa por prioridades temporales para no chocar con el único (cuenta, prioridad)."""
    for tarjeta in tarjetas_en_orden:
        tarjeta.prioridad += MAXIMO_PLANES
    sesion.flush()
    for prioridad, tarjeta in enumerate(tarjetas_en_orden, start=1):
        tarjeta.prioridad = prioridad
    sesion.flush()


@usar_contexto
def ordenar_planes(sesion: Session, entrada: OrdenarPlanesEntrada) -> RespuestaAccion:
    cuenta = _cuenta(sesion, entrada)
    tarjetas = {t.carrera_id: t for t in sesion.scalars(select(TarjetaCarrera).where(
        TarjetaCarrera.cuenta_id == cuenta.id))}
    carreras = [buscar_por_codigo(sesion, Carrera, codigo) for codigo in entrada.carreras]
    if len({c.id for c in carreras}) != len(carreras) or {c.id for c in carreras} != set(tarjetas):
        raise _invalido('Envía todas las carreras de tus planes, una vez cada una')
    fecha = fecha_accion(entrada)
    _asignar_prioridades(sesion, [tarjetas[c.id] for c in carreras])
    for tarjeta in tarjetas.values():
        tarjeta.actualizada_en = fecha
    return _responder(sesion, cuenta, TipoEventoUso.ACTUALIZA_PLAN, carreras[0], fecha)


@usar_contexto
def eliminar_plan(sesion: Session, entrada: PlanEntrada) -> RespuestaAccion:
    """Borra el plan con todo lo suyo; los demás suben de prioridad sin dejar huecos."""
    cuenta = _cuenta(sesion, entrada)
    tarjeta, carrera = _plan(sesion, cuenta, entrada.carrera)
    sesion.delete(tarjeta)
    sesion.flush()
    restantes = list(sesion.scalars(select(TarjetaCarrera).where(TarjetaCarrera.cuenta_id == cuenta.id).order_by(
        TarjetaCarrera.prioridad)))
    for prioridad, restante in enumerate(restantes, start=1):
        if restante.prioridad != prioridad:
            restante.prioridad = prioridad
            sesion.flush()
    return _responder(sesion, cuenta, TipoEventoUso.ELIMINA_PLAN, carrera, fecha_accion(entrada))


# --- Medidores y paso hecho ----------------------------------------------------------------------

@usar_contexto
def guardar_medidores(sesion: Session, entrada: MedidoresEntrada) -> RespuestaAccion:
    cuenta = _cuenta(sesion, entrada)
    tarjeta, carrera = _plan(sesion, cuenta, entrada.carrera)
    for medidor in ('entusiasmo', 'capacidad', 'recursos'):
        if getattr(entrada, medidor) is not None:
            setattr(tarjeta, medidor, getattr(entrada, medidor))
    fecha = fecha_accion(entrada)
    tarjeta.actualizada_en = fecha
    return _responder(sesion, cuenta, TipoEventoUso.ACTUALIZA_PLAN, carrera, fecha)


@usar_contexto
def marcar_paso_hecho(sesion: Session, entrada: PasoHechoEntrada) -> RespuestaAccion:
    """Marca el paso como hecho con su hallazgo y cierra la duda de la que salió."""
    cuenta = _cuenta(sesion, entrada)
    tarjeta, carrera = _plan(sesion, cuenta, entrada.carrera)
    paso = sesion.scalar(select(PasoTarjeta).where(PasoTarjeta.tarjeta_id == tarjeta.id,
                                                   PasoTarjeta.numero == entrada.paso))
    if paso is None:
        raise ErrorAccion('Ese paso no está en tu plan')
    if paso.estado == EstadoPaso.HECHO:
        raise ErrorAccion('Ese paso ya está hecho')
    fecha = fecha_accion(entrada)
    paso.estado, paso.hecho_en, paso.hallazgo = EstadoPaso.HECHO, fecha, entrada.hallazgo
    if paso.duda_id is not None:
        duda = sesion.get(DudaTarjeta, paso.duda_id)
        duda.estado, duda.cerrada_por_paso_id = EstadoDuda.CERRADA, paso.id
    tarjeta.actualizada_en = fecha
    return _responder(sesion, cuenta, TipoEventoUso.ACTUALIZA_PLAN, carrera, fecha)


# --- Guardar una sección -------------------------------------------------------------------------

def _elegida(sesion, lista, elegida) -> tuple[int | None, str | None]:
    return (None if elegida.opcion is None else opcion_por_codigo(sesion, lista, elegida.opcion).id), elegida.otro


def _sin_repetir(elegidas, mensaje):
    claves = [(e.opcion, e.otro) for e in elegidas]
    if len(set(claves)) != len(claves):
        raise _invalido(mensaje)


def _guardar_por_que(sesion, tarjeta, carrera, datos, fecha):
    _sin_repetir(datos.motivos, 'Cada motivo puede elegirse una sola vez')
    motivos = [_elegida(sesion, 'VALORES', motivo) for motivo in datos.motivos]
    sesion.execute(delete(MotivoTarjeta).where(MotivoTarjeta.tarjeta_id == tarjeta.id))
    sesion.add_all(MotivoTarjeta(tarjeta_id=tarjeta.id, posicion=posicion, opcion_id=opcion, texto_otro=otro)
                   for posicion, (opcion, otro) in enumerate(motivos, start=1))
    tarjeta.idea_origen, tarjeta.relato = datos.idea_origen, datos.relato


def _por_numero(filas, numeros, mensaje):
    por_numero = {fila.numero: fila for fila in filas}
    if len(set(numeros)) != len(numeros) or any(numero not in por_numero for numero in numeros):
        raise _invalido(mensaje)
    return por_numero


def _guardar_conocimiento(sesion, tarjeta, carrera, datos, fecha):
    dudas = list(sesion.scalars(select(DudaTarjeta).where(DudaTarjeta.tarjeta_id == tarjeta.id)))
    libres = [d for d in dudas if d.origen != OrigenDuda.PREGUNTA]
    conservadas = [d.numero for d in datos.dudas if d.numero is not None]
    _por_numero(libres, conservadas, 'Solo puedes conservar tus dudas sugeridas o propias')
    sugeridas = {d.opcion_id for d in libres if d.numero in conservadas and d.opcion_id is not None}
    nuevas_libres = []
    for duda in (d for d in datos.dudas if d.numero is None):
        if duda.origen == 'SUGERIDA':
            opcion = opcion_por_codigo(sesion, 'DUDAS_SUGERIDAS', duda.opcion)
            if opcion.id in sugeridas:
                raise _invalido('Cada duda sugerida puede anotarse una sola vez')
            sugeridas.add(opcion.id)
            nuevas_libres.append((OrigenDuda.SUGERIDA, opcion.id, opcion.texto))
        else:
            nuevas_libres.append((OrigenDuda.PROPIA, None, duda.texto))
    # Las dudas omitidas se borran con sus sugerencias; los pasos que salieron de ellas se conservan.
    omitidas = [d.id for d in libres if d.numero not in conservadas]
    if omitidas:
        sesion.execute(delete(DudaTarjeta).where(DudaTarjeta.id.in_(omitidas)))
    sesion.execute(delete(ConocimientoTarjeta).where(ConocimientoTarjeta.tarjeta_id == tarjeta.id))
    sesion.add_all(ConocimientoTarjeta(tarjeta_id=tarjeta.id, pregunta=pregunta, respuesta=respuesta)
                   for pregunta, respuesta in datos.respuestas.items())
    de_preguntas = {d.pregunta: d for d in dudas if d.origen == OrigenDuda.PREGUNTA}
    nuevas = []
    for pregunta, respuesta in datos.respuestas.items():
        duda = de_preguntas.get(pregunta)
        if respuesta == RespuestaConocimiento.SI:
            if duda is not None and duda.estado == EstadoDuda.ABIERTA:
                duda.estado = EstadoDuda.CERRADA
        elif duda is not None:
            # Una duda que se cerró al responder «sí» (no con un paso) vuelve a abrirse.
            if duda.estado == EstadoDuda.CERRADA and duda.cerrada_por_paso_id is None:
                duda.estado = EstadoDuda.ABIERTA
        else:
            nuevas.append(DudaTarjeta(
                tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'duda'), origen=OrigenDuda.PREGUNTA,
                pregunta=pregunta, texto=texto_duda_pregunta(sesion, pregunta, carrera.nombre),
                estado=EstadoDuda.ABIERTA, creada_en=fecha))
    nuevas += [DudaTarjeta(tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'duda'), origen=origen,
                           opcion_id=opcion, texto=texto, estado=EstadoDuda.ABIERTA, creada_en=fecha)
               for origen, opcion, texto in nuevas_libres]
    sesion.add_all(nuevas)
    return nuevas


def _guardar_realidad(sesion, tarjeta, carrera, datos, fecha):
    institucion_id = None
    if datos.institucion is not None:
        institucion = sesion.scalar(select(Institucion).where(Institucion.codigo == datos.institucion))
        if institucion is None or sesion.get(InstitucionCarrera, (institucion.id, carrera.id)) is None:
            raise _invalido('Esa institución no ofrece la carrera de este plan')
        institucion_id = institucion.id
    camino = (None, None) if datos.camino is None else _elegida(sesion, 'CAMINOS', datos.camino)
    gastos = [(None if gasto.rubro is None else opcion_por_codigo(sesion, 'RUBROS_GASTO', gasto.rubro).id, gasto.otro,
               gasto.monto, gasto.frecuencia) for gasto in datos.gastos]
    _sin_repetir(datos.financiamiento, 'Cada forma de financiamiento puede elegirse una sola vez')
    financiamiento = [_elegida(sesion, 'FINANCIAMIENTO', f) for f in datos.financiamiento]
    complicaciones = list(sesion.scalars(select(ComplicacionTarjeta).where(ComplicacionTarjeta.tarjeta_id == tarjeta.id)))
    conservadas = [c.numero for c in datos.complicaciones if c.numero is not None]
    _por_numero(complicaciones, conservadas, 'Solo puedes conservar complicaciones de este plan')
    nuevas_datos = [c for c in datos.complicaciones if c.numero is None]
    _sin_repetir(nuevas_datos, 'Cada complicación puede anotarse una sola vez')
    nuevas_elegidas = [_elegida(sesion, 'DIFICULTADES', c) for c in nuevas_datos]
    omitidas = [c.id for c in complicaciones if c.numero not in conservadas]
    if omitidas:
        sesion.execute(delete(ComplicacionTarjeta).where(ComplicacionTarjeta.id.in_(omitidas)))
    for modelo in (GastoTarjeta, FinanciamientoTarjeta):
        sesion.execute(delete(modelo).where(modelo.tarjeta_id == tarjeta.id))
    sesion.add_all(GastoTarjeta(tarjeta_id=tarjeta.id, posicion=posicion, rubro_opcion_id=opcion, rubro_otro=otro,
                                monto=monto, frecuencia=frecuencia)
                   for posicion, (opcion, otro, monto, frecuencia) in enumerate(gastos, start=1))
    sesion.add_all(FinanciamientoTarjeta(tarjeta_id=tarjeta.id, posicion=posicion, opcion_id=opcion, texto_otro=otro)
                   for posicion, (opcion, otro) in enumerate(financiamiento, start=1))
    # Al cambiar de institución no se tocan los montos: son del estudiante.
    tarjeta.institucion_id = institucion_id
    tarjeta.camino_opcion_id, tarjeta.camino_otro = camino
    nuevas = [ComplicacionTarjeta(tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'complicacion'),
                                  opcion_id=opcion, texto_otro=otro, creada_en=fecha)
              for opcion, otro in nuevas_elegidas]
    sesion.add_all(nuevas)
    return nuevas


def _guardar_pasos(sesion, tarjeta, carrera, datos, fecha):
    pasos = list(sesion.scalars(select(PasoTarjeta).where(PasoTarjeta.tarjeta_id == tarjeta.id)))
    sugerencias = list(sesion.scalars(select(SugerenciaTarjeta).where(SugerenciaTarjeta.tarjeta_id == tarjeta.id)))
    conservados = [p.numero for p in datos.pasos if p.numero is not None]
    por_numero = _por_numero(pasos, conservados, 'Solo puedes conservar pasos de este plan')
    aceptadas = [p.sugerencia for p in datos.pasos if p.sugerencia is not None]
    pendientes = {s.numero: s for s in sugerencias if s.estado == EstadoSugerencia.PENDIENTE}
    for numeros in (aceptadas, datos.sugerencias_descartadas):
        _por_numero(pendientes.values(), numeros, 'Solo puedes aceptar o descartar sugerencias pendientes')
    if set(aceptadas) & set(datos.sugerencias_descartadas):
        raise _invalido('Una sugerencia no puede aceptarse y descartarse a la vez')
    tipos = {p.tipo: opcion_por_codigo(sesion, 'PASOS', p.tipo).id for p in datos.pasos if p.tipo is not None}
    # Los pasos omitidos se borran, salvo los hechos, que se conservan al final.
    omitidos = [p.id for p in pasos if p.numero not in conservados and p.estado == EstadoPaso.PENDIENTE]
    if omitidos:
        sesion.execute(delete(PasoTarjeta).where(PasoTarjeta.id.in_(omitidos)))
    ordenados = []
    for paso in datos.pasos:
        if paso.numero is not None:
            existente = por_numero[paso.numero]
            if existente.estado == EstadoPaso.PENDIENTE:
                existente.tipo_opcion_id = tipos.get(paso.tipo, existente.tipo_opcion_id)
                existente.texto = paso.texto or existente.texto
            ordenados.append(existente)
            continue
        sugerencia = None if paso.sugerencia is None else pendientes[paso.sugerencia]
        if sugerencia is not None:
            sugerencia.estado = EstadoSugerencia.ACEPTADA
        nuevo = PasoTarjeta(
            tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'paso'), posicion=0,
            tipo_opcion_id=tipos[paso.tipo] if paso.tipo is not None else sugerencia.tipo_opcion_id,
            texto=paso.texto or sugerencia.texto, estado=EstadoPaso.PENDIENTE,
            duda_id=None if sugerencia is None else sugerencia.duda_id,
            complicacion_id=None if sugerencia is None else sugerencia.complicacion_id,
            sugerencia_id=None if sugerencia is None else sugerencia.id)
        sesion.add(nuevo)
        ordenados.append(nuevo)
    for numero in datos.sugerencias_descartadas:
        pendientes[numero].estado = EstadoSugerencia.DESCARTADA
    hechos = sorted((p for p in pasos if p.numero not in conservados and p.estado == EstadoPaso.HECHO),
                    key=lambda p: p.posicion)
    for posicion, paso in enumerate([*ordenados, *hechos], start=1):
        paso.posicion = posicion


GUARDAR = {'POR_QUE': _guardar_por_que, 'CONOCIMIENTO': _guardar_conocimiento, 'REALIDAD': _guardar_realidad,
           'PASOS': _guardar_pasos}


@usar_contexto
def _guardar_seccion(sesion: Session, entrada: GuardarSeccionEntrada) -> tuple[RespuestaAccion, Novedades | None]:
    cuenta = _cuenta(sesion, entrada)
    tarjeta, carrera = _plan(sesion, cuenta, entrada.carrera)
    exigir_disponible(sesion, cuenta, TipoObjetivo.SECCION_PLAN,
                      contexto(sesion).definiciones.por_codigo(SeccionTarjeta, entrada.seccion))
    fecha = fecha_accion(entrada)
    nuevas = GUARDAR[entrada.seccion](sesion, tarjeta, carrera, entrada.datos, fecha)
    setattr(tarjeta, GUARDADA[entrada.seccion], fecha)
    tarjeta.actualizada_en = fecha
    respuesta = _responder(sesion, cuenta, TipoEventoUso.ACTUALIZA_PLAN, carrera, fecha)
    novedades = None if not nuevas else Novedades(
        tarjeta_id=tarjeta.id, tipo=DUDAS if entrada.seccion == 'CONOCIMIENTO' else COMPLICACIONES,
        numeros=tuple(fila.numero for fila in nuevas), fecha=fecha)
    return respuesta, novedades


def guardar_seccion(fabrica_sesiones, entrada: GuardarSeccionEntrada, evaluador, *,
                    tiempo_maximo_segundos: float) -> RespuestaAccion:
    """Reemplaza la sección entera; sus efectos (dudas, cierres) ocurren solo aquí. Las dudas o complicaciones
    nuevas reciben sus pasos sugeridos después de confirmar el guardado, fuera de su transacción."""
    with fabrica_sesiones.begin() as sesion:
        respuesta, novedades = _guardar_seccion(sesion, entrada)
    if novedades is not None:
        sugerir(fabrica_sesiones, novedades, evaluador, tiempo_maximo_segundos=tiempo_maximo_segundos)
    return respuesta
