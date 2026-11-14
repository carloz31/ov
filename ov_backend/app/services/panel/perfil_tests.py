"""Pestaña Tests del perfil (ajuste panel-estudiantes §7): test de intereses, partida y llegada con sus
afirmaciones para conversar, y los demás cuestionarios. La orientadora nunca recibe puntajes ni promedios de partida y
llegada: solo zonas y las etiquetas que marcó el estudiante. El resultado completo de un instrumento reutiliza
`representar_resultado` con los textos de la orientadora."""

from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    ActividadItem, Aplicacion, Dimension, Instrumento, ItemInstrumento, MomentoAplicacion, OpcionEscala,
    ProgresoActividad, RespuestaItem, ResultadoInstrumento, TipoResultado,
)
from app.schemas.instrumentos import ResultadoPublico
from app.schemas.panel_estudiante import (
    Afirmacion, BarraInteres, DimensionInteres, DimensionRespuestas, GrupoAfirmaciones, OtroCuestionario,
    PartidaLlegada, PlanFrenteAreas, RespuestasPartidaLlegada, TestIntereses, TestsEstudiante,
)
from app.services.instrumentos.calculo import calcular_puntaje_item
from app.services.instrumentos.consultas import (
    avance_aplicacion, representar_resultado, textos_instrumento,
)
from app.services.panel.autopercepcion import dimensiones_de, instrumento_autopercepcion
from app.services.panel.comun import (
    Lecturas, actividades_de_aplicaciones, aplicaciones_de, entero, estados_test, etiqueta_cuestionario,
    leer_parametros,
)
from app.services.panel.perfil import (
    en_areas, intereses_vigentes, partida_resumen, planes_activos,
)
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora


def _vigente(sesion: Session, cuenta_id: int, aplicaciones: list[int]) -> ResultadoInstrumento | None:
    return sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta_id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)).order_by(ResultadoInstrumento.calculado_en.desc()))


def _partes(sesion: Session, acceso: Acceso, aplicaciones: list[Aplicacion]) -> tuple[int, int]:
    avances = [avance_aplicacion(sesion, acceso.estudiante, a) for a in aplicaciones]
    return sum(a.actividades.completadas for a in avances), sum(a.actividades.total for a in avances)


def _etiqueta(sesion: Session, instrumento: Instrumento, aplicaciones: list[Aplicacion], acceso: Acceso) -> str:
    actividades = set().union(*actividades_de_aplicaciones(sesion, [a.id for a in aplicaciones]).values()) \
        if aplicaciones else set()
    return etiqueta_cuestionario(sesion, instrumento.id, actividades, [acceso.estudiante.salon_id])


# --- Test de intereses ---------------------------------------------------------------------------

def _intereses(sesion: Session, acceso: Acceso, parametros: dict, lecturas: Lecturas) -> TestIntereses | None:
    instrumento, aplicaciones, resultado, codigo, familias = intereses_vigentes(sesion, acceso.estudiante.id,
                                                                               parametros)
    if instrumento is None:
        return None
    ids = [a.id for a in aplicaciones]
    estados, motivos = estados_test(sesion, [acceso.estudiante.id], ids,
                                    entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)
    barras, nombres_areas = [], []
    if resultado is not None:
        representado = representar_resultado(sesion, resultado, audiencia="orientadora", nombre=acceso.estudiante.nombre)
        letras = set(codigo or "")
        barras = sorted((BarraInteres(codigo=d.codigo, nombre=d.nombre, valor=d.puntaje_visual or 0,
                                      en_codigo=d.codigo in letras) for d in representado.dimensiones),
                        key=lambda b: -b.valor)
        nombres_areas = [f.nombre for f in representado.familias or []]
    nombres = {d.codigo: d.nombre for d in contexto(sesion).definiciones.listar(Dimension)
               if d.instrumento_id == instrumento.id}
    planes = planes_activos(sesion, acceso.estudiante.id)
    dentro = en_areas(sesion, [c for _, c, _ in planes], familias, codigo is not None)
    rehizo = sesion.scalar(select(ResultadoInstrumento.id).where(
        ResultadoInstrumento.cuenta_id == acceso.estudiante.id, ResultadoInstrumento.aplicacion_id.in_(ids),
        ResultadoInstrumento.anulado_en.is_not(None), ResultadoInstrumento.perfil_plano).limit(1)) is not None
    respondidas, total = _partes(sesion, acceso, aplicaciones)
    return TestIntereses(
        instrumento=instrumento.codigo, nombre=instrumento.nombre,
        etiqueta=_etiqueta(sesion, instrumento, aplicaciones, acceso), estado=estados[acceso.estudiante.id],
        fecha=resultado.calculado_en.date() if resultado else None, motivo=motivos.get(acceso.estudiante.id),
        mensaje=textos_instrumento(instrumento, "orientadora", acceso.estudiante.nombre)["mensaje"],
        aplicacion=_codigo_aplicacion(sesion, resultado), barras=barras,
        codigo=[DimensionInteres(codigo=letra, nombre=nombres.get(letra, letra)) for letra in (codigo or "")],
        areas=nombres_areas,
        frente_planes=[PlanFrenteAreas(prioridad=t.prioridad, carrera=c.nombre, en_areas=dentro[c.id])
                       for t, c, _ in planes if c.id in dentro],
        rehizo_plano=rehizo, partes_respondidas=respondidas, partes_total=total)


