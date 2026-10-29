"""Lecturas de investigaciones y entrevistas (B13) y lo que comparten las acciones: guardias, visibilidad y personas."""

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, aliased

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import FAVORITOS_LEYENDA
from app.exceptions import ErrorAccion
from app.models import (
    Cuenta, Entrevista, EntrevistaAutor, EstadoEntrevista, EstadoInvestigacion, EstadoSugerenciaGuion, EventoUso,
    Favorito, Insignia, InsigniaVitrina, Investigacion, Ocupacion, OrientadoraSalon, PreguntaBaseGuion, PreguntaGuion,
    Reaccion, Reporte, Rol, SugerenciaGuion, TipoEventoUso, TipoFavorito, TipoReaccion,
)
from app.models.base import sin_tildes
from app.schemas.investigaciones import (
    Aliado, Aliados, ConteosEntrevistas, EntrevistaDetalle, InvestigacionEnCurso, InvestigacionesCuenta,
    LoQuePienso, NivelBreve, OcupacionBreve, PaginaEntrevistas, PersonaInvestigacion, PreguntaBasePublica,
    PreguntaGuionPublica, ReaccionPublica, SugerenciaGuionPublica, TarjetaEntrevista, TipoReaccionPublico,
)
from app.services.motor.reglas import nivel_actual
from app.services.secciones import exigir_seccion, seccion_de_cuenta


SECCION = 'INVESTIGACIONES'
ACTIVAS = (EstadoInvestigacion.EN_CURSO, EstadoInvestigacion.GUIA_LISTA)


# --- Guardias -----------------------------------------------------------------------------------

def exigir_seccion_investigaciones(sesion: Session, cuenta: Cuenta) -> None:
    """404 si la sección no es de la audiencia de la cuenta (apoderado, orientadora); 409 con su mensaje si está
    cerrada."""
    try:
        seccion_de_cuenta(sesion, cuenta, SECCION)
    except LookupError as error:
        raise ErrorAccion(str(error), estado_http=404) from error
    exigir_seccion(sesion, cuenta, SECCION)


def investigacion_activa(sesion: Session, cuenta_id: int) -> Investigacion | None:
    return sesion.scalar(select(Investigacion).where(Investigacion.cuenta_id == cuenta_id,
                                                     Investigacion.estado.in_(ACTIVAS)))


def exigir_investigacion_activa(sesion: Session, cuenta: Cuenta) -> Investigacion:
    investigacion = investigacion_activa(sesion, cuenta.id)
    if investigacion is None:
        raise ErrorAccion('No tienes una investigación en curso')
    return investigacion


def salones_de_orientadora(sesion: Session, cuenta: Cuenta) -> list[int]:
    return list(sesion.scalars(select(OrientadoraSalon.salon_id).where(
        OrientadoraSalon.orientadora_id == cuenta.id).order_by(OrientadoraSalon.salon_id)))


def entrevista_de_sus_salones(sesion: Session, salones: list[int], codigo: str) -> Entrevista:
    """Publicada y de algún autor de los salones de la orientadora; si no, 404 (no actúa sobre otros salones)."""
    entrevista = sesion.scalar(select(Entrevista).where(
        Entrevista.codigo == codigo, Entrevista.estado == EstadoEntrevista.PUBLICADA, de_autor_en_salones(salones)))
    if entrevista is None:
        raise ErrorAccion('Entrevista no encontrada', estado_http=404)
    return entrevista


# --- Visibilidad --------------------------------------------------------------------------------

def de_autor_en_salones(salones):
    """Condición: la entrevista tiene algún autor en esos salones."""
    autor = aliased(Cuenta)
    return exists().where(EntrevistaAutor.entrevista_id == Entrevista.id, EntrevistaAutor.cuenta_id == autor.id,
                          autor.salon_id.in_(salones))


def de_autor(cuenta_id: int):
    return exists().where(EntrevistaAutor.entrevista_id == Entrevista.id, EntrevistaAutor.cuenta_id == cuenta_id)


