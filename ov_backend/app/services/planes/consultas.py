"""Consulta de los planes de carrera (B11): tarjetas, estado de cada sección, totales, avisos y opciones.

Una consulta por tabla de la tarjeta, sea cual sea el número de planes; listas y secciones salen de la caché."""

from dataclasses import dataclass, field
from fractions import Fraction
from math import floor

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import CICLOS_POR_ANIO, MAXIMO_PLANES, MINIMO_CARACTERES_RELATO
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, ComplicacionTarjeta, ConocimientoTarjeta, Cuenta, DudaTarjeta, FinanciamientoTarjeta, FrecuenciaGasto,
    GastoTarjeta, Institucion, InstitucionCarrera, ListaOpciones, MotivoTarjeta, OpcionLista, PasoTarjeta,
    PreguntaConocimiento, ReferenciaCamino, ReferenciaRubro, SeccionTarjeta, SugerenciaTarjeta, TarjetaCarrera,
    TipoObjetivo,
)
from app.schemas.planes import (
    AvisoPlanes, CaminoTarjeta, ComplicacionPublica, DudaPublica, Elegida, GastoPublico, InstitucionPlan, Medidores,
    MotivoPublico, OpcionesTarjeta, OpcionTarjeta, OrigenPasoPublico, OrigenSugerenciaPublico, PasoPublico, PlanCarrera,
    PlanesCuenta, PreguntaTarjeta, RubroTarjeta, SeccionPlan, SugerenciaPublica,
)
from app.services.catalogo import familia_publica, resumen_carrera, resumen_institucion
from app.services.motor.reglas import motivos_bloqueo, objetivo_disponible
from app.services.secciones import exigir_seccion, seccion_de_cuenta


SECCION = 'PLANES'
LETRAS = 'ABC'
# Marca de guardado de cada sección de la tarjeta.
GUARDADA = {'POR_QUE': 'guardada_por_que_en', 'CONOCIMIENTO': 'guardada_conocimiento_en',
            'REALIDAD': 'guardada_realidad_en', 'PASOS': 'guardada_pasos_en'}
# Veces que cada frecuencia se paga en el primer año.
VECES_PRIMER_ANIO = {FrecuenciaGasto.UNICA: 1, FrecuenciaGasto.MENSUAL: 12, FrecuenciaGasto.POR_CICLO: CICLOS_POR_ANIO,
                     FrecuenciaGasto.ANUAL: 1}


@usar_contexto
def exigir_planes(sesion: Session, cuenta: Cuenta) -> None:
    """404 si la sección no es de la audiencia de la cuenta; 409 con su mensaje si está cerrada."""
    try:
        seccion_de_cuenta(sesion, cuenta, SECCION)
    except LookupError as error:
        raise ErrorAccion(str(error), estado_http=404) from error
    exigir_seccion(sesion, cuenta, SECCION)


# --- Listas comunes de la tarjeta ------------------------------------------------------------------

def opciones_lista(sesion: Session, codigo: str):
    definiciones = contexto(sesion).definiciones
    return definiciones.opciones_por_lista.get(definiciones.por_codigo(ListaOpciones, codigo).id, ())


def opcion_por_codigo(sesion: Session, lista: str, codigo: str):
    """La opción de esa lista común, o 422 si no está en ella."""
    opcion = next((o for o in opciones_lista(sesion, lista) if o.codigo == codigo), None)
    if opcion is None:
        raise ErrorAccion(f'La opción {codigo} no está en la lista {lista}', estado_http=422)
    return opcion


def codigo_opcion(sesion: Session, opcion_id: int | None) -> str | None:
    return None if opcion_id is None else contexto(sesion).definiciones.obtener(OpcionLista, opcion_id).codigo


def texto_opcion(sesion: Session, opcion_id: int) -> str:
    return contexto(sesion).definiciones.obtener(OpcionLista, opcion_id).texto


