"""Catálogo de carreras, ocupaciones e instituciones (B10): búsquedas, detalle y vistas.

Se lee de la base, no de la caché de definiciones: pocas consultas fijas por petición, con `selectinload`.
Los listados se paginan y pueden limitarse a los favoritos de la cuenta (F06).
Para el estudiante, todo exige la sección CATALOGO abierta. El apoderado y la orientadora lo leen sin sección y
sus vistas no se registran (ajuste catalogo-apoderado)."""

import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import FUENTE_INGRESOS, LIMITE_MAXIMO_CATALOGO, puntaje_ocupacion_porcentaje
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, Cuenta, Dimension, EstiloTrabajo, EventoUso, FamiliaCarrera, Favorito, GestionInstitucion,
    GrupoOcupacional, IngresoFamilia, IngresoInstitucion, Institucion, InstitucionCarrera, Ocupacion,
    PuntajeOcupacion, Rol, TipoEventoUso, TipoFavorito, TipoInstitucion, Ubicacion,
)
from app.models.base import sin_tildes
from app.schemas.acciones import (
    RespuestaAccion, VerCarreraEntrada, VerInstitucionEntrada, VerOcupacionEntrada,
)
from app.schemas.catalogo import (
    CarreraDetalle, CarreraEnInstitucion, CarreraResumen, CarrerasParecidas, EstiloPublico, FamiliaPublica,
    GrupoPublico, Inesperada, IngresoCarreraPublico, IngresoFamiliaPublico, InstitucionDetalle, InstitucionEnCarrera,
    InstitucionResumen, OcupacionDetalle, OcupacionResumen, PaginaCarreras, PaginaInstituciones, PaginaOcupaciones,
    Tramo, UbicacionPublica,
)
from app.services.comun import buscar_por_codigo, fecha_accion, responder_con_eventos
from app.services.secciones import exigir_seccion, seccion_de_cuenta


LETRAS_RIASEC = 'RIASEC'
SECCION = 'CATALOGO'


@usar_contexto
def exigir_catalogo(sesion: Session, cuenta: Cuenta) -> None:
    """404 si la sección no es de la audiencia de la cuenta; 409 con su mensaje si está cerrada. Una cuenta que no
    es de estudiante (apoderado, orientadora) lee el catálogo sin sección."""
    if cuenta.rol != Rol.ESTUDIANTE:
        return
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


def enumerado(clase, valor: str | None, filtro: str):
    """El valor de un filtro de enumerado; si no es uno de sus valores, 422."""
    if valor is None:
        return None
    if valor not in clase.__members__:
        raise ErrorAccion(f'Filtro {filtro} inválido; se espera uno de: {", ".join(clase)}', estado_http=422)
    return clase(valor)


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
    return total, list(sesion.scalars(consulta.order_by(*orden).limit(limite).offset(desde)))


def _total(sesion: Session, modelo) -> int:
    """Cuántos hay en todo el catálogo, sin filtros (la cabecera de cada listado)."""
    return sesion.scalar(select(func.count()).select_from(modelo))


# --- Representaciones ------------------------------------------------------------------------

def _riasec(codigo: str | None) -> list[str]:
    return list(codigo or '')


def familia_publica(familia: FamiliaCarrera) -> FamiliaPublica:
    return FamiliaPublica(codigo=familia.codigo, nombre=familia.nombre, area_codigo=familia.area_codigo,
                          area_nombre=familia.area_nombre)


def resumen_carrera(carrera: Carrera, favoritos: set) -> CarreraResumen:
    return CarreraResumen(codigo=carrera.codigo, nombre=carrera.nombre, tipo=carrera.tipo, duracion=carrera.duracion,
                          riasec=_riasec(carrera.codigo_riasec), familia=familia_publica(carrera.familia),
                          es_favorita=(TipoFavorito.CARRERA, carrera.id) in favoritos)


def resumen_ocupacion(ocupacion: Ocupacion, favoritos: set) -> OcupacionResumen:
    return OcupacionResumen(codigo=ocupacion.codigo, codigo_onet=ocupacion.codigo_onet, titulo=ocupacion.titulo,
                            resumen=ocupacion.resumen, grupo=ocupacion.grupo, riasec=_riasec(ocupacion.codigo_riasec),
                            es_favorita=(TipoFavorito.OCUPACION, ocupacion.id) in favoritos)