def condicion_vista(cuenta: Cuenta, vista: str):
    """SALON: de algún autor de su salón; LEYENDAS: todas las Leyendas; MIAS: donde es autor. Siempre publicadas:
    una entrevista retirada o eliminada no se lista para nadie."""
    publicada = Entrevista.estado == EstadoEntrevista.PUBLICADA
    if vista == 'SALON':
        return publicada & de_autor_en_salones([cuenta.salon_id])
    if vista == 'LEYENDAS':
        return publicada & Entrevista.leyenda_en.is_not(None)
    return publicada & de_autor(cuenta.id)


def condicion_visible(cuenta: Cuenta):
    """Lo que un estudiante puede abrir: las de su salón, las Leyendas y las suyas (estas ya son de su salón)."""
    return condicion_vista(cuenta, 'SALON') | condicion_vista(cuenta, 'LEYENDAS')


# --- Personas -----------------------------------------------------------------------------------

@usar_contexto
def personas(sesion: Session, cuentas: list[Cuenta]) -> dict[int, PersonaInvestigacion]:
    """Nombre, nivel (nulo si la cuenta está inactiva) y vitrina de varias cuentas, en consultas fijas."""
    ids = [cuenta.id for cuenta in cuentas]
    datos = contexto(sesion)
    datos.cargar_desbloqueos(ids)
    vitrinas = {}
    for cuenta_id, insignia_id in sesion.execute(select(InsigniaVitrina.cuenta_id, InsigniaVitrina.insignia_id).where(
            InsigniaVitrina.cuenta_id.in_(ids)).order_by(InsigniaVitrina.cuenta_id, InsigniaVitrina.orden)):
        vitrinas.setdefault(cuenta_id, []).append(datos.definiciones.obtener(Insignia, insignia_id).codigo)
    resultado = {}
    for cuenta in cuentas:
        nivel = nivel_actual(sesion, cuenta) if cuenta.activa and cuenta.rol == Rol.ESTUDIANTE else None
        resultado[cuenta.id] = PersonaInvestigacion(
            codigo=cuenta.codigo, nombre=cuenta.nombre, vitrina=vitrinas.get(cuenta.id, []),
            nivel=None if nivel is None else NivelBreve(numero=nivel.numero, titulo=nivel.titulo))
    return resultado


def ocupaciones_breves(sesion: Session, ids) -> dict[int, OcupacionBreve]:
    return {fila.id: OcupacionBreve(codigo=fila.codigo, titulo=fila.titulo) for fila in sesion.execute(
        select(Ocupacion.id, Ocupacion.codigo, Ocupacion.titulo).where(Ocupacion.id.in_(set(ids))))}


# --- Consulta de la vista -----------------------------------------------------------------------

def _en_curso(sesion: Session, investigacion: Investigacion, ocupacion: OcupacionBreve) -> InvestigacionEnCurso:
    preguntas = sesion.scalars(select(PreguntaGuion).where(PreguntaGuion.investigacion_id == investigacion.id)
                               .order_by(PreguntaGuion.posicion))
    sugerencias = sesion.scalars(select(SugerenciaGuion).where(
        SugerenciaGuion.investigacion_id == investigacion.id,
        SugerenciaGuion.estado == EstadoSugerenciaGuion.PENDIENTE).order_by(SugerenciaGuion.id))
    return InvestigacionEnCurso(
        codigo=investigacion.codigo, estado=investigacion.estado, ocupacion=ocupacion,
        lo_que_pienso=LoQuePienso(dia=investigacion.piensa_dia, necesita=investigacion.piensa_necesita,
                                  duda=investigacion.piensa_duda),
        preguntas=[PreguntaGuionPublica(origen=p.origen, texto=p.texto) for p in preguntas],
        sugerencias=[SugerenciaGuionPublica(codigo=s.codigo, texto=s.texto) for s in sugerencias],
        sugerencias_vigentes=investigacion.sugerencias_vigentes, creada_en=investigacion.creada_en,
        guia_lista_en=investigacion.guia_lista_en)