def texto_duda_pregunta(sesion: Session, pregunta: PreguntaConocimiento, carrera: str) -> str:
    return opcion_por_codigo(sesion, 'DUDAS_CONOCIMIENTO', pregunta.value).texto.replace('{carrera}', carrera)


@usar_contexto
def opciones_tarjeta(sesion: Session) -> OpcionesTarjeta:
    definiciones = contexto(sesion).definiciones
    rubros = {r.opcion_id: r for r in definiciones.listar(ReferenciaRubro)}
    caminos = {c.opcion_id: c.incluye_preparacion for c in definiciones.listar(ReferenciaCamino)}

    def simples(lista):
        return [OpcionTarjeta(codigo=o.codigo, texto=o.texto) for o in opciones_lista(sesion, lista)]

    dudas = {o.codigo: o.texto for o in opciones_lista(sesion, 'DUDAS_CONOCIMIENTO')}
    return OpcionesTarjeta(
        valores=simples('VALORES'),
        caminos=[CaminoTarjeta(codigo=o.codigo, texto=o.texto, incluye_preparacion=caminos.get(o.id, False))
                 for o in opciones_lista(sesion, 'CAMINOS')],
        rubros=[RubroTarjeta(
            codigo=o.codigo, texto=o.texto,
            frecuencia_recomendada=None if o.id not in rubros else rubros[o.id].frecuencia_recomendada,
            monto_referencia=None if o.id not in rubros else rubros[o.id].monto_referencia,
            cero_si_publica=o.id in rubros and rubros[o.id].cero_si_publica,
            solo_si_camino_prepara=o.id in rubros and rubros[o.id].solo_si_camino_prepara,
        ) for o in opciones_lista(sesion, 'RUBROS_GASTO')],
        financiamiento=simples('FINANCIAMIENTO'), dificultades=simples('DIFICULTADES'), pasos=simples('PASOS'),
        dudas_sugeridas=simples('DUDAS_SUGERIDAS'),
        preguntas=[PreguntaTarjeta(codigo=o.codigo, texto=o.texto, texto_duda=dudas[o.codigo])
                   for o in opciones_lista(sesion, 'PREGUNTAS_CONOCIMIENTO')],
        ciclos_por_anio=CICLOS_POR_ANIO,
    )


# --- Lectura agrupada -----------------------------------------------------------------------------

@dataclass
class DatosPlanes:
    """Las tarjetas de una cuenta por prioridad y sus filas agrupadas por tarjeta."""
    tarjetas: list
    motivos: dict = field(default_factory=dict)
    conocimiento: dict = field(default_factory=dict)
    dudas: dict = field(default_factory=dict)
    gastos: dict = field(default_factory=dict)
    financiamiento: dict = field(default_factory=dict)
    complicaciones: dict = field(default_factory=dict)
    sugerencias: dict = field(default_factory=dict)
    pasos: dict = field(default_factory=dict)


def cargar_planes(sesion: Session, cuenta: Cuenta) -> DatosPlanes:
    datos = DatosPlanes(tarjetas=list(sesion.scalars(select(TarjetaCarrera).where(
        TarjetaCarrera.cuenta_id == cuenta.id).order_by(TarjetaCarrera.prioridad))))
    ids = [tarjeta.id for tarjeta in datos.tarjetas]
    if not ids:
        return datos
    for atributo, modelo, orden in (
        ('motivos', MotivoTarjeta, MotivoTarjeta.posicion), ('conocimiento', ConocimientoTarjeta, None),
        ('dudas', DudaTarjeta, DudaTarjeta.numero), ('gastos', GastoTarjeta, GastoTarjeta.posicion),
        ('financiamiento', FinanciamientoTarjeta, FinanciamientoTarjeta.posicion),
        ('complicaciones', ComplicacionTarjeta, ComplicacionTarjeta.numero),
        ('sugerencias', SugerenciaTarjeta, SugerenciaTarjeta.numero), ('pasos', PasoTarjeta, PasoTarjeta.posicion),
    ):
        consulta = select(modelo).where(modelo.tarjeta_id.in_(ids))
        if orden is not None:
            consulta = consulta.order_by(orden)
        agrupadas = getattr(datos, atributo)
        for fila in sesion.scalars(consulta):
            agrupadas.setdefault(fila.tarjeta_id, []).append(fila)
    return datos