def resumen_institucion(institucion: Institucion, favoritos: set) -> InstitucionResumen:
    return InstitucionResumen(codigo=institucion.codigo, nombre=institucion.nombre, tipo=institucion.tipo,
                              gestion=institucion.gestion,
                              ubicacion=UbicacionPublica(codigo=institucion.ubicacion.codigo,
                                                         nombre=institucion.ubicacion.nombre),
                              distrito=institucion.distrito,
                              es_favorita=(TipoFavorito.INSTITUCION, institucion.id) in favoritos)


def _tramo(fila: IngresoInstitucion | None) -> Tramo | None:
    return None if fila is None else Tramo(promedio=fila.promedio, minimo=fila.minimo, maximo=fila.maximo)


def _ingreso_familia(fila: IngresoFamilia) -> IngresoFamiliaPublico:
    return IngresoFamiliaPublico(
        ubicacion=None if fila.ubicacion is None else UbicacionPublica(codigo=fila.ubicacion.codigo,
                                                                       nombre=fila.ubicacion.nombre),
        jovenes=Tramo(promedio=fila.promedio_jovenes, minimo=fila.minimo_jovenes, maximo=fila.maximo_jovenes),
        adultos=Tramo(promedio=fila.promedio_adultos, minimo=fila.minimo_adultos, maximo=fila.maximo_adultos))


def _ingreso(sesion: Session, carrera: Carrera) -> IngresoCarreraPublico | None:
    """Ingresos de la familia y el tipo de la carrera, en una consulta: el nacional y los departamentos por nombre.
    Sin fila nacional no hay ingreso."""
    filas = sesion.scalars(select(IngresoFamilia).where(
        IngresoFamilia.tipo == carrera.tipo, IngresoFamilia.familia_id == carrera.familia_id,
    ).options(selectinload(IngresoFamilia.ubicacion))).all()
    nacional = next((f for f in filas if f.ubicacion_id is None), None)
    if nacional is None:
        return None
    departamentos = sorted((f for f in filas if f.ubicacion is not None), key=lambda f: sin_tildes(f.ubicacion.nombre))
    return IngresoCarreraPublico(fuente=FUENTE_INGRESOS, nacional=_ingreso_familia(nacional),
                                 departamentos=[_ingreso_familia(f) for f in departamentos])


def _no_encontrado(clase: str):
    return ErrorAccion(f'{clase} no encontrada en el catálogo', estado_http=404)


# --- Consultas -------------------------------------------------------------------------------

@usar_contexto
def buscar_carreras(sesion: Session, cuenta: Cuenta, buscar: str | None, tipo: str | None, area: str | None,
                    familia: str | None, riasec: str | None, solo_favoritos: bool, limite: int,
                    desde: int) -> PaginaCarreras:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    letras = letras_riasec(riasec)
    tipo = enumerado(TipoInstitucion, tipo, 'tipo')
    consulta = select(Carrera).join(FamiliaCarrera, FamiliaCarrera.id == Carrera.familia_id).where(*_filtros(
        _contiene(Carrera.busqueda, buscar),
        None if tipo is None else Carrera.tipo == tipo,
        None if area is None else FamiliaCarrera.area_codigo == area,
        None if familia is None else FamiliaCarrera.codigo == familia,
        None if letras is None else Carrera.codigo_riasec.like(f'%{letras}%'),
        _solo_favoritos(cuenta, TipoFavorito.CARRERA, Carrera.id, solo_favoritos),
    ))
    total, carreras = _paginar(sesion, consulta.options(selectinload(Carrera.familia)),
                               (Carrera.busqueda, Carrera.codigo), limite, desde)
    return PaginaCarreras(total=total, total_dominio=_total(sesion, Carrera),
                          items=[resumen_carrera(carrera, favoritos) for carrera in carreras])


@usar_contexto
def detalle_carrera(sesion: Session, cuenta: Cuenta, codigo: str) -> CarreraDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    carrera = sesion.scalar(select(Carrera).where(Carrera.codigo == codigo).options(
        selectinload(Carrera.familia), selectinload(Carrera.ocupaciones),
        selectinload(Carrera.instituciones).selectinload(Institucion.ubicacion)))
    if carrera is None:
        raise _no_encontrado('Carrera')
    ingresos = {fila.institucion_id: fila for fila in sesion.scalars(select(IngresoInstitucion).where(
        IngresoInstitucion.familia_id == carrera.familia_id,
        IngresoInstitucion.institucion_id.in_(select(InstitucionCarrera.institucion_id).where(
            InstitucionCarrera.carrera_id == carrera.id))))}
    duraciones = dict(sesion.execute(select(
        InstitucionCarrera.institucion_id, InstitucionCarrera.duracion_ciclos).where(
        InstitucionCarrera.carrera_id == carrera.id)).all())
    return CarreraDetalle(
        **resumen_carrera(carrera, favoritos).model_dump(), descripcion=carrera.descripcion,
        nombre_cine=carrera.nombre_cine,
        ambito_laboral=(carrera.ambito_laboral or '').splitlines(), ingreso=_ingreso(sesion, carrera),
        ocupaciones=[resumen_ocupacion(o, favoritos) for o in carrera.ocupaciones],
        instituciones=[InstitucionEnCarrera(**resumen_institucion(i, favoritos).model_dump(),
                                            ingreso=_tramo(ingresos.get(i.id)),
                                            duracion_ciclos=duraciones.get(i.id))
                       for i in sorted(carrera.instituciones, key=lambda i: (i.busqueda, i.codigo))],
        parecidas=_parecidas(sesion, carrera, favoritos))


