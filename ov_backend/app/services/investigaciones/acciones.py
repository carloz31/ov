"""Acciones del estudiante sobre su investigación y sus entrevistas (B13)."""

from uuid import uuid4

from sqlalchemy import delete, insert, or_, select, update
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import FAVORITOS_LEYENDA
from app.exceptions import ErrorAccion
from app.models import (
    Cuenta, Entrevista, EntrevistaAutor, EstadoEntrevista, EstadoInvestigacion, EstadoReporte, EstadoSugerenciaGuion,
    Investigacion, Ocupacion, OrigenPreguntaGuion, PreguntaGuion, Reaccion, Reporte, Rol, SugerenciaGuion,
    TipoEventoUso, TipoReaccion,
)
from app.models.base import sin_tildes
from app.schemas.acciones import RespuestaAccion, RespuestaAgrupada
from app.schemas.investigaciones import (
    CancelarInvestigacionEntrada, EditarEntrevistaEntrada, EntrevistaEntrada, GuardarGuionEntrada,
    GuardarLoQuePiensoEntrada, PublicarEntrevistaEntrada, ReaccionarEntrada, ReaccionEntrada, ReportarEntrada,
)
from app.services.comun import (
    buscar_por_codigo, existe_evento, fecha_accion, responder_con_eventos, responder_varias_cuentas,
)
from app.services.investigaciones.consultas import (
    contar_favoritos, de_autor, entrevista_de_sus_salones, entrevista_visible, exigir_investigacion_activa,
    exigir_seccion_investigaciones, investigacion_activa, salones_de_orientadora,
)
from app.services.motor.reglas import registrar_eventos


def cuenta_estudiante(sesion: Session, codigo: str) -> Cuenta:
    """La cuenta con la sección INVESTIGACIONES abierta (404 si no es de estudiante, 409 si está cerrada)."""
    cuenta = buscar_por_codigo(sesion, Cuenta, codigo)
    exigir_seccion_investigaciones(sesion, cuenta)
    return cuenta


# --- Investigación y guion ----------------------------------------------------------------------

@usar_contexto
def guardar_lo_que_pienso(sesion: Session, entrada: GuardarLoQuePiensoEntrada) -> RespuestaAccion:
    """Sin investigación activa, la crea (INICIA_INVESTIGACION); con ella, cambia ocupación y textos sin cambiar su
    estado. Si cambia algo, las sugerencias pendientes dejan de valer y la próxima petición llama al LLM."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    ocupacion = buscar_por_codigo(sesion, Ocupacion, entrada.ocupacion)
    fecha = fecha_accion(entrada)
    textos = (entrada.dia, entrada.necesita, entrada.duda)
    investigacion = investigacion_activa(sesion, cuenta.id)
    if investigacion is None:
        sesion.add(Investigacion(
            codigo=f'INV-{uuid4().hex}', cuenta_id=cuenta.id, ocupacion_id=ocupacion.id,
            estado=EstadoInvestigacion.EN_CURSO, piensa_dia=textos[0], piensa_necesita=textos[1],
            piensa_duda=textos[2], creada_en=fecha))
        sesion.flush()
        return responder_con_eventos(sesion, cuenta, [(TipoEventoUso.INICIA_INVESTIGACION, ocupacion.id)], fecha)
    anteriores = (investigacion.ocupacion_id, investigacion.piensa_dia, investigacion.piensa_necesita,
                  investigacion.piensa_duda)
    if anteriores != (ocupacion.id, *textos):
        investigacion.ocupacion_id = ocupacion.id
        investigacion.piensa_dia, investigacion.piensa_necesita, investigacion.piensa_duda = textos
        investigacion.sugerencias_vigentes = False
        sesion.execute(delete(SugerenciaGuion).where(SugerenciaGuion.investigacion_id == investigacion.id,
                                                     SugerenciaGuion.estado == EstadoSugerenciaGuion.PENDIENTE))
        sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def guardar_guion(sesion: Session, entrada: GuardarGuionEntrada) -> RespuestaAccion:
    """Reemplaza las preguntas del guion. Las sugeridas citan una sugerencia pendiente (o ya agregada) de esta
    investigación, que pasa a AGREGADA; las descartadas, una pendiente. `terminar` (al menos una pregunta propia o la
    duda, validado en la entrada) deja la guía lista; la primera vez registra TERMINA_GUION."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    investigacion = exigir_investigacion_activa(sesion, cuenta)
    fecha = fecha_accion(entrada)
    sugerencias = {s.codigo: s for s in sesion.scalars(select(SugerenciaGuion).where(
        SugerenciaGuion.investigacion_id == investigacion.id))}
    agregadas = [p.sugerencia for p in entrada.preguntas if p.sugerencia is not None]
    if any(codigo not in sugerencias or sugerencias[codigo].estado == EstadoSugerenciaGuion.DESCARTADA
           for codigo in agregadas):
        raise ErrorAccion('Esa sugerencia no está disponible en tu guion', estado_http=404)
    if any(codigo not in sugerencias or sugerencias[codigo].estado != EstadoSugerenciaGuion.PENDIENTE
           for codigo in entrada.descartadas):
        raise ErrorAccion('Esa sugerencia no está disponible en tu guion', estado_http=404)
    sesion.execute(delete(PreguntaGuion).where(PreguntaGuion.investigacion_id == investigacion.id))
    sesion.add_all(PreguntaGuion(investigacion_id=investigacion.id, posicion=posicion, origen=p.origen, texto=p.texto)
                   for posicion, p in enumerate(entrada.preguntas, start=1))
    for codigo in agregadas:
        sugerencias[codigo].estado = EstadoSugerenciaGuion.AGREGADA
    for codigo in entrada.descartadas:
        sugerencias[codigo].estado = EstadoSugerenciaGuion.DESCARTADA
    eventos = []
    if entrada.terminar:
        if investigacion.guia_lista_en is None:
            investigacion.guia_lista_en = fecha
            eventos.append((TipoEventoUso.TERMINA_GUION, investigacion.ocupacion_id))
        investigacion.estado = EstadoInvestigacion.GUIA_LISTA
    elif investigacion.estado == EstadoInvestigacion.GUIA_LISTA and not any(
            p.origen != OrigenPreguntaGuion.SUGERIDA for p in entrada.preguntas):
        raise ErrorAccion('Tu guion necesita al menos una pregunta tuya', estado_http=422)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, eventos, fecha)


