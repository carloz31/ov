"""Pestaña Intereses del salón (ajuste panel-salon, spec §5) y sus listas completas de áreas e instituciones.

Regla de conteo: siempre estudiantes distintos; solo cuentan tarjetas activas y favoritos de carrera o institución.
El orden lo aplica el servidor sobre toda la lista y recién después se corta el top o la página."""

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from functools import cached_property

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import LIMITE_MAXIMO_CATALOGO
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, ComplicacionTarjeta, Dimension, FamiliaCarrera, Favorito, Institucion, OpcionLista, ResultadoInstrumento,
    TarjetaCarrera, TipoFavorito, TipoInstitucion,
)
from app.models.base import sin_tildes
from app.schemas.panel import (
    CarreraConPlanes, CodigoInteresPanel, ComplicacionesPanel, DesgloseFormacion, FilaArea, FilaComplicacion,
    FilaFormacion, FilaInstitucion, FormacionPanel, FrenteTestPanel, InteresesPanel, PaginaAreasPanel, PaginaInstitucionesPanel,
    TablaAreas, TablaInstituciones,
)
from app.services.instrumentos.consultas import intereses_por_cuenta
from app.services.panel.comun import (
    Alcance, Lecturas, aplicaciones_de, entero, estados_test, leer_parametros, resolver_alcance,
)

COLUMNAS = ("nombre", "en_planes", "plan_a", "solo_favoritos", "total")
ORDEN_INICIAL = "-en_planes"
ORDEN_TIPOS = list(TipoInstitucion)


@dataclass
class Interes:
    """Estudiantes de una fila: con plan, con Plan A y con favorito."""
    planes: set[int] = field(default_factory=set)
    plan_a: set[int] = field(default_factory=set)
    favoritos: set[int] = field(default_factory=set)

    @property
    def solo_favoritos(self) -> set[int]:
        return self.favoritos - self.planes

    @property
    def interesados(self) -> set[int]:
        return self.planes | self.favoritos


@dataclass(frozen=True)
class Tarjeta:
    cuenta_id: int
    id: int
    carrera_id: int
    prioridad: int
    institucion_id: int | None


