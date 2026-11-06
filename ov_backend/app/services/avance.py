"""Avance del panel del estudiante (ajuste del panel, F05): camino por tramos y Ciudad, con total fijo.

El universo sale de las definiciones cargadas, nunca de lo visible o desbloqueado: terminar las requeridas no
es llegar al 100 %. El tramo actual cuenta solo las requeridas de su bloque. LUMI y PORTAL_FAMILIA no cuentan.
La familia usa otro avance (`familia.avance_ruta`, solo requeridas).
"""

from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import Actividad, Audiencia, Bloque, Cuenta, Espacio, EstadoProgreso, Rol
from app.schemas.avance import AvanceEstudiante, ConteoAvance, ConteoRequeridas, Tramo, TramoActual
from app.services.tematicas import porcentaje


def _completadas(sesion: Session, cuenta: Cuenta) -> set[int]:
    return {actividad_id for actividad_id, progreso in contexto(sesion).progresos_de(cuenta.id).items()
            if progreso.estado == EstadoProgreso.COMPLETADA}


def _por_espacio(sesion: Session, espacio: Espacio) -> list[tuple[Bloque, Actividad]]:
    definiciones = contexto(sesion).definiciones
    filas = [(definiciones.obtener(Bloque, actividad.bloque_id), actividad)
             for actividad in definiciones.listar(Actividad)]
    return [(bloque, actividad) for bloque, actividad in filas
            if bloque.espacio == espacio and bloque.audiencia == Audiencia.ESTUDIANTE]


def _conteo(actividades: list[Actividad], completadas: set[int]) -> ConteoAvance:
    hechas = sum(actividad.id in completadas for actividad in actividades)
    return ConteoAvance(completadas=hechas, total=len(actividades), porcentaje=porcentaje(hechas, len(actividades)))


def avance_ciudad(sesion: Session, cuenta: Cuenta) -> ConteoAvance:
    """Todas las de la Ciudad (requeridas, opcionales y adicionales). Su porcentaje es la afinidad de `/logros`."""
    return _conteo([actividad for _, actividad in _por_espacio(sesion, Espacio.CIUDAD)], _completadas(sesion, cuenta))


@usar_contexto
def avance_estudiante(sesion: Session, cuenta: Cuenta) -> AvanceEstudiante:
    if cuenta.rol != Rol.ESTUDIANTE:
        raise ErrorAccion("El avance solo corresponde a estudiantes", estado_http=404)
    completadas = _completadas(sesion, cuenta)
    camino = _por_espacio(sesion, Espacio.MISIONES_CAMPO)
    tramo_actual = None
    tramos = []
    for bloque in sorted({bloque.id: bloque for bloque, _ in camino}.values(), key=lambda bloque: bloque.numero):
        requeridas = [actividad for b, actividad in camino if b.id == bloque.id and actividad.requerida]
        hechas = sum(actividad.id in completadas for actividad in requeridas)
        estado = "COMPLETO" if hechas == len(requeridas) else "PENDIENTE" if tramo_actual else "ACTUAL"
        if estado == "ACTUAL":
            tramo_actual = TramoActual(codigo=bloque.codigo, nombre=bloque.nombre, numero=bloque.numero,
                                       completadas=hechas, total=len(requeridas))
        tramos.append(Tramo(codigo=bloque.codigo, nombre=bloque.nombre, numero=bloque.numero,
                            completadas=hechas, total=len(requeridas), estado=estado))
    return AvanceEstudiante(
        camino=_conteo([actividad for _, actividad in camino], completadas),
        tramo_actual=tramo_actual,
        camino_completo=tramo_actual is None,
        ciudad=avance_ciudad(sesion, cuenta),
        tramos=tramos,
        requeridas=ConteoRequeridas(completadas=sum(tramo.completadas for tramo in tramos),
                                    total=sum(tramo.total for tramo in tramos)),
    )