def _codigo_aplicacion(sesion: Session, resultado: ResultadoInstrumento | None) -> str | None:
    return None if resultado is None else contexto(sesion).definiciones.obtener(Aplicacion, resultado.aplicacion_id).codigo


# --- Partida y llegada ---------------------------------------------------------------------------

def respuestas_autopercepcion(sesion: Session, cuenta_id: int, instrumento: Instrumento
                              ) -> dict[MomentoAplicacion, dict[int, tuple[str, float, bool]]]:
    """Por momento, cada ítem respondido: (etiqueta que marcó, puntaje con el inverso ya aplicado, es baja)."""
    definiciones = contexto(sesion).definiciones
    aplicaciones = [a for a in definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id]
    por_actividad = actividades_de_aplicaciones(sesion, [a.id for a in aplicaciones])
    momento_de = {actividad_id: a.momento for a in aplicaciones for actividad_id in por_actividad.get(a.id, ())}
    if not momento_de:
        return {}
    escalas = defaultdict(list)
    for opcion in definiciones.listar(OpcionEscala):
        escalas[opcion.escala_id].append(opcion.puntaje)
    bajas = entero(leer_parametros(sesion), "PANEL_OPCIONES_BAJAS")
    filas = sesion.execute(select(ProgresoActividad.actividad_id, RespuestaItem.item_id, RespuestaItem.opcion_id).join(
        RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id).join(
        ActividadItem, (ActividadItem.item_id == RespuestaItem.item_id)
        & (ActividadItem.actividad_id == ProgresoActividad.actividad_id)).where(
        ProgresoActividad.cuenta_id == cuenta_id, ProgresoActividad.actividad_id.in_(momento_de)))
    respuestas = defaultdict(dict)
    for actividad_id, item_id, opcion_id in filas:
        item = definiciones.obtener(ItemInstrumento, item_id)
        opcion = definiciones.obtener(OpcionEscala, opcion_id)
        puntajes = sorted(escalas[item.escala_id])
        valor = calcular_puntaje_item(opcion.puntaje, puntajes[0], puntajes[-1], item.inverso)
        respuestas[momento_de[actividad_id]][item_id] = (opcion.etiqueta, valor,
                                                         valor <= puntajes[min(bajas, len(puntajes)) - 1])
    return respuestas


def _grupos(items: dict[int, ItemInstrumento], partida: dict, llegada: dict | None,
            tope: int) -> list[GrupoAfirmaciones]:
    def afirmacion(item_id):
        return Afirmacion(item=items[item_id].codigo, enunciado=items[item_id].enunciado,
                          partida=partida.get(item_id, (None,))[0],
                          llegada=llegada.get(item_id, (None,))[0] if llegada is not None else None)

    if llegada is None:
        bajas = sorted((i for i, (_, valor, baja) in partida.items() if baja and i in items),
                       key=lambda i: (partida[i][1], items[i].numero))
        return [GrupoAfirmaciones(codigo="BAJAS", afirmaciones=[afirmacion(i) for i in bajas[:tope]])]
    comunes = [i for i in partida if i in llegada and i in items]
    diferencia = {i: llegada[i][1] - partida[i][1] for i in comunes}
    bajaron = sorted((i for i in comunes if diferencia[i] < 0), key=lambda i: (diferencia[i], items[i].numero))
    siguen = sorted((i for i in comunes if diferencia[i] >= 0 and partida[i][2] and llegada[i][2]),
                    key=lambda i: (llegada[i][1], items[i].numero))
    mejoraron = sorted((i for i in comunes if diferencia[i] > 0), key=lambda i: (-diferencia[i], items[i].numero))
    return [GrupoAfirmaciones(codigo=codigo, afirmaciones=[afirmacion(i) for i in lista[:tope]])
            for codigo, lista in (("BAJARON", bajaron), ("SIGUEN_BAJAS", siguen), ("MEJORARON", mejoraron)) if lista]


def _items(sesion: Session, instrumento: Instrumento) -> dict[int, ItemInstrumento]:
    return {i.id: i for i in contexto(sesion).definiciones.listar(ItemInstrumento) if i.instrumento_id == instrumento.id}