class DatosIntereses:
    """Tarjetas activas y favoritos del alcance, con su catálogo: una consulta por tabla."""

    def __init__(self, sesion: Session, alcance: Alcance):
        self.sesion = sesion
        self.alcance = alcance
        ids = alcance.ids
        self.tarjetas = [Tarjeta(*fila) for fila in sesion.execute(select(
            TarjetaCarrera.cuenta_id, TarjetaCarrera.id, TarjetaCarrera.carrera_id, TarjetaCarrera.prioridad,
            TarjetaCarrera.institucion_id).where(TarjetaCarrera.cuenta_id.in_(ids), TarjetaCarrera.activa))]
        self.favoritos = sesion.execute(select(Favorito.cuenta_id, Favorito.tipo, Favorito.id_referencia).where(
            Favorito.cuenta_id.in_(ids), Favorito.tipo.in_([TipoFavorito.CARRERA, TipoFavorito.INSTITUCION]))).all()
        carreras = ({t.carrera_id for t in self.tarjetas}
                    | {r for _, tipo, r in self.favoritos if tipo == TipoFavorito.CARRERA})
        instituciones = ({t.institucion_id for t in self.tarjetas if t.institucion_id}
                         | {r for _, tipo, r in self.favoritos if tipo == TipoFavorito.INSTITUCION})
        self.carreras = {c.id: c for c in sesion.scalars(select(Carrera).where(Carrera.id.in_(carreras)))}
        self.familias = {f.id: f for f in sesion.scalars(select(FamiliaCarrera).where(
            FamiliaCarrera.id.in_({c.familia_id for c in self.carreras.values()})))}
        self.instituciones = {i.id: i for i in sesion.scalars(select(Institucion).where(
            Institucion.id.in_(instituciones)))}

    @cached_property
    def plan_a(self) -> dict[int, Tarjeta]:
        return {t.cuenta_id: t for t in self.tarjetas if t.prioridad == 1}

    def areas(self, tipo: str | None = None) -> dict[int, tuple[Interes, Counter]]:
        """Por familia: el interés y, de cada carrera con plan, cuántos estudiantes. Con `tipo`, solo las carreras de
        ese tipo de formación."""
        def vale(carrera_id):
            return carrera_id in self.carreras and (tipo is None or self.carreras[carrera_id].tipo == tipo)
        filas = defaultdict(lambda: (Interes(), defaultdict(set)))
        for t in self.tarjetas:
            if vale(t.carrera_id):
                interes, carreras = filas[self.carreras[t.carrera_id].familia_id]
                interes.planes.add(t.cuenta_id)
                carreras[t.carrera_id].add(t.cuenta_id)
                if t.prioridad == 1:
                    interes.plan_a.add(t.cuenta_id)
        for cuenta_id, tipo_favorito, referencia in self.favoritos:
            if tipo_favorito == TipoFavorito.CARRERA and vale(referencia):
                filas[self.carreras[referencia].familia_id][0].favoritos.add(cuenta_id)
        return {familia_id: (interes, Counter({c: len(e) for c, e in carreras.items()}))
                for familia_id, (interes, carreras) in filas.items()}

    def instituciones_con_interes(self, tipo: str | None = None) -> dict[int, Interes]:
        def vale(institucion_id):
            return institucion_id in self.instituciones and (tipo is None
                                                             or self.instituciones[institucion_id].tipo == tipo)
        filas = defaultdict(Interes)
        for t in self.tarjetas:
            if t.institucion_id and vale(t.institucion_id):
                filas[t.institucion_id].planes.add(t.cuenta_id)
                if t.prioridad == 1:
                    filas[t.institucion_id].plan_a.add(t.cuenta_id)
        for cuenta_id, tipo_favorito, referencia in self.favoritos:
            if tipo_favorito == TipoFavorito.INSTITUCION and vale(referencia):
                filas[referencia].favoritos.add(cuenta_id)
        return filas

    def fila_area(self, familia_id: int, interes: Interes, carreras: Counter) -> FilaArea:
        familia = self.familias[familia_id]
        return FilaArea(
            codigo=familia.codigo, nombre=familia.nombre,
            carreras=[CarreraConPlanes(nombre=self.carreras[c].nombre, cantidad=n) for c, n in sorted(
                carreras.items(), key=lambda par: (-par[1], sin_tildes(self.carreras[par[0]].nombre)))],
            en_planes=len(interes.planes), plan_a=len(interes.plan_a), solo_favoritos=len(interes.solo_favoritos),
            total=len(interes.planes) + len(interes.solo_favoritos))

    def fila_institucion(self, institucion_id: int, interes: Interes) -> FilaInstitucion:
        institucion = self.instituciones[institucion_id]
        return FilaInstitucion(
            codigo=institucion.codigo, nombre=institucion.nombre, tipo=institucion.tipo, gestion=institucion.gestion,
            en_planes=len(interes.planes), plan_a=len(interes.plan_a), solo_favoritos=len(interes.solo_favoritos),
            total=len(interes.planes) + len(interes.solo_favoritos))

    @property
    def plan_a_sin_institucion(self) -> int:
        return sum(1 for t in self.plan_a.values() if t.institucion_id is None)


def ordenar(filas: list, orden: str | None) -> list:
    """`<columna>` ascendente o `-<columna>` descendente; desempata Plan A (mayor primero) y luego el nombre."""
    orden = orden or ORDEN_INICIAL
    columna = orden.removeprefix("-")
    if columna not in COLUMNAS:
        raise ErrorAccion("Orden desconocido", estado_http=422)
    filas = sorted(filas, key=lambda f: (-f.plan_a, sin_tildes(f.nombre), f.codigo))
    if columna == "nombre":
        return sorted(filas, key=lambda f: sin_tildes(f.nombre), reverse=orden.startswith("-"))
    return sorted(filas, key=lambda f: getattr(f, columna), reverse=orden.startswith("-"))


def _filas_areas(datos: DatosIntereses, tipo: str | None = None) -> list[FilaArea]:
    return [datos.fila_area(f, interes, carreras) for f, (interes, carreras) in datos.areas(tipo).items()
            if interes.interesados]


def _filas_instituciones(datos: DatosIntereses, tipo: str | None = None) -> list[FilaInstitucion]:
    return [datos.fila_institucion(i, interes) for i, interes in datos.instituciones_con_interes(tipo).items()
            if interes.interesados]