def _parecidas(sesion: Session, carrera: Carrera, favoritos: set) -> CarrerasParecidas:
    """Las otras carreras del mismo tipo y familia: cuántas son y las 3 primeras por nombre."""
    consulta = select(Carrera).where(Carrera.familia_id == carrera.familia_id, Carrera.tipo == carrera.tipo,
                                     Carrera.id != carrera.id)
    total, parecidas = _paginar(sesion, consulta.options(selectinload(Carrera.familia)),
                                (Carrera.busqueda, Carrera.codigo), 3, 0)
    return CarrerasParecidas(total=total, carreras=[resumen_carrera(c, favoritos) for c in parecidas])


@usar_contexto
def buscar_ocupaciones(sesion: Session, cuenta: Cuenta, buscar: str | None, grupo: str | None,
                       riasec: str | None, solo_favoritos: bool, limite: int, desde: int) -> PaginaOcupaciones:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    letras = letras_riasec(riasec)
    consulta = select(Ocupacion).where(*_filtros(
        _contiene(Ocupacion.busqueda, buscar),
        None if grupo is None else Ocupacion.grupo == grupo,
        None if letras is None else Ocupacion.codigo_riasec.like(f'%{letras}%'),
        _solo_favoritos(cuenta, TipoFavorito.OCUPACION, Ocupacion.id, solo_favoritos),
    ))
    total, ocupaciones = _paginar(sesion, consulta, (Ocupacion.busqueda, Ocupacion.codigo), limite, desde)
    return PaginaOcupaciones(total=total, total_dominio=_total(sesion, Ocupacion),
                             items=[resumen_ocupacion(o, favoritos) for o in ocupaciones])


@usar_contexto
def detalle_ocupacion(sesion: Session, cuenta: Cuenta, codigo: str) -> OcupacionDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    ocupacion = sesion.scalar(select(Ocupacion).where(Ocupacion.codigo == codigo).options(
        selectinload(Ocupacion.carreras).selectinload(Carrera.familia)))
    if ocupacion is None:
        raise _no_encontrado('Ocupación')
    puntajes = dict(sesion.execute(select(Dimension.codigo, PuntajeOcupacion.valor).join(
        PuntajeOcupacion, PuntajeOcupacion.dimension_id == Dimension.id).where(
        PuntajeOcupacion.ocupacion_id == ocupacion.id)).all())
    estilos = dict(sesion.execute(select(EstiloTrabajo.codigo, EstiloTrabajo.nombre).where(
        EstiloTrabajo.codigo.in_(ocupacion.estilos_trabajo))).all())
    return OcupacionDetalle(
        **resumen_ocupacion(ocupacion, favoritos).model_dump(), descripcion=ocupacion.descripcion,
        tambien_llamado=ocupacion.tambien_llamado, job_zone=ocupacion.job_zone, tareas=ocupacion.tareas,
        personalidad=ocupacion.personalidad, conocimientos=ocupacion.conocimientos, aptitudes=ocupacion.aptitudes,
        estilos_trabajo=[EstiloPublico(codigo=c, nombre=estilos[c]) for c in ocupacion.estilos_trabajo],
        puntajes={d: puntaje_ocupacion_porcentaje(puntajes[d]) for d in LETRAS_RIASEC if d in puntajes},
        carreras=[resumen_carrera(c, favoritos) for c in ocupacion.carreras])


