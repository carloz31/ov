"""Ruta del apoderado: su avance, su diploma, el avance de su hijo y los resultados que puede ver (B12)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Aplicacion, Bloque, Cuenta, EstadoProgreso, EventoUso, Instrumento, ResultadoInstrumento, Rol,
    SalonInstrumento, TipoEventoUso, VinculoFamiliar,
)
from app.schemas.cuentas import NivelActual
from app.schemas.familia import AvanceRuta, Diploma, EstudianteVinculado, FamiliaApoderado
from app.schemas.instrumentos import ResultadoPublico
from app.services.instrumentos.consultas import representar_resultado
from app.services.motor.reglas import nivel_actual
from app.services.tematicas import porcentaje


def _bloques(sesion: Session, cuenta: Cuenta) -> list:
    return [bloque for bloque in contexto(sesion).definiciones.listar(Bloque) if bloque.audiencia == cuenta.rol.value]


@usar_contexto
def avance_ruta(sesion: Session, cuenta: Cuenta) -> AvanceRuta:
    """Requeridas completadas de los bloques de la audiencia de la cuenta; las opcionales no cuentan."""
    datos = contexto(sesion)
    bloques = {bloque.id for bloque in _bloques(sesion, cuenta)}
    requeridas = {actividad.id for actividad in datos.definiciones.listar(Actividad)
                  if actividad.bloque_id in bloques and actividad.requerida}
    completadas = sum(1 for actividad_id, progreso in datos.progresos_de(cuenta.id).items()
                      if actividad_id in requeridas and progreso.estado == EstadoProgreso.COMPLETADA)
    return AvanceRuta(completadas=completadas, total=len(requeridas), porcentaje=porcentaje(completadas, len(requeridas)))


def _diploma(sesion: Session, cuenta: Cuenta) -> Diploma:
    """Se obtiene al completar todos los bloques de su ruta; la fecha es la del último COMPLETA_BLOQUE."""
    bloques = [bloque.id for bloque in _bloques(sesion, cuenta)]
    completos, ultima = sesion.execute(select(
        func.count(func.distinct(EventoUso.id_referencia)), func.max(EventoUso.fecha_hora),
    ).where(EventoUso.cuenta_id == cuenta.id, EventoUso.tipo == TipoEventoUso.COMPLETA_BLOQUE,
            EventoUso.id_referencia.in_(bloques))).one()
    obtenido = bool(bloques) and completos == len(bloques)
    return Diploma(obtenido=obtenido, obtenido_en=ultima if obtenido else None)


def _exigir_apoderado(cuenta: Cuenta) -> None:
    if cuenta.rol != Rol.APODERADO:
        raise ErrorAccion("La ruta familiar no corresponde a esta cuenta", estado_http=404)


def _hijo(sesion: Session, cuenta: Cuenta) -> Cuenta | None:
    return sesion.scalar(select(Cuenta).join(VinculoFamiliar, VinculoFamiliar.estudiante_id == Cuenta.id).where(
        VinculoFamiliar.apoderado_id == cuenta.id, VinculoFamiliar.es_activo.is_(True),
    ).order_by(VinculoFamiliar.codigo).limit(1))


@usar_contexto
def consultar_familia(sesion: Session, cuenta: Cuenta) -> FamiliaApoderado:
    _exigir_apoderado(cuenta)
    hijo = _hijo(sesion, cuenta)
    estudiante = None
    if hijo is not None:
        nivel = nivel_actual(sesion, hijo)
        estudiante = EstudianteVinculado(
            codigo=hijo.codigo, nombre=hijo.nombre, avance=avance_ruta(sesion, hijo),
            nivel_actual=None if nivel is None else NivelActual(numero=nivel.numero, titulo=nivel.titulo, descripcion=nivel.descripcion))
    return FamiliaApoderado(avance=avance_ruta(sesion, cuenta), diploma=_diploma(sesion, cuenta), estudiante=estudiante)


@usar_contexto
def resultados_hijo(sesion: Session, cuenta: Cuenta) -> list[ResultadoPublico]:
    """Resultados vigentes del hijo en los cuestionarios visibles al apoderado en su salón; solo con la ruta completa."""
    _exigir_apoderado(cuenta)
    if not _diploma(sesion, cuenta).obtenido:
        raise ErrorAccion("Completa tus actividades para ver los resultados de tu hijo")
    hijo = _hijo(sesion, cuenta)
    if hijo is None:
        raise ErrorAccion("La cuenta no pertenece a un vínculo familiar")
    definiciones = contexto(sesion).definiciones
    visibles = {fila.instrumento_id for fila in definiciones.listar(SalonInstrumento)
                if fila.salon_id == hijo.salon_id and fila.visible_apoderado}
    aplicaciones = {aplicacion.id: aplicacion for aplicacion in definiciones.listar(Aplicacion)
                    if aplicacion.instrumento_id in visibles}
    if not aplicaciones:
        return []
    resultados = sesion.scalars(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == hijo.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)))

    def orden(resultado):
        aplicacion = aplicaciones[resultado.aplicacion_id]
        return definiciones.obtener(Instrumento, aplicacion.instrumento_id).codigo, aplicacion.codigo

    return [representar_resultado(sesion, resultado) for resultado in sorted(resultados, key=orden)]