def _formacion(datos: DatosIntereses) -> FormacionPanel:
    por_tipo = defaultdict(Counter)
    for t in datos.plan_a.values():
        institucion = datos.instituciones.get(t.institucion_id)
        clave = (institucion.tipo, institucion.gestion) if institucion else (None, None)
        por_tipo[datos.carreras[t.carrera_id].tipo][clave] += 1

    def orden_desglose(par):
        (tipo, gestion), cantidad = par
        return tipo is None, -cantidad, ORDEN_TIPOS.index(tipo) if tipo else 0, gestion or ""

    filas = [FilaFormacion(tipo=tipo, cantidad=sum(desglose.values()), desglose=[
        DesgloseFormacion(tipo=t, gestion=g, cantidad=n) for (t, g), n in sorted(desglose.items(), key=orden_desglose)])
        for tipo, desglose in por_tipo.items()]
    return FormacionPanel(con_plan_a=len(datos.plan_a), filas=sorted(
        filas, key=lambda f: (-f.cantidad, ORDEN_TIPOS.index(f.tipo))))


def _complicaciones(sesion: Session, datos: DatosIntereses, tope: int) -> ComplicacionesPanel:
    tarjetas = {t.id: t.cuenta_id for t in datos.plan_a.values()}
    por_opcion, otra = defaultdict(set), set()
    if tarjetas:
        for tarjeta_id, opcion_id in sesion.execute(select(ComplicacionTarjeta.tarjeta_id, ComplicacionTarjeta.opcion_id)
                                                    .where(ComplicacionTarjeta.tarjeta_id.in_(tarjetas))):
            (por_opcion[opcion_id] if opcion_id else otra).add(tarjetas[tarjeta_id])
    definiciones = contexto(sesion).definiciones
    opciones = {o: definiciones.obtener(OpcionLista, o) for o in por_opcion}
    filas = sorted(por_opcion.items(), key=lambda par: (-len(par[1]), opciones[par[0]].orden))[:tope]
    return ComplicacionesPanel(filas=[FilaComplicacion(texto=opciones[o].texto, cantidad=len(e)) for o, e in filas],
                               otra=len(otra))


@dataclass(frozen=True)
class FrenteTest:
    panel: FrenteTestPanel
    no_coinciden: set[int]


def frente_test(lecturas: Lecturas, datos: DatosIntereses, parametros: dict) -> FrenteTest:
    """Plan A frente a las familias recomendadas del test (el mismo cálculo de `_leer_familias_recomendadas`)."""
    sesion = lecturas.sesion
    instrumento, aplicaciones = aplicaciones_de(sesion, parametros["PANEL_INSTRUMENTO_PRINCIPAL"])
    ids_aplicaciones = [a.id for a in aplicaciones]
    resultados = list(sesion.scalars(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id.in_(lecturas.alcance.ids), ResultadoInstrumento.aplicacion_id.in_(ids_aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None), ResultadoInstrumento.perfil_plano.is_(False))))
    intereses = intereses_por_cuenta(sesion, resultados)
    base = [c for c in datos.plan_a if c in intereses]
    no_coinciden = {c for c in base if datos.familias[datos.carreras[datos.plan_a[c].carrera_id].familia_id].codigo
                    not in intereses[c][1]}
    estados, _ = estados_test(sesion, lecturas.alcance.ids, ids_aplicaciones,
                              entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)
    listos = [c for c, estado in estados.items() if estado == "LISTO" and c in intereses]
    letras = Counter(intereses[c][0][0] for c in listos if intereses[c][0])
    nombres = {d.codigo: d.nombre for d in contexto(sesion).definiciones.listar(Dimension)
               if instrumento and d.instrumento_id == instrumento.id}
    return FrenteTest(FrenteTestPanel(
        base=len(base), coinciden=len(base) - len(no_coinciden), no_coinciden=len(no_coinciden),
        codigos=[CodigoInteresPanel(letra=letra, nombre=nombres.get(letra, letra), cantidad=n)
                 for letra, n in sorted(letras.items(), key=lambda par: (-par[1], par[0]))],
        resultados_listos=len(listos)), no_coinciden)