# --- Estado de las secciones ----------------------------------------------------------------------

def secciones_abiertas(sesion: Session, cuenta: Cuenta) -> dict[str, bool]:
    return {s.codigo: objetivo_disponible(sesion, cuenta, TipoObjetivo.SECCION_PLAN, s.id)
            for s in contexto(sesion).definiciones.listar(SeccionTarjeta)}


def _lista(codigo: str, tarjeta, datos: DatosPlanes) -> bool:
    if codigo == 'POR_QUE':
        return (tarjeta.idea_origen is not None and bool(datos.motivos.get(tarjeta.id))
                and len(tarjeta.relato or '') >= MINIMO_CARACTERES_RELATO)
    if codigo == 'CONOCIMIENTO':
        return len(datos.conocimiento.get(tarjeta.id, ())) == len(PreguntaConocimiento)
    if codigo == 'REALIDAD':
        return (tarjeta.institucion_id is not None
                and (tarjeta.camino_opcion_id is not None or tarjeta.camino_otro is not None)
                and bool(datos.financiamiento.get(tarjeta.id)))
    return bool(datos.pasos.get(tarjeta.id))


def estado_seccion(codigo: str, abierta: bool, tarjeta, datos: DatosPlanes) -> str:
    if not abierta:
        return 'BLOQUEADA'
    if getattr(tarjeta, GUARDADA[codigo]) is None:
        return 'POR_EMPEZAR'
    return 'LISTA' if _lista(codigo, tarjeta, datos) else 'EN_PROCESO'


@usar_contexto
def contar_listos_para_comparar(sesion: Session, cuenta: Cuenta) -> int:
    """Cuántos planes tienen en LISTA todas las secciones `para_comparar`."""
    abiertas = secciones_abiertas(sesion, cuenta)
    para_comparar = [s.codigo for s in contexto(sesion).definiciones.listar(SeccionTarjeta) if s.para_comparar]
    datos = cargar_planes(sesion, cuenta)
    return sum(all(estado_seccion(c, abiertas[c], t, datos) == 'LISTA' for c in para_comparar)
               for t in datos.tarjetas)


# --- Totales y avisos ----------------------------------------------------------------------------

def totales(gastos, ciclos: int | None) -> tuple[dict[FrecuenciaGasto, int], int, int | None]:
    """Suma por frecuencia, total del primer año y total de la carrera (nulo sin duración en ciclos).

    El total de la carrera se calcula exacto, sin división entera intermedia, y se redondea solo al final."""
    por_frecuencia = dict.fromkeys(FrecuenciaGasto, 0)
    for gasto in gastos:
        por_frecuencia[gasto.frecuencia] += gasto.monto
    primer_anio = sum(monto * VECES_PRIMER_ANIO[frecuencia] for frecuencia, monto in por_frecuencia.items())
    if ciclos is None:
        return por_frecuencia, primer_anio, None
    carrera = (por_frecuencia[FrecuenciaGasto.UNICA]
               + ciclos * (Fraction(por_frecuencia[FrecuenciaGasto.MENSUAL] * 12, CICLOS_POR_ANIO)
                           + por_frecuencia[FrecuenciaGasto.POR_CICLO])
               + Fraction(por_frecuencia[FrecuenciaGasto.ANUAL] * ciclos, CICLOS_POR_ANIO))
    return por_frecuencia, primer_anio, floor(carrera + Fraction(1, 2))


