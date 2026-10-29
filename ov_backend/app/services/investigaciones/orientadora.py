"""Lo que hace la orientadora con las publicaciones de sus salones (B13 · HU-062 y HU-064, spec §4): tabla, detalle,
destacar, comentar y moderar. No reacciona ni marca favoritos."""

from uuid import uuid4

from sqlalchemy import case, exists, func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import FAVORITOS_LEYENDA
from app.exceptions import ErrorAccion
from app.models import (
    Cuenta, Entrevista, EntrevistaAutor, EstadoEntrevista, EstadoReporte, Investigacion, Reaccion, Reporte, Salon,
    TipoEventoUso, TipoReaccion,
)
from app.schemas.acciones import RespuestaAccion
from app.schemas.investigaciones import (
    AutorModerado, AutorPublicacion, ComentarEntrada, DestacarEntrada, EntrevistaEntrada, FilaPublicacion,
    LoQuePienso, PaginaPublicaciones, PublicacionDetalle, ReaccionModerada, ReporteEntrada, ReportePublico,
)
from app.services.comun import buscar_por_codigo, fecha_accion, responder_con_eventos
from app.services.investigaciones.acciones import evaluar_leyenda, exigir_orientadora, resolver_reportes
from app.services.investigaciones.consultas import (
    autores_de, contar_favoritos, contiene, de_autor_en_salones, entrevista_de_sus_salones, ocupaciones_breves,
    personas, reacciones_por_tipo, tipos_reaccion,
)
from app.services.motor.reglas import registrar_eventos


ESTADOS = ('SIN_DESTACAR', 'DESTACADA', 'LEYENDA')


# --- Acciones -----------------------------------------------------------------------------------

@usar_contexto
def destacar_entrevista(sesion: Session, entrada: DestacarEntrada) -> RespuestaAccion:
    """Destacar registra ENTREVISTA_DESTACADA en cada autor y evalúa la Leyenda; quitar el destacado la quita."""
    cuenta, salones = exigir_orientadora(sesion, entrada.cuenta)
    entrevista = entrevista_de_sus_salones(sesion, salones, entrada.entrevista)
    fecha = fecha_accion(entrada)
    if entrada.destacada and entrevista.destacada_en is None:
        entrevista.destacada_en, entrevista.destacada_por = fecha, cuenta.id
        sesion.flush()
        for autor in sesion.scalars(select(Cuenta).join(EntrevistaAutor, EntrevistaAutor.cuenta_id == Cuenta.id)
                                    .where(EntrevistaAutor.entrevista_id == entrevista.id).order_by(Cuenta.codigo)):
            registrar_eventos(sesion, autor, [(TipoEventoUso.ENTREVISTA_DESTACADA, entrevista.id)], fecha)
        evaluar_leyenda(sesion, entrevista, fecha)
    elif not entrada.destacada:
        entrevista.destacada_en = entrevista.destacada_por = entrevista.leyenda_en = None
        sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def comentar_entrevista(sesion: Session, entrada: ComentarEntrada) -> RespuestaAccion:
    cuenta, salones = exigir_orientadora(sesion, entrada.cuenta)
    entrevista = entrevista_de_sus_salones(sesion, salones, entrada.entrevista)
    fecha = fecha_accion(entrada)
    if entrada.reaccion is None:
        sesion.add(Reaccion(codigo=f'REA-{uuid4().hex}', entrevista_id=entrevista.id, cuenta_id=cuenta.id,
                            comentario=entrada.texto, creada_en=fecha))
    else:
        comentario = sesion.scalar(select(Reaccion).where(
            Reaccion.codigo == entrada.reaccion, Reaccion.entrevista_id == entrevista.id,
            Reaccion.cuenta_id == cuenta.id, Reaccion.eliminada_en.is_(None)))
        if comentario is None:
            raise ErrorAccion('Comentario no encontrado', estado_http=404)
        comentario.comentario, comentario.editada_en = entrada.texto, fecha
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def eliminar_entrevista(sesion: Session, entrada: EntrevistaEntrada) -> RespuestaAccion:
    """La oculta para todos (deja de ser Leyenda) y resuelve los reportes de ella y de sus reacciones."""
    cuenta, salones = exigir_orientadora(sesion, entrada.cuenta)
    entrevista = entrevista_de_sus_salones(sesion, salones, entrada.entrevista)
    entrevista.estado, entrevista.leyenda_en = EstadoEntrevista.ELIMINADA, None
    reacciones = sesion.scalars(select(Reaccion.id).where(Reaccion.entrevista_id == entrevista.id)).all()
    resolver_reportes(sesion, entrevista_id=entrevista.id, reacciones=reacciones)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))


