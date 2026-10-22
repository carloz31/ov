import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Cuenta, Ficha, PreguntaBatalla, ProgresoActividad, ResultadoBatalla, Rol, TipoActividad, TipoObjetivo,
)
from app.schemas.batallas import BatallaCuenta, FichaPregunta, IntentoBatalla, OpcionPregunta, PreguntaIntento
from app.schemas.comun import ContenidoEstado
from app.services.actividades import estado_actividad
from app.services.comun import buscar_por_codigo, exigir_disponible
from app.services.motor.reglas import objetivo_disponible

# Azar de los intentos; el exportador de fixtures y las pruebas fijan su semilla.
azar = random.Random()


@usar_contexto
def listar_batallas_cuenta(sesion: Session, cuenta: Cuenta) -> list[BatallaCuenta]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    definiciones = contexto(sesion).definiciones
    batallas = sorted((a for a in definiciones.listar(Actividad) if a.tipo == TipoActividad.BATALLA),
                      key=lambda actividad: (actividad.orden, actividad.codigo))
    intentos = {}
    for actividad_id, intento in sesion.execute(
        select(ProgresoActividad.actividad_id, ResultadoBatalla)
        .join(ProgresoActividad, ProgresoActividad.id == ResultadoBatalla.progreso_id)
        .where(ProgresoActividad.cuenta_id == cuenta.id)
        .order_by(ResultadoBatalla.fecha_hora, ResultadoBatalla.id),
    ):
        intentos.setdefault(actividad_id, []).append(intento)
    # Las fichas de cada batalla, sin repetir, en el orden de su primera pregunta.
    fichas = {}
    for actividad_id, ficha_id in sesion.execute(
        select(PreguntaBatalla.actividad_id, PreguntaBatalla.ficha_id).order_by(PreguntaBatalla.codigo)):
        propias = fichas.setdefault(actividad_id, [])
        if ficha_id not in propias:
            propias.append(ficha_id)
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
            preguntas_por_intento=actividad.preguntas_por_intento,
            fichas=[_estado_ficha(sesion, cuenta, definiciones.obtener(Ficha, ficha_id))
                    for ficha_id in fichas.get(actividad.id, [])],
        ))
    return respuesta


def _estado_ficha(sesion: Session, cuenta: Cuenta, ficha: Ficha) -> ContenidoEstado:
    disponible = objetivo_disponible(sesion, cuenta, TipoObjetivo.FICHA, ficha.id)
    return ContenidoEstado(codigo=ficha.codigo, titulo=ficha.titulo, estado="DISPONIBLE" if disponible else "BLOQUEADA")


@usar_contexto
def preguntas_intento(sesion: Session, cuenta: Cuenta, codigo: str) -> list[PreguntaIntento]:
    """Las preguntas de un intento: al azar dentro del pool, con las opciones mezcladas. No escribe nada."""
    actividad = buscar_por_codigo(sesion, Actividad, codigo)
    if actividad.tipo != TipoActividad.BATALLA:
        raise ErrorAccion("Cuenta o referencia no encontrada", estado_http=404)
    exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    pool = list(sesion.scalars(select(PreguntaBatalla).where(PreguntaBatalla.actividad_id == actividad.id)
                               .order_by(PreguntaBatalla.codigo)))
    definiciones = contexto(sesion).definiciones
    elegidas = azar.sample(pool, min(actividad.preguntas_por_intento, len(pool)))
    respuesta = []
    for pregunta in elegidas:
        opciones = [OpcionPregunta(indice=indice, texto=texto) for indice, texto in enumerate(pregunta.opciones)]
        azar.shuffle(opciones)
        ficha = definiciones.obtener(Ficha, pregunta.ficha_id)
        respuesta.append(PreguntaIntento(
            codigo=pregunta.codigo, enunciado=pregunta.enunciado, opciones=opciones, correcta=pregunta.correcta,
            explicacion=pregunta.explicacion, ficha=FichaPregunta(codigo=ficha.codigo, titulo=ficha.titulo)))
    return respuesta