def _aliados(sesion: Session, cuenta: Cuenta, propia: Investigacion | None) -> tuple[list, list]:
    filas = list(sesion.execute(select(Cuenta, Investigacion.ocupacion_id).join(
        Investigacion, Investigacion.cuenta_id == Cuenta.id).where(
        Investigacion.estado == EstadoInvestigacion.GUIA_LISTA, Cuenta.salon_id == cuenta.salon_id,
        Cuenta.id != cuenta.id).order_by(Cuenta.nombre, Cuenta.codigo)).tuples())
    return filas, [ocupacion_id for _, ocupacion_id in filas] + ([] if propia is None else [propia.ocupacion_id])


def tipos_reaccion(sesion: Session) -> list[TipoReaccionPublico]:
    """El catálogo de reacciones, por `orden` (del estudiante y, F09, del detalle de la orientadora)."""
    return [TipoReaccionPublico(codigo=t.codigo, nombre=t.nombre, descripcion=t.descripcion, pregunta=t.pregunta,
                                comentario_obligatorio=t.comentario_obligatorio, icono=t.icono)
            for t in sorted(contexto(sesion).definiciones.listar(TipoReaccion), key=lambda t: t.orden)]


@usar_contexto
def consultar_investigaciones(sesion: Session, cuenta: Cuenta) -> InvestigacionesCuenta:
    exigir_seccion_investigaciones(sesion, cuenta)
    propia = investigacion_activa(sesion, cuenta.id)
    filas, ids_ocupacion = _aliados(sesion, cuenta, propia)
    ocupaciones = ocupaciones_breves(sesion, ids_ocupacion)
    gente = personas(sesion, [fila for fila, _ in filas])
    misma, otras = [], []
    for aliado, ocupacion_id in filas:
        destino = misma if propia is not None and ocupacion_id == propia.ocupacion_id else otras
        destino.append(Aliado(**gente[aliado.id].model_dump(), ocupacion=ocupaciones[ocupacion_id]))
    definiciones = contexto(sesion).definiciones
    conteos = {vista: sesion.scalar(select(func.count()).select_from(Entrevista).where(
        condicion_vista(cuenta, vista))) for vista in ('SALON', 'LEYENDAS', 'MIAS')}
    return InvestigacionesCuenta(
        en_curso=None if propia is None else _en_curso(sesion, propia, ocupaciones[propia.ocupacion_id]),
        aliados=Aliados(misma_ocupacion=misma, otras=otras),
        preguntas_base=[PreguntaBasePublica(codigo=p.codigo, texto=p.texto) for p in sorted(
            definiciones.listar(PreguntaBaseGuion), key=lambda p: p.orden)],
        tipos_reaccion=tipos_reaccion(sesion),
        favoritos_leyenda=FAVORITOS_LEYENDA,
        conteos=ConteosEntrevistas(salon=conteos['SALON'], leyendas=conteos['LEYENDAS'], mias=conteos['MIAS']))


# --- Entrevistas ----------------------------------------------------------------------------------

VISTAS = ('SALON', 'LEYENDAS', 'MIAS')
ORDENES = ('RECIENTES', 'REACCIONADAS')


def contiene(columna, texto: str | None):
    """Subcadena sin mayúsculas ni tildes; `%`, `_` y `\\` se buscan literalmente (como en el catálogo)."""
    normal = sin_tildes((texto or '').strip())
    if not normal:
        return None
    escapado = normal.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    return columna.like(f'%{escapado}%', escape='\\')


def reacciones_activas():
    """Reacciones de estudiantes que cuentan: con tipo y sin eliminar."""
    return (Reaccion.tipo_reaccion_id.is_not(None)) & Reaccion.eliminada_en.is_(None)


def conteo_reacciones():
    return (select(func.count()).where(Reaccion.entrevista_id == Entrevista.id, reacciones_activas())
            .correlate(Entrevista).scalar_subquery())


def contar_favoritos(sesion: Session, ids) -> dict[int, int]:
    """Favoritos que cuentan para la Leyenda: los de cuentas de estudiante."""
    return dict(sesion.execute(select(Favorito.id_referencia, func.count()).join(
        Cuenta, Cuenta.id == Favorito.cuenta_id).where(
        Favorito.tipo == TipoFavorito.ENTREVISTA, Favorito.id_referencia.in_(ids), Cuenta.rol == Rol.ESTUDIANTE,
    ).group_by(Favorito.id_referencia)).all())