@usar_contexto
def descartar_reporte(sesion: Session, entrada: ReporteEntrada) -> RespuestaAccion:
    """Cierra el reporte sin tocar el contenido ni avisar a quien reportó."""
    cuenta, salones = exigir_orientadora(sesion, entrada.cuenta)
    reporte = sesion.scalar(select(Reporte).where(Reporte.codigo == entrada.reporte,
                                                  Reporte.estado == EstadoReporte.PENDIENTE))
    if reporte is None:
        raise ErrorAccion('Reporte no encontrado', estado_http=404)
    entrevista_id = reporte.entrevista_id or sesion.scalar(select(Reaccion.entrevista_id).where(
        Reaccion.id == reporte.reaccion_id))
    entrevista = sesion.get(Entrevista, entrevista_id)
    entrevista_de_sus_salones(sesion, salones, entrevista.codigo)
    reporte.estado = EstadoReporte.DESCARTADO
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))


# --- Consultas ----------------------------------------------------------------------------------

def _estado(entrevista: Entrevista) -> str:
    if entrevista.leyenda_en is not None:
        return 'LEYENDA'
    return 'SIN_DESTACAR' if entrevista.destacada_en is None else 'DESTACADA'


def _pendientes_de_reacciones():
    return exists().where(Reporte.reaccion_id == Reaccion.id, Reporte.estado == EstadoReporte.PENDIENTE,
                          Reaccion.entrevista_id == Entrevista.id, Reaccion.eliminada_en.is_(None))


def _pendientes_de_entrevista():
    return exists().where(Reporte.entrevista_id == Entrevista.id, Reporte.estado == EstadoReporte.PENDIENTE)


def _autores_con_salon(sesion: Session, ids) -> dict[int, list[AutorPublicacion]]:
    autores = autores_de(sesion, ids)
    salones = dict(sesion.execute(select(Salon.id, Salon.codigo)).all())
    return {entrevista_id: [AutorPublicacion(codigo=c.codigo, nombre=c.nombre, salon=salones.get(c.salon_id))
                            for c in cuentas] for entrevista_id, cuentas in autores.items()}


@usar_contexto
def listar_publicaciones(sesion: Session, codigo_cuenta: str, salon: str | None, estado: str | None,
                         con_reportes: bool, buscar: str | None, limite: int, desde: int) -> PaginaPublicaciones:
    """Las publicadas de sus salones, de la más reciente a la más antigua, y al final las Leyendas de otros salones
    (sin filtro de salón). `con_reportes`: con reportes pendientes en la entrevista o en sus reacciones."""
    _, salones = exigir_orientadora(sesion, codigo_cuenta)
    if estado is not None and estado not in ESTADOS:
        raise ErrorAccion('Estado desconocido', estado_http=422)
    propias = de_autor_en_salones(salones)
    if salon is None:
        alcance = propias | (Entrevista.leyenda_en.is_not(None))
    else:
        salon_id = sesion.scalar(select(Salon.id).where(Salon.codigo == salon))
        if salon_id not in salones:
            raise ErrorAccion('Salón no encontrado', estado_http=404)
        alcance = de_autor_en_salones([salon_id])
    condiciones = [Entrevista.estado == EstadoEntrevista.PUBLICADA, alcance]
    if estado == 'SIN_DESTACAR':
        condiciones.append(Entrevista.destacada_en.is_(None))
    elif estado == 'DESTACADA':
        condiciones += [Entrevista.destacada_en.is_not(None), Entrevista.leyenda_en.is_(None)]
    elif estado == 'LEYENDA':
        condiciones.append(Entrevista.leyenda_en.is_not(None))
    if con_reportes:
        condiciones.append(_pendientes_de_entrevista() | _pendientes_de_reacciones())
    texto = contiene(Entrevista.busqueda, buscar)
    if texto is not None:
        autor = select(EntrevistaAutor.entrevista_id).join(Cuenta, Cuenta.id == EntrevistaAutor.cuenta_id).where(
            contiene(func.lower(Cuenta.nombre), buscar))
        condiciones.append(texto | Entrevista.id.in_(autor))
    total = sesion.scalar(select(func.count()).select_from(Entrevista).where(*condiciones))
    de_sus_salones = case((propias, 0), else_=1)
    filas = list(sesion.execute(select(Entrevista, de_sus_salones).where(*condiciones).order_by(
        de_sus_salones, Entrevista.fecha_hora.desc(), Entrevista.id.desc()).limit(limite).offset(desde)).tuples())
    ids = [e.id for e, _ in filas]
    autores = _autores_con_salon(sesion, ids)
    ocupaciones = ocupaciones_breves(sesion, [e.ocupacion_id for e, _ in filas])
    reacciones = reacciones_por_tipo(sesion, ids)
    favoritos = contar_favoritos(sesion, ids)
    de_entrevista = dict(sesion.execute(select(Reporte.entrevista_id, func.count()).where(
        Reporte.entrevista_id.in_(ids), Reporte.estado == EstadoReporte.PENDIENTE).group_by(Reporte.entrevista_id)).all())
    de_reacciones = dict(sesion.execute(select(Reaccion.entrevista_id, func.count(func.distinct(Reaccion.id))).join(
        Reporte, Reporte.reaccion_id == Reaccion.id).where(
        Reaccion.entrevista_id.in_(ids), Reporte.estado == EstadoReporte.PENDIENTE, Reaccion.eliminada_en.is_(None))
        .group_by(Reaccion.entrevista_id)).all())
    return PaginaPublicaciones(total=total, favoritos_leyenda=FAVORITOS_LEYENDA, items=[FilaPublicacion(
        codigo=e.codigo, titulo=e.titulo, autores=autores.get(e.id, []), ocupacion=ocupaciones[e.ocupacion_id],
        fecha_hora=e.fecha_hora, reacciones=sum(reacciones.get(e.id, {}).values()), favoritos=favoritos.get(e.id, 0),
        estado=_estado(e), reportes_pendientes=de_entrevista.get(e.id, 0),
        comentarios_reportados=de_reacciones.get(e.id, 0), de_sus_salones=orden == 0) for e, orden in filas])