@usar_contexto
def cancelar_investigacion(sesion: Session, entrada: CancelarInvestigacionEntrada) -> RespuestaAccion:
    """Borra la investigación activa con su guion y sus sugerencias; sus eventos quedan."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    investigacion = exigir_investigacion_activa(sesion, cuenta)
    for modelo in (PreguntaGuion, SugerenciaGuion):
        sesion.execute(delete(modelo).where(modelo.investigacion_id == investigacion.id))
    sesion.delete(investigacion)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))


# --- Publicación --------------------------------------------------------------------------------

def _coautores(sesion: Session, autor: Cuenta, codigos: list[str], ocupacion_id: int) -> list[tuple[Cuenta, Investigacion]]:
    """Compañeros del salón del autor con guía lista sobre la misma ocupación (404 si no existen; 409 si no cumplen)."""
    por_codigo = {c.codigo: c for c in sesion.scalars(select(Cuenta).where(Cuenta.codigo.in_(codigos)))}
    if any(codigo not in por_codigo for codigo in codigos):
        raise ErrorAccion('Cuenta o referencia no encontrada', estado_http=404)
    activas = {i.cuenta_id: i for i in sesion.scalars(select(Investigacion).where(
        Investigacion.cuenta_id.in_([c.id for c in por_codigo.values()]),
        Investigacion.estado == EstadoInvestigacion.GUIA_LISTA))}
    resultado = []
    for codigo in codigos:
        cuenta = por_codigo[codigo]
        investigacion = activas.get(cuenta.id)
        if (cuenta.id == autor.id or cuenta.rol != Rol.ESTUDIANTE or cuenta.salon_id != autor.salon_id
                or investigacion is None or investigacion.ocupacion_id != ocupacion_id):
            raise ErrorAccion(f'{cuenta.nombre} no tiene una guía lista sobre esta ocupación en tu salón')
        resultado.append((cuenta, investigacion))
    return resultado


def _busqueda(sesion: Session, entrevista: Entrevista) -> str:
    titulo = sesion.scalar(select(Ocupacion.titulo).where(Ocupacion.id == entrevista.ocupacion_id))
    return sin_tildes(f'{entrevista.titulo} {entrevista.profesional} {titulo}')


def _sumar_autores(sesion: Session, entrevista: Entrevista, autores: list[tuple[Cuenta, Investigacion]]) -> None:
    """Los autores quedan en la entrevista y su investigación pasa a publicada."""
    if not autores:
        return
    # En lote: el número de consultas no crece con los coautores.
    sesion.execute(insert(EntrevistaAutor.__table__), [dict(entrevista_id=entrevista.id, cuenta_id=cuenta.id)
                                                       for cuenta, _ in autores])
    sesion.execute(update(Investigacion).where(Investigacion.id.in_([i.id for _, i in autores])).values(
        estado=EstadoInvestigacion.PUBLICADA, entrevista_id=entrevista.id).execution_options(
        synchronize_session='fetch'))


@usar_contexto
def publicar_entrevista(sesion: Session, entrada: PublicarEntrevistaEntrada) -> RespuestaAgrupada:
    """Publica la investigación con guía lista de la cuenta y la de cada coautor; PUBLICA_ENTREVISTA en cada uno."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    propia = exigir_investigacion_activa(sesion, cuenta)
    if propia.estado != EstadoInvestigacion.GUIA_LISTA:
        raise ErrorAccion('Termina tu guion antes de publicar tu entrevista')
    autores = [(cuenta, propia), *_coautores(sesion, cuenta, entrada.coautores, propia.ocupacion_id)]
    fecha = fecha_accion(entrada)
    entrevista = Entrevista(codigo=f'ENT-{uuid4().hex}', ocupacion_id=propia.ocupacion_id, titulo=entrada.titulo,
                            profesional=entrada.profesional, duracion=entrada.duracion, enlace=entrada.enlace,
                            resumen=entrada.resumen, busqueda='', estado=EstadoEntrevista.PUBLICADA, fecha_hora=fecha)
    entrevista.busqueda = _busqueda(sesion, entrevista)
    sesion.add(entrevista)
    sesion.flush()
    _sumar_autores(sesion, entrevista, autores)
    return responder_varias_cuentas(sesion, [c for c, _ in autores], {
        c.id: [(TipoEventoUso.PUBLICA_ENTREVISTA, entrevista.id)] for c, _ in autores}, fecha)


