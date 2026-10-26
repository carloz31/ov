"""Catálogo de carreras, ocupaciones e instituciones (B10): búsquedas, detalle y vistas.

Se lee de la base, no de la caché de definiciones: pocas consultas fijas por petición, con `selectinload`.
Los listados se paginan y pueden limitarse a los favoritos de la cuenta (F06).
Todo exige la sección CATALOGO abierta."""

import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import LIMITE_MAXIMO_CATALOGO
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, Cuenta, EventoUso, FamiliaCarrera, Favorito, IngresoCarrera, Institucion, Ocupacion, TipoEventoUso,
    TipoFavorito, TipoInstitucion, Ubicacion,
)
from app.models.base import sin_tildes
from app.schemas.acciones import (
    RespuestaAccion, VerCarreraEntrada, VerInstitucionEntrada, VerOcupacionEntrada,
)
from app.schemas.catalogo import (
    CarreraDetalle, CarreraResumen, FamiliaPublica, Inesperada, IngresoPublico, InstitucionDetalle,
    InstitucionResumen, OcupacionDetalle, OcupacionResumen, PaginaCarreras, PaginaInstituciones, PaginaOcupaciones,
    RangoIngresoPublico, UbicacionPublica,
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


def _solo_favoritos(cuenta: Cuenta, tipo: TipoFavorito, columna_id, activo: bool):
    """Con `favoritos`, solo los elementos de ese tipo que la cuenta marcó."""
    if not activo:
        return None
    return columna_id.in_(select(Favorito.id_referencia).where(Favorito.cuenta_id == cuenta.id,
                                                               Favorito.tipo == tipo))


def _pagina(limite: int, desde: int) -> None:
    """`limite` de 1 a LIMITE_MAXIMO_CATALOGO y `desde` no negativo; si no, 422."""
    if not 1 <= limite <= LIMITE_MAXIMO_CATALOGO:
        raise ErrorAccion(f'El límite va de 1 a {LIMITE_MAXIMO_CATALOGO}', estado_http=422)
    if desde < 0:
        raise ErrorAccion('desde no puede ser negativo', estado_http=422)


def _paginar(sesion: Session, consulta, orden, limite: int, desde: int) -> tuple[int, list]:
    """Total sin paginar (una consulta de conteo) y la página pedida, en el orden dado."""
    total = sesion.scalar(select(func.count()).select_from(consulta.subquery()))
    return total, list(sesion.scalars(consulta.order_by(orden).limit(limite).offset(desde)))


# --- Representaciones ------------------------------------------------------------------------

def _riasec(codigo: str | None) -> list[str]:
    return list(codigo or '')


def resumen_carrera(carrera: Carrera, favoritos: set) -> CarreraResumen:
    return CarreraResumen(codigo=carrera.codigo, nombre=carrera.nombre, riasec=_riasec(carrera.codigo_riasec),
                          familia=FamiliaPublica(codigo=carrera.familia.codigo, nombre=carrera.familia.nombre),
                          es_favorita=(TipoFavorito.CARRERA, carrera.id) in favoritos)


def resumen_ocupacion(ocupacion: Ocupacion, favoritos: set) -> OcupacionResumen:
    return OcupacionResumen(codigo=ocupacion.codigo, codigo_onet=ocupacion.codigo_onet, titulo=ocupacion.titulo,
                            riasec=_riasec(ocupacion.codigo_riasec),
                            es_favorita=(TipoFavorito.OCUPACION, ocupacion.id) in favoritos)


def resumen_institucion(institucion: Institucion, favoritos: set) -> InstitucionResumen:
    return InstitucionResumen(codigo=institucion.codigo, nombre=institucion.nombre, tipo=institucion.tipo,
                              gestion=institucion.gestion,
                              ubicacion=UbicacionPublica(codigo=institucion.ubicacion.codigo,
                                                         nombre=institucion.ubicacion.nombre),
                              es_favorita=(TipoFavorito.INSTITUCION, institucion.id) in favoritos)


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
                    riasec: str | None, solo_favoritos: bool, limite: int, desde: int) -> PaginaCarreras:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    letras = letras_riasec(riasec)
    consulta = select(Carrera).join(FamiliaCarrera, FamiliaCarrera.id == Carrera.familia_id).where(*_filtros(
        _contiene(Carrera.busqueda, buscar),
        None if familia is None else FamiliaCarrera.codigo == familia,
        None if letras is None else Carrera.codigo_riasec.like(f'%{letras}%'),
        _solo_favoritos(cuenta, TipoFavorito.CARRERA, Carrera.id, solo_favoritos),
    ))
    total, carreras = _paginar(sesion, consulta.options(selectinload(Carrera.familia)), Carrera.codigo, limite, desde)
    return PaginaCarreras(total=total, items=[resumen_carrera(carrera, favoritos) for carrera in carreras])


