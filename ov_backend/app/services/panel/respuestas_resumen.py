"""Registros del estudiante vistos por la orientadora (ajuste panel-estudiantes): qué registros cuentan (destacados del
colegio o, sin destacados, los requeridos del camino) y las etiquetas de sus respuestas. Lo usan la tarjeta «Sus
respuestas» del Resumen y la pestaña Respuestas."""

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto
from app.models import (
    Actividad, Cuenta, EstadoProgreso, EstadoRespuestaRegistro, ProgresoActividad, RespuestaRegistro, Salon,
    TipoActividad,
)
from app.schemas.panel_estudiante import RespuestasResumen

TIPOS_SIN_CONTENIDO = ("vacio", "fuera_de_tema")


def destacados_del_colegio(sesion: Session, colegio_id: int) -> list[int]:
    """Los registros que la orientadora eligió destacar para todo el colegio, en el orden de las actividades."""
    elegidos = contexto(sesion).actividades_destacadas(colegio_id)
    return [a.id for a in contexto(sesion).definiciones.listar(Actividad) if a.id in elegidos]


def registros_requeridos(sesion: Session) -> list[int]:
    return [a.id for a in contexto(sesion).definiciones.listar(Actividad)
            if a.tipo == TipoActividad.REGISTRO and a.requerida]


def etiquetas(respuesta: RespuestaRegistro) -> list[str]:
    """Las únicas etiquetas que ve la orientadora."""
    lista = []
    if respuesta.sensible:
        lista.append("REQUIERE_ATENCION")
    if respuesta.tipo_final in TIPOS_SIN_CONTENIDO:
        lista.append("SIN_CONTENIDO")
    if respuesta.estado == EstadoRespuestaRegistro.ABIERTO:
        lista.append("AUN_NO_LO_SABE")
    return lista


def respuestas_vigentes(sesion: Session, cuenta_id: int, actividades: list[int]) -> list[tuple[int, RespuestaRegistro]]:
    """(actividad, respuesta) del intento vigente de cada ítem."""
    if not actividades:
        return []
    return list(sesion.execute(select(ProgresoActividad.actividad_id, RespuestaRegistro).join(
        RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).where(
        ProgresoActividad.cuenta_id == cuenta_id, ProgresoActividad.actividad_id.in_(actividades),
        RespuestaRegistro.vigente)).tuples())


def resumen_respuestas(sesion: Session, estudiante: Cuenta, salon: Salon) -> RespuestasResumen:
    destacados = destacados_del_colegio(sesion, salon.colegio_id)
    actividades = destacados or registros_requeridos(sesion)
    completadas = set(sesion.scalars(select(ProgresoActividad.actividad_id).where(
        ProgresoActividad.cuenta_id == estudiante.id, ProgresoActividad.actividad_id.in_(actividades),
        ProgresoActividad.estado == EstadoProgreso.COMPLETADA))) if actividades else set()
    conteo = Counter(e for _, r in respuestas_vigentes(sesion, estudiante.id, actividades) for e in etiquetas(r))
    return RespuestasResumen(destacados=bool(destacados), completados=len(completadas), total=len(actividades),
                             requiere_atencion=conteo["REQUIERE_ATENCION"], sin_contenido=conteo["SIN_CONTENIDO"],
                             aun_no_lo_sabe=conteo["AUN_NO_LO_SABE"])