def _partida_llegada(sesion: Session, acceso: Acceso, parametros: dict) -> PartidaLlegada | None:
    instrumento = instrumento_autopercepcion(sesion)
    if instrumento is None:
        return None
    aplicaciones = [a for a in contexto(sesion).definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id]
    resumen = partida_resumen(sesion, acceso.estudiante.id)
    grupos = []
    if resumen.estado != "SIN_PARTIDA":
        respuestas = respuestas_autopercepcion(sesion, acceso.estudiante.id, instrumento)
        llegada = respuestas.get(MomentoAplicacion.SALIDA, {}) if resumen.estado == "CON_LLEGADA" else None
        grupos = _grupos(_items(sesion, instrumento), respuestas.get(MomentoAplicacion.ENTRADA, {}), llegada,
                         entero(parametros, "PANEL_AFIRMACIONES_POR_GRUPO"))
    return PartidaLlegada(instrumento=instrumento.codigo, nombre=instrumento.nombre,
                          etiqueta=_etiqueta(sesion, instrumento, aplicaciones, acceso),
                          mensaje=textos_instrumento(instrumento, "orientadora", acceso.estudiante.nombre)["mensaje"],
                          resumen=resumen, grupos=grupos)


# --- Otros cuestionarios -------------------------------------------------------------------------

def _otros(sesion: Session, acceso: Acceso, parametros: dict, lecturas: Lecturas) -> list[OtroCuestionario]:
    definiciones = contexto(sesion).definiciones
    principal = parametros["PANEL_INSTRUMENTO_PRINCIPAL"]
    otros = []
    for instrumento in sorted(definiciones.listar(Instrumento), key=lambda i: i.codigo):
        if instrumento.codigo == principal or instrumento.tipo_resultado == TipoResultado.COMPARACION:
            continue
        _, aplicaciones = aplicaciones_de(sesion, instrumento.codigo)
        ids = [a.id for a in aplicaciones]
        estados, _ = estados_test(sesion, [acceso.estudiante.id], ids,
                                  entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)
        resultado = _vigente(sesion, acceso.estudiante.id, ids) if ids else None
        destaca, practicar = [], None
        if resultado is not None:
            representado = representar_resultado(sesion, resultado, audiencia="orientadora",
                                                 nombre=acceso.estudiante.nombre)
            destaca = [d.nombre for d in representado.dimensiones_destacadas or []]
            con_desarrollo = [d for d in representado.dimensiones if d.desarrollo and d.puntaje_maximo]
            if con_desarrollo:
                practicar = min(con_desarrollo, key=lambda d: d.puntaje / d.puntaje_maximo).nombre
        respondidas, total = _partes(sesion, acceso, aplicaciones)
        otros.append(OtroCuestionario(
            instrumento=instrumento.codigo, nombre=instrumento.nombre,
            etiqueta=_etiqueta(sesion, instrumento, aplicaciones, acceso), estado=estados[acceso.estudiante.id],
            aplicacion=_codigo_aplicacion(sesion, resultado), destaca=destaca, para_practicar=practicar,
            partes_respondidas=respondidas, partes_total=total))
    return otros


@usar_contexto
def tests(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> TestsEstudiante:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    parametros = leer_parametros(sesion)
    lecturas = Lecturas(sesion, acceso.solo)
    return TestsEstudiante(intereses=_intereses(sesion, acceso, parametros, lecturas),
                           partida_llegada=_partida_llegada(sesion, acceso, parametros),
                           otros=_otros(sesion, acceso, parametros, lecturas))


@usar_contexto
def respuestas_partida_llegada(sesion: Session, codigo_cuenta: str, codigo_estudiante: str,
                               ahora: datetime) -> RespuestasPartidaLlegada:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    instrumento = instrumento_autopercepcion(sesion)
    if instrumento is None:
        return RespuestasPartidaLlegada(dimensiones=[])
    respuestas = respuestas_autopercepcion(sesion, acceso.estudiante.id, instrumento)
    partida = respuestas.get(MomentoAplicacion.ENTRADA, {})
    llegada = respuestas.get(MomentoAplicacion.SALIDA, {})
    items = sorted(_items(sesion, instrumento).values(), key=lambda i: i.numero)
    return RespuestasPartidaLlegada(dimensiones=[DimensionRespuestas(
        codigo=d.codigo, nombre=d.nombre,
        afirmaciones=[Afirmacion(item=i.codigo, enunciado=i.enunciado, partida=partida.get(i.id, (None,))[0],
                                 llegada=llegada.get(i.id, (None,))[0]) for i in items if i.dimension_id == d.id])
        for d in dimensiones_de(sesion, instrumento)])


@usar_contexto
def resultado_completo(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, aplicacion: str,
                       ahora: datetime) -> ResultadoPublico:
    """El resultado vigente de esa aplicación con los textos de la orientadora. Partida y llegada no: sus puntajes no
    se exponen (su vista es la de Tests)."""
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    elegida = next((a for a in contexto(sesion).definiciones.listar(Aplicacion) if a.codigo == aplicacion), None)
    instrumento = contexto(sesion).definiciones.obtener(Instrumento, elegida.instrumento_id) if elegida else None
    if elegida is None or instrumento.tipo_resultado == TipoResultado.COMPARACION:
        raise ErrorAccion("Resultado no encontrado", estado_http=404)
    resultado = _vigente(sesion, acceso.estudiante.id, [elegida.id])
    if resultado is None:
        raise ErrorAccion("Resultado no encontrado", estado_http=404)
    return representar_resultado(sesion, resultado, audiencia="orientadora", nombre=acceso.estudiante.nombre)
