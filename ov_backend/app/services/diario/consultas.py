"""Consultas del diario y del check-in (B09). Solo devuelven datos de la cuenta del path; nunca escriben."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import TOPE_ENTRADAS_AMISTAD_DIA, UMBRALES_AMISTAD
from app.models import (
    CheckIn, Cuenta, EntradaDiario, EventoUso, PreguntaDiario, Recomendacion, Rol, TipoEventoUso,
    TipoObjetivo, TipoRecomendacion, UsoPreguntaDiario,
)
from app.schemas.diario import (
    AmistadAsistente, CheckInRegistrado, CheckInsCuenta, EntradaDiarioPublica, PreguntaDiarioEstado,
)
from app.services.motor.reglas import objetivo_disponible
from app.services.secciones import exigir_seccion


@usar_contexto
def listar_preguntas_cuenta(sesion: Session, cuenta: Cuenta) -> list[PreguntaDiarioEstado]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    exigir_seccion(sesion, cuenta, "DIARIO")
    recomendaciones = {fila.pregunta_diario_id: fila for fila in sesion.execute(select(
        Recomendacion.pregunta_diario_id, Recomendacion.texto, EntradaDiario.id.label('entrada_id')).outerjoin(
        EntradaDiario, EntradaDiario.recomendacion_id == Recomendacion.id).where(
        Recomendacion.cuenta_id == cuenta.id, Recomendacion.tipo == TipoRecomendacion.DESBLOQUEADA))}
    preguntas = sorted((pregunta for pregunta in contexto(sesion).definiciones.listar(PreguntaDiario)
                        if pregunta.uso == UsoPreguntaDiario.DESBLOQUEABLE), key=lambda pregunta: pregunta.codigo)
    estados = []
    for pregunta in preguntas:
        recomendacion = recomendaciones.get(pregunta.id)
        estados.append(PreguntaDiarioEstado(
            codigo=pregunta.codigo, nombre=pregunta.nombre, personalizada=pregunta.personalizada,
            estado="DISPONIBLE" if objetivo_disponible(sesion, cuenta, TipoObjetivo.PREGUNTA_DIARIO,
                                                       pregunta.id) else "BLOQUEADA",
            redactada=recomendacion is not None and recomendacion.texto is not None,
            respondida=recomendacion is not None and recomendacion.entrada_id is not None,
        ))
    return estados


def titulo_mostrado(titulo: str | None, pregunta: str | None, numero_libre: int | None) -> str:
    if titulo:
        return titulo
    if pregunta is not None:
        return pregunta
    return f"Entrada libre {numero_libre}"


@usar_contexto
def listar_entradas(sesion: Session, cuenta: Cuenta) -> list[EntradaDiarioPublica]:
    """Las entradas de la propia cuenta, de la más reciente a la más antigua."""
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    exigir_seccion(sesion, cuenta, "DIARIO")
    filas = sesion.execute(select(EntradaDiario, Recomendacion.texto).outerjoin(
        Recomendacion, Recomendacion.id == EntradaDiario.recomendacion_id).where(
        EntradaDiario.cuenta_id == cuenta.id).order_by(EntradaDiario.fecha_hora.desc(), EntradaDiario.numero.desc()))
    return [EntradaDiarioPublica(
        numero=entrada.numero, origen=entrada.origen, titulo=entrada.titulo,
        titulo_mostrado=titulo_mostrado(entrada.titulo, pregunta, entrada.numero_libre),
        pregunta=pregunta, texto=entrada.texto, fecha_hora=entrada.fecha_hora, actualizada_en=entrada.actualizada_en,
    ) for entrada, pregunta in filas]


def amistad(puntos: int) -> AmistadAsistente:
    nivel = sum(puntos >= umbral for umbral in UMBRALES_AMISTAD)
    return AmistadAsistente(puntos=puntos, nivel=nivel,
                            siguiente_en=UMBRALES_AMISTAD[nivel] if nivel < len(UMBRALES_AMISTAD) else None)


@usar_contexto
def amistad_cuenta(sesion: Session, cuenta: Cuenta) -> AmistadAsistente:
    """Se cuenta sobre los eventos de escritura, no sobre las entradas: editar o borrar no la bajan."""
    if cuenta.rol != Rol.ESTUDIANTE:
        return amistad(0)
    exigir_seccion(sesion, cuenta, "DIARIO")
    por_dia = sesion.execute(select(func.count()).select_from(EventoUso).where(
        EventoUso.cuenta_id == cuenta.id, EventoUso.tipo == TipoEventoUso.ESCRIBE_ENTRADA_DIARIO).group_by(
        func.date(EventoUso.fecha_hora))).scalars()
    return amistad(sum(min(cantidad, TOPE_ENTRADAS_AMISTAD_DIA) for cantidad in por_dia))


@usar_contexto
def check_ins_cuenta(sesion: Session, cuenta: Cuenta, hoy: date) -> CheckInsCuenta:
    """`hoy`: fecha de Lima del servidor (F05), para que el front no decida qué día es."""
    if cuenta.rol != Rol.ESTUDIANTE:
        return CheckInsCuenta(dias_registrados=0, registrado_hoy=False, check_ins=[])
    exigir_seccion(sesion, cuenta, "CHECK_IN")
    filas = sesion.execute(select(CheckIn.fecha, CheckIn.nivel_seguridad).where(
        CheckIn.cuenta_id == cuenta.id).order_by(CheckIn.fecha)).all()
    return CheckInsCuenta(dias_registrados=len(filas), registrado_hoy=any(fecha == hoy for fecha, _ in filas), check_ins=[
        CheckInRegistrado(fecha=fecha, nivel_seguridad=nivel) for fecha, nivel in filas])