@usar_contexto
def detalle_carrera(sesion: Session, cuenta: Cuenta, codigo: str) -> CarreraDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    carrera = sesion.scalar(select(Carrera).where(Carrera.codigo == codigo).options(
        selectinload(Carrera.familia), selectinload(Carrera.ocupaciones),
        selectinload(Carrera.instituciones).selectinload(Institucion.ubicacion),
        selectinload(Carrera.ingreso).selectinload(IngresoCarrera.rangos)))
    if carrera is None:
        raise _no_encontrado('Carrera')
    return CarreraDetalle(
        **resumen_carrera(carrera, favoritos).model_dump(), descripcion=carrera.descripcion,
        duracion=carrera.duracion, ingreso=_ingreso(carrera.ingreso),
        ocupaciones=[resumen_ocupacion(o, favoritos) for o in carrera.ocupaciones if o.codigo is not None],
        instituciones=[resumen_institucion(i, favoritos) for i in carrera.instituciones])


@usar_contexto
def buscar_ocupaciones(sesion: Session, cuenta: Cuenta, buscar: str | None, riasec: str | None,
                       solo_favoritos: bool, limite: int, desde: int) -> PaginaOcupaciones:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    letras = letras_riasec(riasec)
    consulta = select(Ocupacion).where(Ocupacion.codigo.is_not(None), *_filtros(
        _contiene(Ocupacion.busqueda, buscar),
        None if letras is None else Ocupacion.codigo_riasec.like(f'%{letras}%'),
        _solo_favoritos(cuenta, TipoFavorito.OCUPACION, Ocupacion.id, solo_favoritos),
    ))
    total, ocupaciones = _paginar(sesion, consulta, Ocupacion.codigo, limite, desde)
    return PaginaOcupaciones(total=total, items=[resumen_ocupacion(o, favoritos) for o in ocupaciones])


@usar_contexto
def detalle_ocupacion(sesion: Session, cuenta: Cuenta, codigo: str) -> OcupacionDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    ocupacion = sesion.scalar(select(Ocupacion).where(Ocupacion.codigo == codigo).options(
        selectinload(Ocupacion.carreras).selectinload(Carrera.familia)))
    if ocupacion is None:
        raise _no_encontrado('Ocupación')
    return OcupacionDetalle(
        **resumen_ocupacion(ocupacion, favoritos).model_dump(), descripcion=ocupacion.descripcion,
        lugares_trabajo=ocupacion.lugares_trabajo, conocimientos=ocupacion.conocimientos,
        habilidades=ocupacion.habilidades, carreras=[resumen_carrera(c, favoritos) for c in ocupacion.carreras])