def reacciones_por_tipo(sesion: Session, ids) -> dict[int, dict[str, int]]:
    definiciones = contexto(sesion).definiciones
    resultado = {}
    for entrevista_id, tipo_id, cantidad in sesion.execute(select(
            Reaccion.entrevista_id, Reaccion.tipo_reaccion_id, func.count()).where(
            Reaccion.entrevista_id.in_(ids), reacciones_activas()).group_by(
            Reaccion.entrevista_id, Reaccion.tipo_reaccion_id)):
        resultado.setdefault(entrevista_id, {})[definiciones.obtener(TipoReaccion, tipo_id).codigo] = cantidad
    return resultado


def autores_de(sesion: Session, ids) -> dict[int, list[Cuenta]]:
    autores = {}
    for entrevista_id, cuenta in sesion.execute(select(EntrevistaAutor.entrevista_id, Cuenta).join(
            Cuenta, Cuenta.id == EntrevistaAutor.cuenta_id).where(EntrevistaAutor.entrevista_id.in_(ids))
            .order_by(EntrevistaAutor.entrevista_id, Cuenta.nombre, Cuenta.codigo)).tuples():
        autores.setdefault(entrevista_id, []).append(cuenta)
    return autores


@usar_contexto
def tarjetas(sesion: Session, cuenta: Cuenta, entrevistas: list[Entrevista], *,
             por_tipo: bool = False) -> list[TarjetaEntrevista]:
    """Arma las tarjetas de varias entrevistas en consultas fijas, sin depender de cuántas sean."""
    ids = [e.id for e in entrevistas]
    autores = autores_de(sesion, ids)
    gente = personas(sesion, [c for lista in autores.values() for c in {c.id: c for c in lista}.values()])
    ocupaciones = ocupaciones_breves(sesion, [e.ocupacion_id for e in entrevistas])
    reacciones = reacciones_por_tipo(sesion, ids)
    favoritos = contar_favoritos(sesion, ids)
    mis_favoritos = set(sesion.scalars(select(Favorito.id_referencia).where(
        Favorito.cuenta_id == cuenta.id, Favorito.tipo == TipoFavorito.ENTREVISTA, Favorito.id_referencia.in_(ids))))
    vistas = set(sesion.scalars(select(EventoUso.id_referencia).where(
        EventoUso.cuenta_id == cuenta.id, EventoUso.tipo == TipoEventoUso.VISTA_ENTREVISTA,
        EventoUso.id_referencia.in_(ids))))
    return [TarjetaEntrevista(
        codigo=e.codigo, titulo=e.titulo, ocupacion=ocupaciones[e.ocupacion_id], profesional=e.profesional,
        duracion=e.duracion, resumen=e.resumen, fecha_hora=e.fecha_hora,
        autores=[gente[c.id] for c in autores.get(e.id, [])], destacada=e.destacada_en is not None,
        leyenda=e.leyenda_en is not None, reacciones=sum(reacciones.get(e.id, {}).values()),
        favoritos=favoritos.get(e.id, 0), favorita=e.id in mis_favoritos, vista=e.id in vistas,
        propia=any(c.id == cuenta.id for c in autores.get(e.id, [])),
        reacciones_por_tipo=reacciones.get(e.id, {}) if por_tipo else None,
    ) for e in entrevistas]


