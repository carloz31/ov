from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import Actividad, Cuenta, ProgresoActividad, ResultadoBatalla, Rol, TipoActividad
from app.schemas.batallas import BatallaCuenta, IntentoBatalla
from app.services.actividades import estado_actividad


@usar_contexto
def listar_batallas_cuenta(sesion: Session, cuenta: Cuenta) -> list[BatallaCuenta]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    batallas = sorted((a for a in contexto(sesion).definiciones.listar(Actividad) if a.tipo == TipoActividad.BATALLA),
                      key=lambda actividad: (actividad.orden, actividad.codigo))
    intentos = {}
    for actividad_id, intento in sesion.execute(
        select(ProgresoActividad.actividad_id, ResultadoBatalla)
        .join(ProgresoActividad, ProgresoActividad.id == ResultadoBatalla.progreso_id)
        .where(ProgresoActividad.cuenta_id == cuenta.id)
        .order_by(ResultadoBatalla.fecha_hora, ResultadoBatalla.id),
    ):
        intentos.setdefault(actividad_id, []).append(intento)
    respuesta = []
    for actividad in batallas:
        propios = intentos.get(actividad.id, [])
        primero = propios[0] if propios else None
        respuesta.append(BatallaCuenta(
            actividad=actividad.codigo, titulo=actividad.titulo, estado=estado_actividad(sesion, cuenta, actividad),
            intentos=len(propios), superada=any(intento.victoria for intento in propios),
            primer_intento=None if primero is None else IntentoBatalla(
                victoria=primero.victoria, aciertos=primero.aciertos, preguntas=primero.preguntas,
                fecha_hora=primero.fecha_hora),
        ))
    return respuesta