@usar_contexto
def buscar_instituciones(sesion: Session, cuenta: Cuenta, buscar: str | None, tipo: str | None,
                         gestion: str | None, ubicacion: str | None, solo_favoritos: bool, limite: int,
                         desde: int) -> PaginaInstituciones:
    exigir_catalogo(sesion, cuenta)
    _pagina(limite, desde)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    tipo = enumerado(TipoInstitucion, tipo, 'tipo')
    gestion = enumerado(GestionInstitucion, gestion, 'gestion')
    consulta = select(Institucion).join(Ubicacion, Ubicacion.id == Institucion.ubicacion_id).where(*_filtros(
        _contiene(Institucion.busqueda, buscar),
        None if tipo is None else Institucion.tipo == tipo,
        None if gestion is None else Institucion.gestion == gestion,
        None if ubicacion is None else Ubicacion.codigo == ubicacion,
        _solo_favoritos(cuenta, TipoFavorito.INSTITUCION, Institucion.id, solo_favoritos),
    ))
    total, instituciones = _paginar(sesion, consulta.options(selectinload(Institucion.ubicacion)),
                                    (Institucion.busqueda, Institucion.codigo), limite, desde)
    return PaginaInstituciones(total=total, total_dominio=_total(sesion, Institucion),
                               items=[resumen_institucion(i, favoritos) for i in instituciones])


@usar_contexto
def detalle_institucion(sesion: Session, cuenta: Cuenta, codigo: str) -> InstitucionDetalle:
    exigir_catalogo(sesion, cuenta)
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    institucion = sesion.scalar(select(Institucion).where(Institucion.codigo == codigo).options(
        selectinload(Institucion.ubicacion), selectinload(Institucion.carreras).selectinload(Carrera.familia)))
    if institucion is None:
        raise _no_encontrado('Institución')
    ingresos = {fila.familia_id: fila for fila in sesion.scalars(select(IngresoInstitucion).where(
        IngresoInstitucion.institucion_id == institucion.id))}
    return InstitucionDetalle(
        **resumen_institucion(institucion, favoritos).model_dump(), descripcion=institucion.descripcion,
        direccion=institucion.direccion, pagina_web=institucion.pagina_web,
        carreras=[CarreraEnInstitucion(**resumen_carrera(c, favoritos).model_dump(),
                                       ingreso=_tramo(ingresos.get(c.familia_id)))
                  for c in sorted(institucion.carreras, key=lambda c: (c.busqueda, c.codigo))])


# --- Opciones de los filtros (F06) ----------------------------------------------------------

@usar_contexto
def listar_familias(sesion: Session, cuenta: Cuenta) -> list[FamiliaPublica]:
    exigir_catalogo(sesion, cuenta)
    """Solo las familias con carreras, por área y nombre; el front deriva de ellas las áreas."""
    familias = sesion.scalars(select(FamiliaCarrera).where(FamiliaCarrera.id.in_(select(Carrera.familia_id))))
    return [familia_publica(f) for f in sorted(familias, key=lambda f: (f.area_codigo, sin_tildes(f.nombre), f.codigo))]


@usar_contexto
def listar_ubicaciones(sesion: Session, cuenta: Cuenta) -> list[UbicacionPublica]:
    exigir_catalogo(sesion, cuenta)
    """Solo los departamentos con instituciones (los que solo tienen ingresos no son un filtro)."""
    ubicaciones = sesion.scalars(select(Ubicacion).where(Ubicacion.id.in_(select(Institucion.ubicacion_id))))
    return [UbicacionPublica(codigo=u.codigo, nombre=u.nombre)
            for u in sorted(ubicaciones, key=lambda u: (sin_tildes(u.nombre), u.codigo))]


@usar_contexto
def listar_grupos(sesion: Session, cuenta: Cuenta) -> list[GrupoPublico]:
    """Solo los grupos con ocupaciones, por nombre."""
    exigir_catalogo(sesion, cuenta)
    grupos = sesion.scalars(select(GrupoOcupacional).where(GrupoOcupacional.codigo.in_(select(Ocupacion.grupo))))
    return [GrupoPublico(codigo=g.codigo, nombre=g.nombre) for g in sorted(grupos, key=lambda g: sin_tildes(g.nombre))]


# --- Lugar inesperado (HU-042, F06) ---------------------------------------------------------

def _inesperada(sesion: Session, cuenta: Cuenta, modelo, evento: TipoEventoUso, excluir: str | None) -> Inesperada:
    """Al azar entre lo que la cuenta no ha visto, sin el actual; si ya vio todo, uno distinto del actual."""
    exigir_catalogo(sesion, cuenta)
    candidatos = sesion.execute(select(modelo.id, modelo.codigo).where(*_filtros(
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
    if cuenta.rol != Rol.ESTUDIANTE:
        # La exploración se mide solo en el estudiante: la vista de otro rol se ignora, sin error.
        return RespuestaAccion(eventos_registrados=[], nuevos_desbloqueos=[])
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