@usar_contexto
def listar_entrevistas(sesion: Session, cuenta: Cuenta, vista: str, buscar: str | None, favoritas: bool,
                       no_vistas: bool, destacadas: bool, orden: str, limite: int, desde: int,
                       ocupacion: str | None = None) -> PaginaEntrevistas:
    """Una página de la vista. Los filtros no aplican a MIAS (la spec no los muestra ahí). `ocupacion` (F09) sí
    aplica a todas: las entrevistas de una ocupación del catálogo; un código desconocido no trae ninguna."""
    exigir_seccion_investigaciones(sesion, cuenta)
    if vista not in VISTAS or orden not in ORDENES:
        raise ErrorAccion('Vista u orden desconocidos', estado_http=422)
    condiciones = [condicion_vista(cuenta, vista)]
    texto = contiene(Entrevista.busqueda, buscar)
    if texto is not None:
        condiciones.append(texto)
    if ocupacion is not None:
        condiciones.append(Entrevista.ocupacion_id == select(Ocupacion.id).where(
            Ocupacion.codigo == ocupacion).scalar_subquery())
    if vista != 'MIAS':
        if favoritas:
            condiciones.append(exists().where(Favorito.cuenta_id == cuenta.id, Favorito.tipo == TipoFavorito.ENTREVISTA,
                                              Favorito.id_referencia == Entrevista.id))
        if no_vistas:
            condiciones.append(~exists().where(EventoUso.cuenta_id == cuenta.id,
                                               EventoUso.tipo == TipoEventoUso.VISTA_ENTREVISTA,
                                               EventoUso.id_referencia == Entrevista.id))
        if destacadas:
            condiciones.append(Entrevista.destacada_en.is_not(None))
    total = sesion.scalar(select(func.count()).select_from(Entrevista).where(*condiciones))
    criterio = ((conteo_reacciones().desc(),) if orden == 'REACCIONADAS' else ()) + (
        Entrevista.fecha_hora.desc(), Entrevista.id.desc())
    pagina = list(sesion.scalars(select(Entrevista).where(*condiciones).order_by(*criterio)
                                 .limit(limite).offset(desde)))
    return PaginaEntrevistas(total=total, favoritos_leyenda=FAVORITOS_LEYENDA,
                             items=tarjetas(sesion, cuenta, pagina, por_tipo=vista == 'MIAS'))


def entrevista_visible(sesion: Session, cuenta: Cuenta, codigo: str) -> Entrevista:
    """La entrevista publicada que el estudiante puede abrir; si no (o si se retiró o eliminó), 404."""
    entrevista = sesion.scalar(select(Entrevista).where(Entrevista.codigo == codigo, condicion_visible(cuenta)))
    if entrevista is None:
        raise ErrorAccion('Entrevista no encontrada', estado_http=404)
    return entrevista


def lista_reacciones(sesion: Session, cuenta: Cuenta, entrevista: Entrevista) -> list[ReaccionPublica]:
    """Reacciones y comentarios sin eliminar: la propia primero, luego de la más reciente a la más antigua."""
    filas = list(sesion.execute(select(Reaccion, Cuenta).join(Cuenta, Cuenta.id == Reaccion.cuenta_id).where(
        Reaccion.entrevista_id == entrevista.id, Reaccion.eliminada_en.is_(None))
        .order_by(Reaccion.creada_en.desc(), Reaccion.id.desc())).tuples())
    gente = personas(sesion, list({c.id: c for _, c in filas}.values()))
    reportadas = set(sesion.scalars(select(Reporte.reaccion_id).where(
        Reporte.cuenta_id == cuenta.id, Reporte.reaccion_id.in_([r.id for r, _ in filas]))))
    definiciones = contexto(sesion).definiciones
    lista = [ReaccionPublica(
        codigo=r.codigo, autor=gente[c.id],
        tipo=None if r.tipo_reaccion_id is None else definiciones.obtener(TipoReaccion, r.tipo_reaccion_id).codigo,
        comentario=r.comentario, creada_en=r.creada_en, editada_en=r.editada_en, propia=c.id == cuenta.id,
        reportada_por_mi=r.id in reportadas) for r, c in filas]
    return sorted(lista, key=lambda reaccion: not reaccion.propia)


@usar_contexto
def detalle_entrevista(sesion: Session, cuenta: Cuenta, codigo: str) -> EntrevistaDetalle:
    exigir_seccion_investigaciones(sesion, cuenta)
    entrevista = entrevista_visible(sesion, cuenta, codigo)
    tarjeta, = tarjetas(sesion, cuenta, [entrevista], por_tipo=True)
    reportada = sesion.scalar(select(exists().where(Reporte.cuenta_id == cuenta.id,
                                                    Reporte.entrevista_id == entrevista.id)))
    return EntrevistaDetalle(**tarjeta.model_dump(), enlace=entrevista.enlace, editada_en=entrevista.editada_en,
                             favoritos_leyenda=FAVORITOS_LEYENDA, reportada_por_mi=reportada,
                             lista_reacciones=lista_reacciones(sesion, cuenta, entrevista))
