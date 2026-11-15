"""Pestaña Planes del perfil (ajuste panel-estudiantes §8): «Sus planes, de un vistazo», «Antes de sus planes» y el
plan completo, en lectura. Reutiliza la lectura agrupada de planes (`cargar_planes`), el estado de cada sección
(`estado_seccion`, con las secciones abiertas del estudiante) y los totales de costos (`totales`); los textos de las
opciones salen de sus listas. Las sugerencias del LLM no se muestran."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import MAXIMO_PLANES
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, EstadoDuda, EstadoPaso, Favorito, Institucion, InstitucionCarrera, OpcionLista, PreguntaConocimiento,
    RespuestaConocimiento, SeccionTarjeta, TipoFavorito,
)
from app.schemas.panel_estudiante import (
    AntesDePlanes, Conoce, DudaCompleta, Medidores, PasoCompleto, PlanCompleto, PlanesEstudiante, PlanVistazo,
    PorQue, PreguntaConoce, Realidad, SeccionCompleta,
)
from app.services.panel.comun import en_areas, entero, intereses_vigentes, leer_parametros
from app.services.panel.perfil import institucion_plan
from app.services.panel.perfil_acceso import estudiante_de_orientadora
from app.services.panel.temas import LISTA_CONOCIMIENTO
from app.services.planes.consultas import (
    DatosPlanes, cargar_planes, estado_seccion, opciones_lista, secciones_abiertas, totales,
)


class _Contexto:
    """Lo que comparten el resumen y el plan completo: tarjetas, carreras, instituciones, secciones y áreas."""

    def __init__(self, sesion: Session, estudiante, parametros: dict):
        self.sesion = sesion
        self.datos: DatosPlanes = cargar_planes(sesion, estudiante)
        tarjetas = self.datos.tarjetas
        ids_carreras = {t.carrera_id for t in tarjetas} | ({estudiante.opcion_inicial_id} - {None})
        self.carreras = {c.id: c for c in sesion.scalars(select(Carrera).where(Carrera.id.in_(ids_carreras)))} \
            if ids_carreras else {}
        ids_instituciones = {t.institucion_id for t in tarjetas} - {None}
        self.instituciones = {i.id: i for i in sesion.scalars(select(Institucion).where(
            Institucion.id.in_(ids_instituciones)))} if ids_instituciones else {}
        self.ciclos = {(f.institucion_id, f.carrera_id): f.duracion_ciclos for f in sesion.scalars(
            select(InstitucionCarrera).where(InstitucionCarrera.institucion_id.in_(ids_instituciones),
                                             InstitucionCarrera.carrera_id.in_(ids_carreras)))} \
            if ids_instituciones else {}
        self.secciones = sorted(contexto(sesion).definiciones.listar(SeccionTarjeta), key=lambda s: s.orden)
        self.abiertas = secciones_abiertas(sesion, estudiante)
        _, _, _, codigo, familias = intereses_vigentes(sesion, estudiante.id, parametros)
        self.en_areas = en_areas(sesion, [self.carreras[t.carrera_id] for t in tarjetas], familias, codigo is not None)

    def texto(self, opcion_id: int | None, otro: str | None = None) -> str | None:
        if opcion_id is None:
            return otro
        return contexto(self.sesion).definiciones.obtener(OpcionLista, opcion_id).texto

    def estados(self, tarjeta) -> dict[str, str]:
        return {s.codigo: estado_seccion(s.codigo, self.abiertas[s.codigo], tarjeta, self.datos) for s in self.secciones}

    def costos(self, tarjeta):
        gastos = self.datos.gastos.get(tarjeta.id, [])
        _, primer_anio, carrera = totales(gastos, self.ciclos.get((tarjeta.institucion_id, tarjeta.carrera_id)))
        return (primer_anio if gastos else None), (carrera if gastos else None)

    def medidores(self, tarjeta) -> Medidores:
        return Medidores(entusiasmo=tarjeta.entusiasmo, capacidad=tarjeta.capacidad, recursos=tarjeta.recursos)


def _vistazo(ctx: _Contexto, tarjeta) -> PlanVistazo:
    datos = ctx.datos
    carrera = ctx.carreras[tarjeta.carrera_id]
    conocimiento = datos.conocimiento.get(tarjeta.id, [])
    dudas = datos.dudas.get(tarjeta.id, [])
    pasos = datos.pasos.get(tarjeta.id, [])
    motivos = datos.motivos.get(tarjeta.id, [])
    estados = ctx.estados(tarjeta)
    primer_anio, _ = ctx.costos(tarjeta)
    return PlanVistazo(
        prioridad=tarjeta.prioridad, carrera=carrera.nombre, tipo=carrera.tipo, en_areas=ctx.en_areas.get(carrera.id),
        institucion=institucion_plan(ctx.instituciones.get(tarjeta.institucion_id)), idea_origen=tarjeta.idea_origen,
        motivo_principal=ctx.texto(motivos[0].opcion_id, motivos[0].texto_otro) if motivos else None,
        conoce_si=sum(f.respuesta == RespuestaConocimiento.SI for f in conocimiento),
        conoce_total=len(PreguntaConocimiento), conoce_respondidas=len(conocimiento),
        dudas_abiertas=sum(d.estado != EstadoDuda.CERRADA for d in dudas),
        dudas_resueltas=sum(d.estado == EstadoDuda.CERRADA for d in dudas),
        costo_primer_anio=primer_anio,
        financiamiento=[ctx.texto(f.opcion_id, f.texto_otro) for f in datos.financiamiento.get(tarjeta.id, [])],
        complicaciones=[ctx.texto(c.opcion_id, c.texto_otro) for c in datos.complicaciones.get(tarjeta.id, [])],
        pasos_hechos=sum(p.estado == EstadoPaso.HECHO for p in pasos), pasos_total=len(pasos),
        medidores=ctx.medidores(tarjeta), secciones_listas=sum(e == "LISTA" for e in estados.values()),
        secciones_total=len(estados))


def _antes(sesion: Session, ctx: _Contexto, estudiante) -> AntesDePlanes:
    favoritos = sesion.execute(select(Favorito.tipo, Favorito.id_referencia).where(
        Favorito.cuenta_id == estudiante.id, Favorito.tipo.in_([TipoFavorito.CARRERA, TipoFavorito.INSTITUCION]))
        .order_by(Favorito.fecha_hora)).all()
    carreras = [r for t, r in favoritos if t == TipoFavorito.CARRERA]
    instituciones = [r for t, r in favoritos if t == TipoFavorito.INSTITUCION]
    nombres_c = dict(sesion.execute(select(Carrera.id, Carrera.nombre).where(Carrera.id.in_(carreras))).all()) \
        if carreras else {}
    nombres_i = dict(sesion.execute(select(Institucion.id, Institucion.nombre).where(
        Institucion.id.in_(instituciones))).all()) if instituciones else {}
    plan_a = next((t for t in ctx.datos.tarjetas if t.prioridad == 1), None)
    inicial = ctx.carreras.get(estudiante.opcion_inicial_id)
    return AntesDePlanes(opcion_inicial=inicial.nombre if inicial else None,
                         plan_a=ctx.carreras[plan_a.carrera_id].nombre if plan_a else None,
                         carreras_favoritas=[nombres_c[c] for c in carreras if c in nombres_c],
                         instituciones_favoritas=[nombres_i[i] for i in instituciones if i in nombres_i])


@usar_contexto
def planes(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> PlanesEstudiante:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    ctx = _Contexto(sesion, acceso.estudiante, leer_parametros(sesion))
    return PlanesEstudiante(planes=[_vistazo(ctx, t) for t in ctx.datos.tarjetas], maximo_planes=MAXIMO_PLANES,
                            antes=_antes(sesion, ctx, acceso.estudiante))


# --- Plan completo -------------------------------------------------------------------------------

def _conoce(ctx: _Contexto, tarjeta, visibles: int) -> Conoce:
    respuestas = {f.pregunta.value: f.respuesta.value for f in ctx.datos.conocimiento.get(tarjeta.id, [])}
    hallazgos = {p.id: p.hallazgo for p in ctx.datos.pasos.get(tarjeta.id, [])}
    dudas = sorted(ctx.datos.dudas.get(tarjeta.id, []), key=lambda d: (d.estado == EstadoDuda.CERRADA, d.numero))
    return Conoce(
        preguntas=[PreguntaConoce(codigo=o.codigo, texto=o.texto, respuesta=respuestas.get(o.codigo))
                   for o in opciones_lista(ctx.sesion, LISTA_CONOCIMIENTO)],
        dudas=[DudaCompleta(texto=d.texto, resuelta=d.estado == EstadoDuda.CERRADA,
                            hallazgo=hallazgos.get(d.cerrada_por_paso_id)) for d in dudas],
        dudas_visibles=visibles)


def _realidad(ctx: _Contexto, tarjeta) -> Realidad:
    primer_anio, carrera = ctx.costos(tarjeta)
    return Realidad(
        institucion=institucion_plan(ctx.instituciones.get(tarjeta.institucion_id)),
        ciclos=ctx.ciclos.get((tarjeta.institucion_id, tarjeta.carrera_id)),
        camino=ctx.texto(tarjeta.camino_opcion_id, tarjeta.camino_otro), costo_primer_anio=primer_anio,
        costo_carrera=carrera,
        rubros=[ctx.texto(g.rubro_opcion_id, g.rubro_otro) for g in ctx.datos.gastos.get(tarjeta.id, [])],
        financiamiento=[ctx.texto(f.opcion_id, f.texto_otro) for f in ctx.datos.financiamiento.get(tarjeta.id, [])],
        complicaciones=[ctx.texto(c.opcion_id, c.texto_otro) for c in ctx.datos.complicaciones.get(tarjeta.id, [])])


def _pasos(ctx: _Contexto, tarjeta) -> list[PasoCompleto]:
    dudas = {d.id: d.texto for d in ctx.datos.dudas.get(tarjeta.id, [])}
    complicaciones = {c.id: ctx.texto(c.opcion_id, c.texto_otro) for c in ctx.datos.complicaciones.get(tarjeta.id, [])}
    pasos = sorted(ctx.datos.pasos.get(tarjeta.id, []), key=lambda p: (p.estado == EstadoPaso.HECHO, p.posicion))
    return [PasoCompleto(texto=p.texto, hecho=p.estado == EstadoPaso.HECHO, hecho_en=p.hecho_en, hallazgo=p.hallazgo,
                         sale_de=dudas.get(p.duda_id) or complicaciones.get(p.complicacion_id)) for p in pasos]


@usar_contexto
def plan_completo(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, prioridad: int,
                  ahora: datetime) -> PlanCompleto:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    parametros = leer_parametros(sesion)
    ctx = _Contexto(sesion, acceso.estudiante, parametros)
    tarjeta = next((t for t in ctx.datos.tarjetas if t.prioridad == prioridad), None)
    if tarjeta is None:
        raise ErrorAccion("Plan no encontrado", estado_http=404)
    carrera = ctx.carreras[tarjeta.carrera_id]
    estados = ctx.estados(tarjeta)
    motivos = ctx.datos.motivos.get(tarjeta.id, [])

    def abierta(codigo):
        return estados[codigo] != "BLOQUEADA"

    return PlanCompleto(
        prioridad=tarjeta.prioridad, carrera=carrera.nombre, tipo=carrera.tipo, en_areas=ctx.en_areas.get(carrera.id),
        actualizada_en=tarjeta.actualizada_en, medidores=ctx.medidores(tarjeta),
        secciones=[SeccionCompleta(codigo=s.codigo, nombre=s.nombre, estado=estados[s.codigo]) for s in ctx.secciones],
        por_que=PorQue(idea_origen=tarjeta.idea_origen, motivos=[ctx.texto(m.opcion_id, m.texto_otro) for m in motivos],
                       relato=tarjeta.relato) if abierta("POR_QUE") else None,
        conoce=_conoce(ctx, tarjeta, entero(parametros, "PANEL_DUDAS_VISIBLES")) if abierta("CONOCIMIENTO") else None,
        realidad=_realidad(ctx, tarjeta) if abierta("REALIDAD") else None,
        pasos=_pasos(ctx, tarjeta) if abierta("PASOS") else None,
        planes=[t.prioridad for t in ctx.datos.tarjetas])
