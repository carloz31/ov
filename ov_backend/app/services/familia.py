"""Ruta del apoderado: su avance, su diploma, el avance de sus hijos y los resultados que puede ver (B12).

Ajuste inicio-apoderado: todos los hijos, cada uno con sus cuestionarios visibles y su estado.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import CIFRAS_CUENTA_DIPLOMA, PREFIJO_DIPLOMA
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Aplicacion, Bloque, Cuenta, EstadoProgreso, EventoUso, Instrumento, MomentoAplicacion,
    ResultadoInstrumento, Rol, SalonInstrumento, TipoEventoUso, VinculoFamiliar,
)
from app.schemas.cuentas import NivelActual
from app.schemas.familia import (
    AplicacionHijo, AvanceRuta, CuestionarioHijo, Diploma, EstudianteVinculado, FamiliaApoderado,
)
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
    if not obtenido:
        return Diploma(obtenido=False, obtenido_en=None, codigo=None)
    return Diploma(obtenido=True, obtenido_en=ultima, codigo=codigo_diploma(cuenta.id, ultima.year))


def codigo_diploma(cuenta_id: int, anio: int) -> str:
    """`EXP-AP-AAAA-NNNNN-D`: D es la suma de cada dígito de año y cuenta por su posición (1…), módulo 10."""
    numero = str(cuenta_id).zfill(CIFRAS_CUENTA_DIPLOMA)
    digitos = f"{anio:04d}{numero}"
    verificador = sum(int(digito) * posicion for posicion, digito in enumerate(digitos, start=1)) % 10
    return f"{PREFIJO_DIPLOMA}-{anio:04d}-{numero}-{verificador}"


def _exigir_apoderado(cuenta: Cuenta) -> None:
    if cuenta.rol != Rol.APODERADO:
        raise ErrorAccion("La ruta familiar no corresponde a esta cuenta", estado_http=404)


def _hijos(sesion: Session, cuenta: Cuenta) -> list[Cuenta]:
    """Los hijos de sus vínculos activos, por código de vínculo (el primero es el hijo por defecto)."""
    return list(sesion.scalars(select(Cuenta).join(VinculoFamiliar, VinculoFamiliar.estudiante_id == Cuenta.id).where(
        VinculoFamiliar.apoderado_id == cuenta.id, VinculoFamiliar.es_activo.is_(True),
    ).order_by(VinculoFamiliar.codigo)))


def _hijo(sesion: Session, cuenta: Cuenta, estudiante: str | None = None) -> Cuenta:
    """El hijo elegido (`estudiante`) o, sin él, el primero. Un hijo ajeno, 404; sin vínculo activo, 409."""
    hijos = _hijos(sesion, cuenta)
    if estudiante is not None:
        hijo = next((h for h in hijos if h.codigo == estudiante), None)
        if hijo is None:
            raise ErrorAccion("El estudiante no es su hijo", estado_http=404)
        return hijo
    if not hijos:
        raise ErrorAccion("La cuenta no pertenece a un vínculo familiar")
    return hijos[0]


def _aplicaciones_visibles(sesion: Session, salon_id: int | None) -> list[Aplicacion]:
    """Aplicaciones de los instrumentos visibles al apoderado en el salón, por código de instrumento y, dentro de él,
    por momento (la partida antes que la llegada) y código."""
    definiciones = contexto(sesion).definiciones
    visibles = {fila.instrumento_id for fila in definiciones.listar(SalonInstrumento)
                if fila.salon_id == salon_id and fila.visible_apoderado}
    aplicaciones = [a for a in definiciones.listar(Aplicacion) if a.instrumento_id in visibles]
    return sorted(aplicaciones, key=lambda a: (definiciones.obtener(Instrumento, a.instrumento_id).codigo,
                                              list(MomentoAplicacion).index(a.momento), a.codigo))


def _cuestionarios(sesion: Session, hijos: list[Cuenta]) -> dict[int, list[CuestionarioHijo]]:
    """Los cuestionarios visibles de cada hijo con la fecha de su resultado vigente por aplicación (una consulta)."""
    definiciones = contexto(sesion).definiciones
    por_hijo = {hijo.id: _aplicaciones_visibles(sesion, hijo.salon_id) for hijo in hijos}
    ids = {aplicacion.id for aplicaciones in por_hijo.values() for aplicacion in aplicaciones}
    fechas = {}
    if ids:
        fechas = {(cuenta_id, aplicacion_id): calculado for cuenta_id, aplicacion_id, calculado in sesion.execute(select(
            ResultadoInstrumento.cuenta_id, ResultadoInstrumento.aplicacion_id, ResultadoInstrumento.calculado_en,
        ).where(ResultadoInstrumento.cuenta_id.in_(por_hijo), ResultadoInstrumento.aplicacion_id.in_(ids),
                ResultadoInstrumento.anulado_en.is_(None)))}
    resultado = {}
    for hijo_id, aplicaciones in por_hijo.items():
        cuestionarios: dict[int, CuestionarioHijo] = {}
        for aplicacion in aplicaciones:
            if aplicacion.instrumento_id not in cuestionarios:
                instrumento = definiciones.obtener(Instrumento, aplicacion.instrumento_id)
                cuestionarios[aplicacion.instrumento_id] = CuestionarioHijo(
                    instrumento=instrumento.codigo, nombre=instrumento.nombre, aplicaciones=[])
            cuestionarios[aplicacion.instrumento_id].aplicaciones.append(AplicacionHijo(
                aplicacion=aplicacion.codigo, nombre=aplicacion.nombre, momento=aplicacion.momento,
                completado_en=fechas.get((hijo_id, aplicacion.id))))
        resultado[hijo_id] = list(cuestionarios.values())
    return resultado


def _estudiante(sesion: Session, hijo: Cuenta, cuestionarios: list[CuestionarioHijo]) -> EstudianteVinculado:
    nivel = nivel_actual(sesion, hijo)
    return EstudianteVinculado(
        codigo=hijo.codigo, nombre=hijo.nombre, avance=avance_ruta(sesion, hijo), cuestionarios=cuestionarios,
        nivel_actual=None if nivel is None else NivelActual(numero=nivel.numero, titulo=nivel.titulo,
                                                            descripcion=nivel.descripcion, cita_lumi=nivel.cita_lumi))


@usar_contexto
def consultar_familia(sesion: Session, cuenta: Cuenta) -> FamiliaApoderado:
    _exigir_apoderado(cuenta)
    hijos = _hijos(sesion, cuenta)
    cuestionarios = _cuestionarios(sesion, hijos)
    return FamiliaApoderado(avance=avance_ruta(sesion, cuenta), diploma=_diploma(sesion, cuenta),
                            estudiantes=[_estudiante(sesion, hijo, cuestionarios[hijo.id]) for hijo in hijos])


@usar_contexto
def resultados_hijo(sesion: Session, cuenta: Cuenta, estudiante: str | None = None) -> list[ResultadoPublico]:
    """Resultados vigentes del hijo (el elegido o el primero) en los cuestionarios visibles al apoderado en su salón;
    solo con la ruta completa."""
    _exigir_apoderado(cuenta)
    if not _diploma(sesion, cuenta).obtenido:
        raise ErrorAccion("Completa tus actividades para ver los resultados de tu hijo")
    hijo = _hijo(sesion, cuenta, estudiante)
    aplicaciones = {aplicacion.id: aplicacion for aplicacion in _aplicaciones_visibles(sesion, hijo.salon_id)}
    if not aplicaciones:
        return []
    resultados = sesion.scalars(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == hijo.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)))

    orden = list(aplicaciones)
    return [representar_resultado(sesion, resultado)
            for resultado in sorted(resultados, key=lambda r: orden.index(r.aplicacion_id))]
