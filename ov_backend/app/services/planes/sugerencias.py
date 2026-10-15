"""Pasos sugeridos para las dudas y complicaciones nuevas de una tarjeta (B11 · HU-101).

Se generan solo al guardar CONOCIMIENTO o REALIDAD con novedades, una vez por duda o complicación; reabrir o
volver a guardar no las regenera. Sin modelo, cada novedad recibe un paso de respaldo."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models import EstadoSugerencia, OrigenSugerencia, SugerenciaTarjeta, TarjetaCarrera
from app.services.planes.consultas import opcion_por_codigo, texto_opcion


TIPO_RESPALDO_DUDA = 'investigar'
TIPO_RESPALDO_COMPLICACION = 'otra'


def siguiente_numero(tarjeta: TarjetaCarrera, secuencia: str) -> int:
    """El siguiente número de la secuencia de la tarjeta (duda, complicacion, sugerencia o paso); nunca se reutiliza."""
    atributo = f'ultimo_numero_{secuencia}'
    setattr(tarjeta, atributo, getattr(tarjeta, atributo) + 1)
    return getattr(tarjeta, atributo)


def texto_complicacion(sesion: Session, complicacion) -> str:
    return complicacion.texto_otro or texto_opcion(sesion, complicacion.opcion_id)


def _sugerencia(sesion, tarjeta, fecha, tipo, texto, generada_por, *, duda=None, complicacion=None):
    return SugerenciaTarjeta(
        tarjeta_id=tarjeta.id, numero=siguiente_numero(tarjeta, 'sugerencia'),
        duda_id=None if duda is None else duda.id, complicacion_id=None if complicacion is None else complicacion.id,
        tipo_opcion_id=opcion_por_codigo(sesion, 'PASOS', tipo).id, texto=texto, estado=EstadoSugerencia.PENDIENTE,
        generada_por=generada_por, creada_en=fecha)


def respaldo_duda(sesion: Session, tarjeta, duda, fecha: datetime) -> SugerenciaTarjeta:
    return _sugerencia(sesion, tarjeta, fecha, TIPO_RESPALDO_DUDA, f'Averiguar: {duda.texto}',
                       OrigenSugerencia.RESPALDO, duda=duda)


def respaldo_complicacion(sesion: Session, tarjeta, complicacion, fecha: datetime) -> SugerenciaTarjeta:
    return _sugerencia(sesion, tarjeta, fecha, TIPO_RESPALDO_COMPLICACION,
                       f'Ver qué puedo hacer con: {texto_complicacion(sesion, complicacion)}',
                       OrigenSugerencia.RESPALDO, complicacion=complicacion)


def generar_sugerencias(sesion: Session, tarjeta, carrera, *, dudas=(), complicaciones=(),
                        fecha: datetime) -> None:
    """Agrega las sugerencias de las dudas o complicaciones nuevas de un guardado (ya insertadas)."""
    if not dudas and not complicaciones:
        return
    sesion.add_all([*(respaldo_duda(sesion, tarjeta, d, fecha) for d in dudas),
                    *(respaldo_complicacion(sesion, tarjeta, c, fecha) for c in complicaciones)])