def entrevista_propia(sesion: Session, cuenta: Cuenta, codigo: str) -> Entrevista:
    """Una entrevista publicada de la que la cuenta es autora; si no, 404."""
    entrevista = sesion.scalar(select(Entrevista).where(
        Entrevista.codigo == codigo, Entrevista.estado == EstadoEntrevista.PUBLICADA, de_autor(cuenta.id)))
    if entrevista is None:
        raise ErrorAccion('Entrevista no encontrada', estado_http=404)
    return entrevista


@usar_contexto
def editar_entrevista(sesion: Session, entrada: EditarEntrevistaEntrada) -> RespuestaAgrupada:
    """Cualquier autor cambia la ficha (también el enlace) y suma coautores, que publican con ella."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    entrevista = entrevista_propia(sesion, cuenta, entrada.entrevista)
    nuevos = _coautores(sesion, cuenta, entrada.coautores_nuevos, entrevista.ocupacion_id)
    fecha = fecha_accion(entrada)
    entrevista.titulo, entrevista.profesional, entrevista.duracion = entrada.titulo, entrada.profesional, entrada.duracion
    entrevista.enlace, entrevista.resumen, entrevista.editada_en = entrada.enlace, entrada.resumen, fecha
    entrevista.busqueda = _busqueda(sesion, entrevista)
    sesion.flush()
    _sumar_autores(sesion, entrevista, nuevos)
    eventos = {cuenta.id: [(TipoEventoUso.EDITA_ENTREVISTA, entrevista.id)]}
    eventos.update({c.id: [(TipoEventoUso.PUBLICA_ENTREVISTA, entrevista.id)] for c, _ in nuevos})
    return responder_varias_cuentas(sesion, [cuenta, *(c for c, _ in nuevos)], eventos, fecha)


@usar_contexto
def retirar_entrevista(sesion: Session, entrada: EntrevistaEntrada) -> RespuestaAccion:
    """Cualquier autor la oculta para todos; deja de ser Leyenda. Reacciones y favoritos quedan en la base."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    entrevista = entrevista_propia(sesion, cuenta, entrada.entrevista)
    entrevista.estado, entrevista.leyenda_en = EstadoEntrevista.RETIRADA, None
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))