@usar_contexto
def intereses(sesion: Session, codigo_cuenta: str, salon: str | None, orden_areas: str | None,
              orden_instituciones: str | None, ahora: datetime) -> InteresesPanel:
    alcance = resolver_alcance(sesion, codigo_cuenta, salon, ahora)
    parametros = leer_parametros(sesion)
    datos = DatosIntereses(sesion, alcance)
    tope = entero(parametros, "PANEL_TOP_INTERESES")
    areas = ordenar(_filas_areas(datos), orden_areas)
    instituciones = ordenar(_filas_instituciones(datos), orden_instituciones)
    return InteresesPanel(
        con_planes=len({t.cuenta_id for t in datos.tarjetas}),
        con_favoritos=len({cuenta_id for cuenta_id, _, _ in datos.favoritos}),
        areas=TablaAreas(filas=areas[:tope], total=len(areas)),
        instituciones=TablaInstituciones(filas=instituciones[:tope], total=len(instituciones),
                                         plan_a_sin_institucion=datos.plan_a_sin_institucion),
        formacion=_formacion(datos),
        complicaciones=_complicaciones(sesion, datos, entero(parametros, "PANEL_TOP_COMPLICACIONES")),
        frente_test=frente_test(Lecturas(sesion, alcance), datos, parametros).panel)


def _pagina(filas: list, orden: str | None, buscar: str | None, limite: int, desde: int) -> tuple[int, list]:
    if not 1 <= limite <= LIMITE_MAXIMO_CATALOGO or desde < 0:
        raise ErrorAccion("Página fuera de rango", estado_http=422)
    if buscar:
        filas = [f for f in filas if sin_tildes(buscar.strip()) in sin_tildes(f.nombre)]
    filas = ordenar(filas, orden)
    return len(filas), filas[desde:desde + limite]


def _tipo(tipo: str | None) -> str | None:
    if tipo is not None and tipo not in TipoInstitucion.__members__:
        raise ErrorAccion("Tipo desconocido", estado_http=422)
    return tipo


@usar_contexto
def lista_areas(sesion: Session, codigo_cuenta: str, salon: str | None, orden: str | None, buscar: str | None,
                tipo: str | None, limite: int, desde: int, ahora: datetime) -> PaginaAreasPanel:
    """Todas las áreas con algún interesado. Con `tipo`, cada familia cuenta solo sus carreras de ese tipo."""
    datos = DatosIntereses(sesion, resolver_alcance(sesion, codigo_cuenta, salon, ahora))
    tipos = {c.tipo for c in datos.carreras.values()}
    total, items = _pagina(_filas_areas(datos, _tipo(tipo)), orden, buscar, limite, desde)
    return PaginaAreasPanel(total=total, items=items, tipos=[t for t in ORDEN_TIPOS if t in tipos])


@usar_contexto
def lista_instituciones(sesion: Session, codigo_cuenta: str, salon: str | None, orden: str | None,
                        buscar: str | None, tipo: str | None, limite: int, desde: int,
                        ahora: datetime) -> PaginaInstitucionesPanel:
    datos = DatosIntereses(sesion, resolver_alcance(sesion, codigo_cuenta, salon, ahora))
    tipos = {i.tipo for i in datos.instituciones.values()}
    total, items = _pagina(_filas_instituciones(datos, _tipo(tipo)), orden, buscar, limite, desde)
    return PaginaInstitucionesPanel(total=total, items=items, tipos=[t for t in ORDEN_TIPOS if t in tipos],
                               plan_a_sin_institucion=datos.plan_a_sin_institucion)


# --- Conjuntos para «Ver» ------------------------------------------------------------------------

def interesados_en_area(datos: DatosIntereses, codigo: str) -> set[int]:
    for familia_id, (interes, _) in datos.areas().items():
        if datos.familias[familia_id].codigo == codigo:
            return interes.interesados
    raise ErrorAccion("Conjunto desconocido", estado_http=422)


def interesados_en_institucion(datos: DatosIntereses, codigo: str) -> set[int]:
    for institucion_id, interes in datos.instituciones_con_interes().items():
        if datos.instituciones[institucion_id].codigo == codigo:
            return interes.interesados
    raise ErrorAccion("Conjunto desconocido", estado_http=422)
