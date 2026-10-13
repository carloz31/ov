"""Catálogo de carreras, ocupaciones e instituciones (B10): búsquedas, detalle y vistas.

Se lee de la base, no de la caché de definiciones: pocas consultas fijas por petición, con `selectinload`.
Todo exige la sección CATALOGO abierta."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, Cuenta, FamiliaCarrera, IngresoCarrera, Institucion, Ocupacion, TipoEventoUso, TipoInstitucion,
    Ubicacion,
)
from app.models.base import sin_tildes
from app.schemas.acciones import (
    RespuestaAccion, VerCarreraEntrada, VerInstitucionEntrada, VerOcupacionEntrada,
)
from app.schemas.catalogo import (
    CarreraDetalle, CarreraResumen, FamiliaPublica, IngresoPublico, InstitucionDetalle, InstitucionResumen,
    OcupacionDetalle, OcupacionResumen, RangoIngresoPublico, UbicacionPublica,
)
from app.services.comun import buscar_por_codigo, fecha_accion, responder_con_eventos
from app.services.secciones import exigir_seccion, seccion_de_cuenta


LETRAS_RIASEC = 'RIASEC'
SECCION = 'CATALOGO'


@usar_contexto
def exigir_catalogo(sesion: Session, cuenta: Cuenta) -> None:
    """404 si la sección no es de la audiencia de la cuenta; 409 con su mensaje si está cerrada."""
    try:
        seccion_de_cuenta(sesion, cuenta, SECCION)
    except LookupError as error:
        raise ErrorAccion(str(error), estado_http=404) from error
    exigir_seccion(sesion, cuenta, SECCION)


# --- Filtros ---------------------------------------------------------------------------------

def _contiene(columna, texto: str | None):
    """Subcadena sin mayúsculas ni tildes; `%`, `_` y `\\` se buscan literalmente."""
    normal = sin_tildes((texto or '').strip())
    if not normal:
        return None
    escapado = normal.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return columna.like(f'%{escapado}%', escape='\\')


def letras_riasec(valor: str | None) -> str | None:
    """1 a 3 letras RIASEC distintas, en mayúsculas; si no, 422."""
    if valor is None:
        return None
    letras = valor.strip().upper()
    if not 1 <= len(letras) <= 3 or any(l not in LETRAS_RIASEC for l in letras) or len(set(letras)) != len(letras):
        raise ErrorAccion('El filtro riasec admite de 1 a 3 letras RIASEC distintas', estado_http=422)
    return letras


def _filtros(*condiciones):
    return [condicion for condicion in condiciones if condicion is not None]


# --- Representaciones ------------------------------------------------------------------------

def _riasec(codigo: str | None) -> list[str]:
    return list(codigo or '')


def resumen_carrera(carrera: Carrera) -> CarreraResumen:
    return CarreraResumen(codigo=carrera.codigo, nombre=carrera.nombre, riasec=_riasec(carrera.codigo_riasec),
                          familia=FamiliaPublica(codigo=carrera.familia.codigo, nombre=carrera.familia.nombre))


def resumen_ocupacion(ocupacion: Ocupacion) -> OcupacionResumen:
    return OcupacionResumen(codigo=ocupacion.codigo, codigo_onet=ocupacion.codigo_onet, titulo=ocupacion.titulo,
                            riasec=_riasec(ocupacion.codigo_riasec))


def resumen_institucion(institucion: Institucion) -> InstitucionResumen:
    return InstitucionResumen(codigo=institucion.codigo, nombre=institucion.nombre, tipo=institucion.tipo,
                              ubicacion=UbicacionPublica(codigo=institucion.ubicacion.codigo,
                                                         nombre=institucion.ubicacion.nombre))


def _ingreso(ingreso: IngresoCarrera | None) -> IngresoPublico | None:
    if ingreso is None:
        return None
    return IngresoPublico(promedio_mensual=ingreso.promedio_mensual, fuente=ingreso.fuente, anio=ingreso.anio,
                          rangos=[RangoIngresoPublico(minimo=r.minimo, maximo=r.maximo, porcentaje=r.porcentaje)
                                  for r in ingreso.rangos])


def _no_encontrado(clase: str):
    return ErrorAccion(f'{clase} no encontrada en el catálogo', estado_http=404)


# --- Consultas -------------------------------------------------------------------------------

@usar_contexto
def buscar_carreras(sesion: Session, cuenta: Cuenta, buscar: str | None, familia: str | None,
                    riasec: str | None) -> list[CarreraResumen]:
    exigir_catalogo(sesion, cuenta)
    letras = letras_riasec(riasec)
    consulta = select(Carrera).join(FamiliaCarrera, FamiliaCarrera.id == Carrera.familia_id).where(*_filtros(
        _contiene(Carrera.busqueda, buscar),
        None if familia is None else FamiliaCarrera.codigo == familia,
        None if letras is None else Carrera.codigo_riasec.like(f'%{letras}%'),
    )).options(selectinload(Carrera.familia)).order_by(Carrera.codigo)
    return [resumen_carrera(carrera) for carrera in sesion.scalars(consulta)]


@usar_contexto
def detalle_carrera(sesion: Session, cuenta: Cuenta, codigo: str) -> CarreraDetalle:
    exigir_catalogo(sesion, cuenta)
    carrera = sesion.scalar(select(Carrera).where(Carrera.codigo == codigo).options(
        selectinload(Carrera.familia), selectinload(Carrera.ocupaciones),
        selectinload(Carrera.instituciones).selectinload(Institucion.ubicacion),
        selectinload(Carrera.ingreso).selectinload(IngresoCarrera.rangos)))
    if carrera is None:
        raise _no_encontrado('Carrera')
    return CarreraDetalle(
        **resumen_carrera(carrera).model_dump(), descripcion=carrera.descripcion, duracion=carrera.duracion,
        ocupaciones=[resumen_ocupacion(o) for o in carrera.ocupaciones if o.codigo is not None],
        instituciones=[resumen_institucion(i) for i in carrera.instituciones], ingreso=_ingreso(carrera.ingreso))


@usar_contexto
def buscar_ocupaciones(sesion: Session, cuenta: Cuenta, buscar: str | None,
                       riasec: str | None) -> list[OcupacionResumen]:
    exigir_catalogo(sesion, cuenta)
    letras = letras_riasec(riasec)
    consulta = select(Ocupacion).where(Ocupacion.codigo.is_not(None), *_filtros(
        _contiene(Ocupacion.busqueda, buscar),
        None if letras is None else Ocupacion.codigo_riasec.like(f'%{letras}%'),
    )).order_by(Ocupacion.codigo)
    return [resumen_ocupacion(ocupacion) for ocupacion in sesion.scalars(consulta)]


@usar_contexto
def detalle_ocupacion(sesion: Session, cuenta: Cuenta, codigo: str) -> OcupacionDetalle:
    exigir_catalogo(sesion, cuenta)
    ocupacion = sesion.scalar(select(Ocupacion).where(Ocupacion.codigo == codigo).options(
        selectinload(Ocupacion.carreras).selectinload(Carrera.familia)))
    if ocupacion is None:
        raise _no_encontrado('Ocupación')
    return OcupacionDetalle(
        **resumen_ocupacion(ocupacion).model_dump(), descripcion=ocupacion.descripcion,
        lugares_trabajo=ocupacion.lugares_trabajo, conocimientos=ocupacion.conocimientos,
        habilidades=ocupacion.habilidades, carreras=[resumen_carrera(c) for c in ocupacion.carreras])


@usar_contexto
def buscar_instituciones(sesion: Session, cuenta: Cuenta, buscar: str | None, tipo: str | None,
                         ubicacion: str | None) -> list[InstitucionResumen]:
    exigir_catalogo(sesion, cuenta)
    if tipo is not None and tipo not in TipoInstitucion.__members__:
        raise ErrorAccion(f'Tipo de institución inválido; se espera uno de: {", ".join(TipoInstitucion)}',
                          estado_http=422)
    consulta = select(Institucion).join(Ubicacion, Ubicacion.id == Institucion.ubicacion_id).where(*_filtros(
        _contiene(Institucion.busqueda, buscar),
        None if tipo is None else Institucion.tipo == TipoInstitucion(tipo),
        None if ubicacion is None else Ubicacion.codigo == ubicacion,
    )).options(selectinload(Institucion.ubicacion)).order_by(Institucion.codigo)
    return [resumen_institucion(institucion) for institucion in sesion.scalars(consulta)]


@usar_contexto
def detalle_institucion(sesion: Session, cuenta: Cuenta, codigo: str) -> InstitucionDetalle:
    exigir_catalogo(sesion, cuenta)
    institucion = sesion.scalar(select(Institucion).where(Institucion.codigo == codigo).options(
        selectinload(Institucion.ubicacion), selectinload(Institucion.carreras).selectinload(Carrera.familia)))
    if institucion is None:
        raise _no_encontrado('Institución')
    return InstitucionDetalle(
        **resumen_institucion(institucion).model_dump(), descripcion=institucion.descripcion,
        pagina_web=institucion.pagina_web, carreras=[resumen_carrera(c) for c in institucion.carreras])


# --- Vistas («qué exploré») ------------------------------------------------------------------

def _ver(sesion: Session, entrada, modelo, codigo: str, evento: TipoEventoUso) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    entidad = buscar_por_codigo(sesion, modelo, codigo)
    exigir_catalogo(sesion, cuenta)
    return responder_con_eventos(sesion, cuenta, [(evento, entidad.id)], fecha_accion(entrada))


@usar_contexto
def ver_carrera(sesion: Session, entrada: VerCarreraEntrada) -> RespuestaAccion:
    return _ver(sesion, entrada, Carrera, entrada.carrera, TipoEventoUso.VISTA_CARRERA)


@usar_contexto
def ver_ocupacion(sesion: Session, entrada: VerOcupacionEntrada) -> RespuestaAccion:
    return _ver(sesion, entrada, Ocupacion, entrada.ocupacion, TipoEventoUso.VISTA_OCUPACION)


@usar_contexto
def ver_institucion(sesion: Session, entrada: VerInstitucionEntrada) -> RespuestaAccion:
    return _ver(sesion, entrada, Institucion, entrada.institucion, TipoEventoUso.VISTA_INSTITUCION)