@usar_contexto
def ver_entrevista(sesion: Session, entrada: EntrevistaEntrada) -> RespuestaAccion:
    """Abrir el detalle: VISTA_ENTREVISTA solo la primera vez (alimenta «Nueva» y «No vistas»)."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    entrevista = entrevista_visible(sesion, cuenta, entrada.entrevista)
    visto = existe_evento(sesion, cuenta, TipoEventoUso.VISTA_ENTREVISTA, entrevista.id)
    return responder_con_eventos(sesion, cuenta, [] if visto else [(TipoEventoUso.VISTA_ENTREVISTA, entrevista.id)],
                                 fecha_accion(entrada))


# --- Favoritos y Leyenda ------------------------------------------------------------------------

def entrevista_para_favorito(sesion: Session, cuenta: Cuenta, codigo: str) -> Entrevista:
    """La entrevista que el estudiante ve (404 si no), siempre que no sea autor (409)."""
    exigir_seccion_investigaciones(sesion, cuenta)
    entrevista = entrevista_visible(sesion, cuenta, codigo)
    if sesion.scalar(select(EntrevistaAutor.cuenta_id).where(EntrevistaAutor.entrevista_id == entrevista.id,
                                                             EntrevistaAutor.cuenta_id == cuenta.id)) is not None:
        raise ErrorAccion('No puedes marcar como favorita tu propia entrevista')
    return entrevista


def evaluar_leyenda(sesion: Session, entrevista: Entrevista, fecha) -> None:
    """Destacada y con FAVORITOS_LEYENDA favoritos de estudiantes, la entrevista pasa a Leyenda y cada autor recibe
    ENTREVISTA_LEYENDA. Una vez Leyenda, solo la pierde al quitar el destacado o al retirarla o eliminarla."""
    if (entrevista.leyenda_en is not None or entrevista.destacada_en is None
            or entrevista.estado != EstadoEntrevista.PUBLICADA
            or contar_favoritos(sesion, [entrevista.id]).get(entrevista.id, 0) < FAVORITOS_LEYENDA):
        return
    entrevista.leyenda_en = fecha
    sesion.flush()
    for autor in sesion.scalars(select(Cuenta).join(EntrevistaAutor, EntrevistaAutor.cuenta_id == Cuenta.id).where(
            EntrevistaAutor.entrevista_id == entrevista.id).order_by(Cuenta.codigo)):
        registrar_eventos(sesion, autor, [(TipoEventoUso.ENTREVISTA_LEYENDA, entrevista.id)], fecha)


# --- Reacciones y reportes ----------------------------------------------------------------------

def es_autor(sesion: Session, cuenta: Cuenta, entrevista: Entrevista) -> bool:
    return sesion.scalar(select(EntrevistaAutor.cuenta_id).where(
        EntrevistaAutor.entrevista_id == entrevista.id, EntrevistaAutor.cuenta_id == cuenta.id)) is not None


@usar_contexto
def reaccionar(sesion: Session, entrada: ReaccionarEntrada) -> RespuestaAccion:
    """Crea o cambia la reacción del estudiante (una por entrevista; nunca en la propia). REACCIONA_ENTREVISTA solo
    la primera vez que reacciona a esa entrevista."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    entrevista = entrevista_visible(sesion, cuenta, entrada.entrevista)
    if es_autor(sesion, cuenta, entrevista):
        raise ErrorAccion('No puedes reaccionar a tu propia entrevista')
    tipo = contexto(sesion).definiciones.por_codigo(TipoReaccion, entrada.tipo)
    if tipo is None:
        raise ErrorAccion('Tipo de reacción desconocido', estado_http=422)
    if tipo.comentario_obligatorio and entrada.comentario is None:
        raise ErrorAccion(f'Cuéntanos: {tipo.pregunta}', estado_http=422)
    fecha = fecha_accion(entrada)
    actual = sesion.scalar(select(Reaccion).where(
        Reaccion.entrevista_id == entrevista.id, Reaccion.cuenta_id == cuenta.id,
        Reaccion.tipo_reaccion_id.is_not(None), Reaccion.eliminada_en.is_(None)))
    if actual is None:
        sesion.add(Reaccion(codigo=f'REA-{uuid4().hex}', entrevista_id=entrevista.id, cuenta_id=cuenta.id,
                            tipo_reaccion_id=tipo.id, comentario=entrada.comentario, creada_en=fecha))
    else:
        actual.tipo_reaccion_id, actual.comentario, actual.editada_en = tipo.id, entrada.comentario, fecha
    sesion.flush()
    primera = not existe_evento(sesion, cuenta, TipoEventoUso.REACCIONA_ENTREVISTA, entrevista.id)
    return responder_con_eventos(sesion, cuenta, [(TipoEventoUso.REACCIONA_ENTREVISTA, entrevista.id)] if primera
                                 else [], fecha)