@usar_contexto
def buscar_instituciones(sesion: Session, cuenta: Cuenta, buscar: str | None, tipo: str | None,
                         ubicacion: str | None, solo_favoritos: bool, limite: int,
                         desde: int) -> PaginaInstituciones:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    if tipo is not None and tipo not in TipoInstitucion.__members__:
        raise ErrorAccion(f'Tipo de institución inválido; se espera uno de: {", ".join(TipoInstitucion)}',
                          estado_http=422)
    consulta = select(Institucion).join(Ubicacion, Ubicacion.id == Institucion.ubicacion_id).where(*_filtros(
        _contiene(Institucion.busqueda, buscar),
        None if tipo is None else Institucion.tipo == TipoInstitucion(tipo),
        None if ubicacion is None else Ubicacion.codigo == ubicacion,
        _solo_favoritos(cuenta, TipoFavorito.INSTITUCION, Institucion.id, solo_favoritos),
    ))
    total, instituciones = _paginar(sesion, consulta.options(selectinload(Institucion.ubicacion)),
                                    Institucion.codigo, limite, desde)
    return PaginaInstituciones(total=total, items=[resumen_institucion(i, favoritos) for i in instituciones])


@usar_contexto
def detalle_institucion(sesion: Session, cuenta: Cuenta, codigo: str) -> InstitucionDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    institucion = sesion.scalar(select(Institucion).where(Institucion.codigo == codigo).options(
        selectinload(Institucion.ubicacion), selectinload(Institucion.carreras).selectinload(Carrera.familia)))
    if institucion is None:
        raise _no_encontrado('Institución')
    return InstitucionDetalle(
        **resumen_institucion(institucion, favoritos).model_dump(), descripcion=institucion.descripcion,
        pagina_web=institucion.pagina_web, carreras=[resumen_carrera(c, favoritos) for c in institucion.carreras])


# --- Opciones de los filtros (F06) ----------------------------------------------------------

@usar_contexto
def listar_familias(sesion: Session, cuenta: Cuenta) -> list[FamiliaPublica]:
    exigir_catalogo(sesion, cuenta)
    familias = sesion.scalars(select(FamiliaCarrera).order_by(FamiliaCarrera.nombre, FamiliaCarrera.codigo))
    return [FamiliaPublica(codigo=f.codigo, nombre=f.nombre) for f in familias]


@usar_contexto
def listar_ubicaciones(sesion: Session, cuenta: Cuenta) -> list[UbicacionPublica]:
    exigir_catalogo(sesion, cuenta)
    ubicaciones = sesion.scalars(select(Ubicacion).order_by(Ubicacion.nombre, Ubicacion.codigo))
    return [UbicacionPublica(codigo=u.codigo, nombre=u.nombre) for u in ubicaciones]


# --- Lugar inesperado (HU-042, F06) ---------------------------------------------------------

def _inesperada(sesion: Session, cuenta: Cuenta, modelo, evento: TipoEventoUso, excluir: str | None) -> Inesperada:
    """Al azar entre lo que la cuenta no ha visto, sin el actual; si ya vio todo, uno distinto del actual."""
    exigir_catalogo(sesion, cuenta)
    candidatos = sesion.execute(select(modelo.id, modelo.codigo).where(modelo.codigo.is_not(None), *_filtros(
        None if excluir is None else modelo.codigo != excluir))).all()
    vistos = set(sesion.scalars(select(EventoUso.id_referencia).where(
        EventoUso.cuenta_id == cuenta.id, EventoUso.tipo == evento, EventoUso.id_referencia.is_not(None))))
    sin_ver = [codigo for id_, codigo in candidatos if id_ not in vistos]
    if sin_ver:
        return Inesperada(codigo=random.choice(sin_ver), revisitando=False)
    if not candidatos:
        return Inesperada(codigo=None, revisitando=False)
    return Inesperada(codigo=random.choice([codigo for _, codigo in candidatos]), revisitando=True)


@usar_contexto
def carrera_inesperada(sesion: Session, cuenta: Cuenta, excluir: str | None) -> Inesperada:
    return _inesperada(sesion, cuenta, Carrera, TipoEventoUso.VISTA_CARRERA, excluir)


@usar_contexto
def ocupacion_inesperada(sesion: Session, cuenta: Cuenta, excluir: str | None) -> Inesperada:
    return _inesperada(sesion, cuenta, Ocupacion, TipoEventoUso.VISTA_OCUPACION, excluir)


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