def _avisos(tarjetas, carreras) -> list[AvisoPlanes]:
    por_familia = {}
    for tarjeta in tarjetas:
        por_familia.setdefault(carreras[tarjeta.carrera_id].familia_id, []).append(tarjeta)
    return [AvisoPlanes(tipo='MISMA_FAMILIA', planes=[LETRAS[t.prioridad - 1] for t in grupo],
                        familia=familia_publica(carreras[grupo[0].carrera_id].familia))
            for grupo in por_familia.values() if len(grupo) > 1]


# --- Consulta -------------------------------------------------------------------------------------

def _elegida(sesion, opcion_id, otro) -> Elegida:
    return Elegida(opcion=codigo_opcion(sesion, opcion_id), otro=otro)


def _plan(sesion, cuenta, tarjeta, datos, carreras, instituciones, duraciones, favoritos, abiertas, bloqueos,
          secciones) -> PlanCarrera:
    dudas = datos.dudas.get(tarjeta.id, [])
    complicaciones = datos.complicaciones.get(tarjeta.id, [])
    pasos = datos.pasos.get(tarjeta.id, [])
    numero_duda = {d.id: d.numero for d in dudas}
    numero_complicacion = {c.id: c.numero for c in complicaciones}
    sugerencias = datos.sugerencias.get(tarjeta.id, [])
    numero_sugerencia = {s.id: s.numero for s in sugerencias}
    hallazgos = {p.id: p.hallazgo for p in pasos}
    texto_duda = {d.id: d.texto for d in dudas}
    texto_complicacion = {c.id: c.texto_otro or texto_opcion(sesion, c.opcion_id) for c in complicaciones}
    respuestas = {fila.pregunta: fila.respuesta for fila in datos.conocimiento.get(tarjeta.id, [])}
    gastos = datos.gastos.get(tarjeta.id, [])
    por_frecuencia, primer_anio, total_carrera = totales(
        gastos, duraciones.get((tarjeta.institucion_id, tarjeta.carrera_id)))
    estados = {s.codigo: estado_seccion(s.codigo, abiertas[s.codigo], tarjeta, datos) for s in secciones}
    hay_camino = tarjeta.camino_opcion_id is not None or tarjeta.camino_otro is not None
    return PlanCarrera(
        prioridad=LETRAS[tarjeta.prioridad - 1],
        carrera=resumen_carrera(carreras[tarjeta.carrera_id], favoritos),
        institucion=None if tarjeta.institucion_id is None else InstitucionPlan(
            **resumen_institucion(instituciones[tarjeta.institucion_id], favoritos).model_dump(),
            duracion_ciclos=duraciones.get((tarjeta.institucion_id, tarjeta.carrera_id))),
        idea_origen=tarjeta.idea_origen,
        motivos=[MotivoPublico(posicion=m.posicion, **_elegida(sesion, m.opcion_id, m.texto_otro).model_dump())
                 for m in datos.motivos.get(tarjeta.id, [])],
        relato=tarjeta.relato,
        conocimiento={pregunta: respuestas.get(pregunta) for pregunta in PreguntaConocimiento},
        dudas=[DudaPublica(numero=d.numero, origen=d.origen, pregunta=d.pregunta, opcion=codigo_opcion(sesion, d.opcion_id),
                           texto=d.texto, estado=d.estado, hallazgo=hallazgos.get(d.cerrada_por_paso_id))
               for d in dudas],
        camino=_elegida(sesion, tarjeta.camino_opcion_id, tarjeta.camino_otro) if hay_camino else None,
        gastos=[GastoPublico(rubro=codigo_opcion(sesion, g.rubro_opcion_id), otro=g.rubro_otro, monto=g.monto,
                             frecuencia=g.frecuencia) for g in gastos],
        totales_por_frecuencia=por_frecuencia, total_primer_anio=primer_anio, total_carrera=total_carrera,
        financiamiento=[_elegida(sesion, f.opcion_id, f.texto_otro) for f in datos.financiamiento.get(tarjeta.id, [])],
        complicaciones=[ComplicacionPublica(numero=c.numero, **_elegida(sesion, c.opcion_id, c.texto_otro).model_dump())
                        for c in complicaciones],
        sugerencias=[SugerenciaPublica(
            numero=s.numero, tipo=codigo_opcion(sesion, s.tipo_opcion_id), texto=s.texto, estado=s.estado,
            generada_por=s.generada_por,
            origen=OrigenSugerenciaPublico(
                duda=numero_duda.get(s.duda_id), complicacion=numero_complicacion.get(s.complicacion_id),
                texto=texto_duda[s.duda_id] if s.duda_id is not None else texto_complicacion[s.complicacion_id]),
        ) for s in sugerencias],
        pasos=[PasoPublico(numero=p.numero, tipo=codigo_opcion(sesion, p.tipo_opcion_id), texto=p.texto,
                           estado=p.estado, hallazgo=p.hallazgo,
                           origen=OrigenPasoPublico(duda=numero_duda.get(p.duda_id),
                                                    complicacion=numero_complicacion.get(p.complicacion_id),
                                                    sugerencia=numero_sugerencia.get(p.sugerencia_id)))
               for p in pasos],
        medidores=Medidores(entusiasmo=tarjeta.entusiasmo, capacidad=tarjeta.capacidad, recursos=tarjeta.recursos),
        secciones=[SeccionPlan(codigo=s.codigo, nombre=s.nombre, estado=estados[s.codigo], bloqueo=bloqueos[s.codigo],
                               guardada_en=getattr(tarjeta, GUARDADA[s.codigo])) for s in secciones],
        lista_para_comparar=all(estados[s.codigo] == 'LISTA' for s in secciones if s.para_comparar),
        actualizada_en=tarjeta.actualizada_en,
    )