def _reportes(filas) -> list[ReportePublico]:
    return [ReportePublico(codigo=r.codigo, motivo=r.motivo, detalle=r.detalle, fecha_hora=r.fecha_hora) for r in filas]


@usar_contexto
def detalle_publicacion(sesion: Session, codigo_cuenta: str, codigo: str) -> PublicacionDetalle:
    """De sus salones, o una Leyenda de otro (solo lectura en la práctica: las acciones exigen sus salones)."""
    cuenta, salones = exigir_orientadora(sesion, codigo_cuenta)
    entrevista = sesion.scalar(select(Entrevista).where(
        Entrevista.codigo == codigo, Entrevista.estado == EstadoEntrevista.PUBLICADA,
        de_autor_en_salones(salones) | Entrevista.leyenda_en.is_not(None)))
    if entrevista is None:
        raise ErrorAccion('Entrevista no encontrada', estado_http=404)
    propia_de_salon = sesion.scalar(select(exists().where(
        Entrevista.id == entrevista.id, de_autor_en_salones(salones))))
    autores = _autores_con_salon(sesion, [entrevista.id]).get(entrevista.id, [])
    pensaban = {codigo_autor: LoQuePienso(dia=i.piensa_dia, necesita=i.piensa_necesita, duda=i.piensa_duda)
                for codigo_autor, i in sesion.execute(select(Cuenta.codigo, Investigacion).join(
                    Investigacion, Investigacion.cuenta_id == Cuenta.id).where(
                    Investigacion.entrevista_id == entrevista.id)).tuples()}
    for autor in autores:
        autor.lo_que_pensaba = pensaban.get(autor.codigo)
    filas = list(sesion.execute(select(Reaccion, Cuenta).join(Cuenta, Cuenta.id == Reaccion.cuenta_id).where(
        Reaccion.entrevista_id == entrevista.id, Reaccion.eliminada_en.is_(None))
        .order_by(Reaccion.creada_en.desc(), Reaccion.id.desc())).tuples())
    gente = personas(sesion, list({c.id: c for _, c in filas}.values()))
    pendientes = list(sesion.scalars(select(Reporte).where(
        Reporte.estado == EstadoReporte.PENDIENTE,
        (Reporte.entrevista_id == entrevista.id) | Reporte.reaccion_id.in_([r.id for r, _ in filas]))
        .order_by(Reporte.fecha_hora, Reporte.id)))
    por_reaccion = {}
    for reporte in pendientes:
        if reporte.reaccion_id is not None:
            por_reaccion.setdefault(reporte.reaccion_id, []).append(reporte)
    definiciones = contexto(sesion).definiciones
    codigos_salon = dict(sesion.execute(select(Salon.id, Salon.codigo)).all())
    reacciones = [ReaccionModerada(
        codigo=r.codigo, autor=AutorModerado(**gente[c.id].model_dump(), salon=codigos_salon.get(c.salon_id)),
        tipo=None if r.tipo_reaccion_id is None else definiciones.obtener(TipoReaccion, r.tipo_reaccion_id).codigo,
        comentario=r.comentario, creada_en=r.creada_en, editada_en=r.editada_en, propia=c.id == cuenta.id,
        reportes=_reportes(por_reaccion.get(r.id, []))) for r, c in filas]
    return PublicacionDetalle(
        codigo=entrevista.codigo, titulo=entrevista.titulo,
        ocupacion=ocupaciones_breves(sesion, [entrevista.ocupacion_id])[entrevista.ocupacion_id],
        profesional=entrevista.profesional, duracion=entrevista.duracion, enlace=entrevista.enlace,
        resumen=entrevista.resumen, fecha_hora=entrevista.fecha_hora, editada_en=entrevista.editada_en,
        estado=_estado(entrevista), de_sus_salones=propia_de_salon,
        favoritos=contar_favoritos(sesion, [entrevista.id]).get(entrevista.id, 0), favoritos_leyenda=FAVORITOS_LEYENDA,
        reacciones_por_tipo=reacciones_por_tipo(sesion, [entrevista.id]).get(entrevista.id, {}), autores=autores,
        reportes=_reportes(r for r in pendientes if r.entrevista_id is not None),
        reacciones=sorted(reacciones, key=lambda reaccion: not reaccion.reportes), tipos_reaccion=tipos_reaccion(sesion))
