from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Actividad, ActividadDimension, ColeccionOcupacion, Cuenta, Dimension, Ocupacion, ProgresoActividad,
    ResultadoCaso, Rol, TipoActividad,
)
from app.schemas.casos import CasoCuenta, OcupacionColeccion
from app.services.actividades import estado_actividad


@usar_contexto
def listar_casos_cuenta(sesion: Session, cuenta: Cuenta) -> list[CasoCuenta]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    definiciones = contexto(sesion).definiciones
    casos = sorted((a for a in definiciones.listar(Actividad) if a.tipo == TipoActividad.CASO),
                   key=lambda actividad: (actividad.orden, actividad.codigo))
    dimensiones = {}
    for fila in definiciones.listar(ActividadDimension):
        dimensiones.setdefault(fila.actividad_id, []).append(definiciones.obtener(Dimension, fila.dimension_id))
    puntajes = {}
    for actividad_id, puntaje in sesion.execute(
        select(ProgresoActividad.actividad_id, ResultadoCaso.puntaje)
        .join(ProgresoActividad, ProgresoActividad.id == ResultadoCaso.progreso_id)
        .where(ProgresoActividad.cuenta_id == cuenta.id)
        .order_by(ResultadoCaso.fecha_hora, ResultadoCaso.id),
    ):
        puntajes.setdefault(actividad_id, []).append(puntaje)
    respuesta = []
    for caso in casos:
        propios = puntajes.get(caso.id, [])
        respuesta.append(CasoCuenta(
            actividad=caso.codigo, titulo=caso.titulo,
            dimensiones=[d.codigo for d in sorted(dimensiones.get(caso.id, []), key=lambda d: (d.orden, d.codigo))],
            estado=estado_actividad(sesion, cuenta, caso), intentos=len(propios),
            superado=any(puntaje >= caso.puntaje_minimo for puntaje in propios),
            ultimo_puntaje=propios[-1] if propios else None, mejor_puntaje=max(propios, default=None),
            puntaje_minimo=caso.puntaje_minimo, puntaje_maximo=caso.puntaje_maximo,
        ))
    return respuesta


@usar_contexto
def listar_coleccion_cuenta(sesion: Session, cuenta: Cuenta) -> list[OcupacionColeccion]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    definiciones = contexto(sesion).definiciones
    return [OcupacionColeccion(ocupacion=ocupacion.codigo, titulo=ocupacion.titulo,
                               caso=definiciones.obtener(Actividad, fila.actividad_id).codigo,
                               obtenida_en=fila.obtenida_en)
            for fila, ocupacion in sesion.execute(
                select(ColeccionOcupacion, Ocupacion)
                .join(Ocupacion, Ocupacion.id == ColeccionOcupacion.ocupacion_id)
                .where(ColeccionOcupacion.cuenta_id == cuenta.id)
                .order_by(ColeccionOcupacion.obtenida_en, Ocupacion.codigo))]