@usar_contexto
def listar_planes(sesion: Session, cuenta: Cuenta) -> PlanesCuenta:
    exigir_planes(sesion, cuenta)
    datos = cargar_planes(sesion, cuenta)
    tarjetas = datos.tarjetas
    ids_carreras = {t.carrera_id for t in tarjetas} | ({cuenta.opcion_inicial_id} - {None})
    carreras = {c.id: c for c in sesion.scalars(select(Carrera).where(Carrera.id.in_(ids_carreras)).options(
        selectinload(Carrera.familia)))} if ids_carreras else {}
    ids_instituciones = {t.institucion_id for t in tarjetas} - {None}
    instituciones, duraciones = {}, {}
    if ids_instituciones:
        instituciones = {i.id: i for i in sesion.scalars(select(Institucion).where(
            Institucion.id.in_(ids_instituciones)).options(selectinload(Institucion.ubicacion)))}
        duraciones = {(fila.institucion_id, fila.carrera_id): fila.duracion_ciclos for fila in sesion.scalars(
            select(InstitucionCarrera).where(InstitucionCarrera.institucion_id.in_(ids_instituciones),
                                             InstitucionCarrera.carrera_id.in_(ids_carreras)))}
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    secciones = sorted(contexto(sesion).definiciones.listar(SeccionTarjeta), key=lambda s: s.orden)
    abiertas = secciones_abiertas(sesion, cuenta)
    bloqueos = {s.codigo: motivos_bloqueo(sesion, cuenta, TipoObjetivo.SECCION_PLAN, s.id) for s in secciones}
    return PlanesCuenta(
        planes=[_plan(sesion, cuenta, t, datos, carreras, instituciones, duraciones, favoritos, abiertas, bloqueos,
                      secciones) for t in tarjetas],
        avisos=_avisos(tarjetas, carreras),
        opcion_inicial=None if cuenta.opcion_inicial_id is None else resumen_carrera(
            carreras[cuenta.opcion_inicial_id], favoritos),
        maximo_planes=MAXIMO_PLANES, opciones=opciones_tarjeta(sesion))