def resolver_reportes(sesion: Session, *, entrevista_id: int | None = None, reacciones=()) -> None:
    """Los reportes pendientes de un contenido eliminado quedan RESUELTOS."""
    condiciones = []
    if entrevista_id is not None:
        condiciones.append(Reporte.entrevista_id == entrevista_id)
    if reacciones:
        condiciones.append(Reporte.reaccion_id.in_(list(reacciones)))
    if condiciones:
        sesion.execute(update(Reporte).where(Reporte.estado == EstadoReporte.PENDIENTE, or_(*condiciones))
                       .values(estado=EstadoReporte.RESUELTO).execution_options(synchronize_session=False))


def exigir_orientadora(sesion: Session, codigo: str) -> tuple[Cuenta, list[int]]:
    """La cuenta orientadora y sus salones; cualquier otra cuenta responde 404."""
    cuenta = buscar_por_codigo(sesion, Cuenta, codigo)
    if cuenta.rol != Rol.ORIENTADORA:
        raise ErrorAccion('Cuenta o referencia no encontrada', estado_http=404)
    return cuenta, salones_de_orientadora(sesion, cuenta)


@usar_contexto
def eliminar_reaccion(sesion: Session, entrada: ReaccionEntrada) -> RespuestaAccion:
    """El estudiante borra la suya; la orientadora, cualquier reacción o comentario de sus salones. Los reportes
    pendientes de lo borrado quedan resueltos."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    reaccion = sesion.scalar(select(Reaccion).where(Reaccion.codigo == entrada.reaccion,
                                                    Reaccion.eliminada_en.is_(None)))
    if cuenta.rol == Rol.ORIENTADORA:
        salones = salones_de_orientadora(sesion, cuenta)
        entrevista = None if reaccion is None else sesion.get(Entrevista, reaccion.entrevista_id)
        if entrevista is None:
            raise ErrorAccion('Reacción no encontrada', estado_http=404)
        entrevista_de_sus_salones(sesion, salones, entrevista.codigo)
    else:
        cuenta = cuenta_estudiante(sesion, entrada.cuenta)
        if reaccion is None or reaccion.cuenta_id != cuenta.id:
            raise ErrorAccion('Reacción no encontrada', estado_http=404)
    fecha = fecha_accion(entrada)
    reaccion.eliminada_en = fecha
    resolver_reportes(sesion, reacciones=[reaccion.id])
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def reportar(sesion: Session, entrada: ReportarEntrada) -> RespuestaAccion:
    """Un reporte por persona y contenido, sobre lo que el estudiante ve y no es suyo. Los comentarios de la
    orientadora no se reportan."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    if entrada.entrevista is not None:
        entrevista = entrevista_visible(sesion, cuenta, entrada.entrevista)
        if es_autor(sesion, cuenta, entrevista):
            raise ErrorAccion('No puedes reportar tu propia entrevista')
        contenido = dict(entrevista_id=entrevista.id)
    else:
        reaccion = sesion.scalar(select(Reaccion).where(Reaccion.codigo == entrada.reaccion,
                                                        Reaccion.eliminada_en.is_(None)))
        if reaccion is None:
            raise ErrorAccion('Reacción no encontrada', estado_http=404)
        entrevista_visible(sesion, cuenta, sesion.get(Entrevista, reaccion.entrevista_id).codigo)
        if reaccion.tipo_reaccion_id is None:
            raise ErrorAccion('Los comentarios de la orientadora no se reportan')
        if reaccion.cuenta_id == cuenta.id:
            raise ErrorAccion('No puedes reportar tu propia reacción')
        contenido = dict(reaccion_id=reaccion.id)
    columna, valor = next(iter(contenido.items()))
    if sesion.scalar(select(Reporte.id).where(Reporte.cuenta_id == cuenta.id,
                                              getattr(Reporte, columna) == valor)) is not None:
        raise ErrorAccion('Ya reportaste este contenido')
    fecha = fecha_accion(entrada)
    sesion.add(Reporte(codigo=f'REP-{uuid4().hex}', cuenta_id=cuenta.id, motivo=entrada.motivo,
                       detalle=entrada.detalle, estado=EstadoReporte.PENDIENTE, fecha_hora=fecha, **contenido))
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)
