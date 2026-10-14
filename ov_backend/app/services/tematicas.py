"""Avance por temática (HU-075): actividades completadas del estudiante sobre las de cada temática."""

from collections import Counter

from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import DECIMALES_PORCENTAJE, FACTOR_PORCENTAJE
from app.models import Actividad, ActividadTematica, Audiencia, Bloque, Cuenta, EstadoProgreso, Rol, Tematica
from app.schemas.tematicas import AvanceTematica


def porcentaje(parte: int, total: int) -> float:
    return round(min(parte, total) * FACTOR_PORCENTAJE / total, DECIMALES_PORCENTAJE) if total else 0.0


@usar_contexto
def avance_tematicas(sesion: Session, cuenta: Cuenta) -> list[AvanceTematica]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    datos = contexto(sesion)
    definiciones = datos.definiciones
    del_estudiante = {actividad.id for actividad in definiciones.listar(Actividad)
                      if definiciones.obtener(Bloque, actividad.bloque_id).audiencia == Audiencia.ESTUDIANTE}
    completadas = {actividad_id for actividad_id, progreso in datos.progresos_de(cuenta.id).items()
                   if progreso.estado == EstadoProgreso.COMPLETADA}
    filas = [fila for fila in definiciones.listar(ActividadTematica) if fila.actividad_id in del_estudiante]
    totales = Counter(fila.tematica_id for fila in filas)
    hechas = Counter(fila.tematica_id for fila in filas if fila.actividad_id in completadas)
    return [AvanceTematica(codigo=tematica.codigo, nombre=tematica.nombre, completadas=hechas[tematica.id],
                           total=totales[tematica.id], porcentaje=porcentaje(hechas[tematica.id], totales[tematica.id]))
            for tematica in sorted(definiciones.listar(Tematica), key=lambda tematica: (tematica.orden, tematica.codigo))]
