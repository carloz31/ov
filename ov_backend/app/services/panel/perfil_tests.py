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
    Afirmacion, AfirmacionDetalle, BarraInteres, ConteoDetalle, DetallePartidaLlegada, DimensionDetalle,
    DimensionInteres, GrupoAfirmaciones, OtroCuestionario, PartidaLlegada, PlanFrenteAreas, TestIntereses,
    TestsEstudiante,
)
from app.services.instrumentos.calculo import calcular_puntaje_item, cambio_afirmacion, es_respuesta_baja
from app.services.instrumentos.consultas import (
    avance_aplicacion, cargar_representaciones, representar_resultado, textos_instrumento,
)
from app.services.panel.autopercepcion import dimensiones_de, instrumento_autopercepcion
from app.services.panel.comun import (
    Lecturas, actividades_de_aplicaciones, aplicaciones_de, en_areas, entero, etiqueta_cuestionario,
    intereses_vigentes, leer_parametros, planes_activos,
)
from app.services.panel.perfil import partida_resumen
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora


def _vigente(sesion: Session, cuenta_id: int, aplicaciones: list[int]) -> ResultadoInstrumento | None:
    return sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta_id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)).order_by(ResultadoInstrumento.calculado_en.desc()))


def _vigentes_por_aplicacion(sesion: Session, cuenta_id: int,
                             aplicaciones: list[int]) -> dict[int, ResultadoInstrumento]:
    """Por aplicación, su resultado vigente más reciente, en una lectura."""
    vigentes = {}
    if aplicaciones:
        for resultado in sesion.scalars(select(ResultadoInstrumento).where(
                ResultadoInstrumento.cuenta_id == cuenta_id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
                ResultadoInstrumento.anulado_en.is_(None)).order_by(ResultadoInstrumento.calculado_en.desc())):
            vigentes.setdefault(resultado.aplicacion_id, resultado)
    return vigentes


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
    estados, motivos = lecturas.estados_test(ids, entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"))
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
        fecha=resultado.calculado_en.date() if resultado else None, motivo_revision=motivos.get(acceso.estudiante.id),
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

def respuestas_autopercepcion(sesion: Session, cuenta_id: int, instrumento: Instrumento, opciones_bajas: int
                              ) -> dict[MomentoAplicacion, dict[int, tuple[str, float, bool]]]:
    """Por momento, cada ítem respondido: (etiqueta que marcó, puntaje con el inverso ya aplicado, es baja). «Baja» es
    `calculo.es_respuesta_baja` con `PANEL_OPCIONES_BAJAS`, la misma marca que recibe el estudiante."""
    definiciones = contexto(sesion).definiciones
    aplicaciones = [a for a in definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id]
    por_actividad = actividades_de_aplicaciones(sesion, [a.id for a in aplicaciones])
    momento_de = {actividad_id: a.momento for a in aplicaciones for actividad_id in por_actividad.get(a.id, ())}
    if not momento_de:
        return {}
    escalas = defaultdict(list)
    for opcion in definiciones.listar(OpcionEscala):
        escalas[opcion.escala_id].append(opcion.puntaje)
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
                                                         es_respuesta_baja(valor, puntajes, opciones_bajas))
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
        return [GrupoAfirmaciones(codigo="BAJAS", afirmaciones=[afirmacion(i) for i in bajas[:tope]])] if bajas else []
    comunes = [i for i in partida if i in llegada and i in items]
    diferencia = {i: llegada[i][1] - partida[i][1] for i in comunes}
    # Ajuste color-partida-llegada: un solo cambio por afirmación (`calculo.cambio_afirmacion`, el del detalle); una
    # que sube y sigue baja sale solo en «Siguen bajas».
    cambio = {i: cambio_afirmacion(partida[i][1], llegada[i][1], llegada[i][2]) for i in comunes}
    bajaron = sorted((i for i in comunes if cambio[i] == "BAJO"), key=lambda i: (diferencia[i], items[i].numero))
    siguen = sorted((i for i in comunes if cambio[i] == "SIGUE_BAJA"), key=lambda i: (llegada[i][1], items[i].numero))
    mejoraron = sorted((i for i in comunes if cambio[i] == "MEJORO"), key=lambda i: (-diferencia[i], items[i].numero))
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
        respuestas = respuestas_autopercepcion(sesion, acceso.estudiante.id, instrumento,
                                               entero(parametros, "PANEL_OPCIONES_BAJAS"))
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
    instrumentos = [i for i in sorted(definiciones.listar(Instrumento), key=lambda i: i.codigo)
                    if i.codigo != principal and i.tipo_resultado != TipoResultado.COMPARACION]
    por_instrumento = {i.id: aplicaciones_de(sesion, i.codigo)[1] for i in instrumentos}
    # Auditoría del panel (H3): los resultados vigentes de todos los cuestionarios y sus representaciones, en lote.
    vigentes = _vigentes_por_aplicacion(sesion, acceso.estudiante.id,
                                        [a.id for aplicaciones in por_instrumento.values() for a in aplicaciones])
    cargar_representaciones(sesion, list(vigentes.values()))
    otros = []
    for instrumento in instrumentos:
        aplicaciones = por_instrumento[instrumento.id]
        ids = [a.id for a in aplicaciones]
        estados, _ = lecturas.estados_test(ids, entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"))
        candidatos = [vigentes[i] for i in ids if i in vigentes]
        resultado = max(candidatos, key=lambda r: r.calculado_en) if candidatos else None
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


# Orden del detalle por dimensión (ajuste color-partida-llegada §2.2 y §2.3): primero lo que pide atención.
ORDEN_ZONA_DETALLE = {"POR_TRABAJAR": 0, "EN_CAMINO": 1, "FUERTE": 2}
ORDEN_CAMBIO_ZONA = ("BAJO", "SUBIO", "IGUAL")
ORDEN_CAMBIO_AFIRMACION = {"BAJO": 0, "SIGUE_BAJA": 1, "MEJORO": 2, "IGUAL": 3, None: 4}


def _prioridad_dimension(d, con_llegada: bool) -> int:
    """Solo partida: por trabajar, en camino, fuerte. Con llegada: bajó, sigue por trabajar, subió, igual."""
    if not con_llegada:
        return ORDEN_ZONA_DETALLE.get(d.zona_partida, 3)
    if d.cambio == "BAJO":
        return 0
    if d.zona_partida == d.zona_llegada == "POR_TRABAJAR":
        return 1
    return 2 if d.cambio == "SUBIO" else 3


def _afirmaciones_detalle(items: list[ItemInstrumento], partida: dict, llegada: dict | None) -> list[AfirmacionDetalle]:
    """Solo partida: de la más baja a la más alta. Con llegada: bajó (la caída más grande primero), sigue baja (la más
    baja primero), mejoró (la subida más grande primero), igual; desempate por número de ítem; sin respuesta, al final.
    El valor solo ordena: no sale en la respuesta."""
    filas = []
    for item in items:
        en_partida, en_llegada = partida.get(item.id), (llegada or {}).get(item.id)
        cambio = None
        if llegada is None:
            clave = (en_partida[1] if en_partida else float("inf"),)
        else:
            cambio = cambio_afirmacion(en_partida[1] if en_partida else None, en_llegada[1] if en_llegada else None,
                                       bool(en_llegada and en_llegada[2]))
            diferencia = en_llegada[1] - en_partida[1] if en_partida and en_llegada else 0
            segundo = {"BAJO": diferencia, "SIGUE_BAJA": en_llegada[1] if en_llegada else 0,
                       "MEJORO": -diferencia}.get(cambio, 0)
            clave = (ORDEN_CAMBIO_AFIRMACION[cambio], segundo)
        filas.append((clave + (item.numero,), AfirmacionDetalle(
            item=item.codigo, enunciado=item.enunciado, partida=en_partida[0] if en_partida else None,
            llegada=en_llegada[0] if en_llegada else None, partida_baja=bool(en_partida and en_partida[2]),
            llegada_baja=bool(en_llegada and en_llegada[2]), cambio=cambio)))
    return [fila for _, fila in sorted(filas, key=lambda par: par[0])]


@usar_contexto
def respuestas_partida_llegada(sesion: Session, codigo_cuenta: str, codigo_estudiante: str,
                               ahora: datetime) -> DetallePartidaLlegada:
    """«Ver detalle por dimensión» (ajuste color-partida-llegada): zonas y fechas de `partida_resumen` (con las
    `Lecturas` del estudiante), respuestas y marca de baja de `respuestas_autopercepcion`, clasificadas con
    `calculo.cambio_afirmacion`. Sin puntajes."""
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    instrumento = instrumento_autopercepcion(sesion)
    if instrumento is None:
        raise ErrorAccion("Cuestionario no encontrado", estado_http=404)
    bajas = entero(leer_parametros(sesion), "PANEL_OPCIONES_BAJAS")
    resumen = partida_resumen(sesion, acceso.estudiante.id, Lecturas(sesion, acceso.solo))
    aplicaciones = [a for a in contexto(sesion).definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id]
    con_llegada = resumen.estado == "CON_LLEGADA"
    dimensiones, conteo = [], []
    if resumen.estado != "SIN_PARTIDA":
        respuestas = respuestas_autopercepcion(sesion, acceso.estudiante.id, instrumento, bajas)
        partida = respuestas.get(MomentoAplicacion.ENTRADA, {})
        llegada = respuestas.get(MomentoAplicacion.SALIDA, {}) if con_llegada else None
        items = sorted(_items(sesion, instrumento).values(), key=lambda i: i.numero)
        ids_dimension = {d.codigo: d.id for d in dimensiones_de(sesion, instrumento)}
        ordenadas = sorted(enumerate(resumen.dimensiones),
                           key=lambda par: (_prioridad_dimension(par[1], con_llegada), par[0]))
        dimensiones = [DimensionDetalle(
            codigo=d.codigo, nombre=d.nombre, zona_partida=d.zona_partida, zona_llegada=d.zona_llegada,
            cambio=d.cambio, afirmaciones=_afirmaciones_detalle(
                [i for i in items if i.dimension_id == ids_dimension[d.codigo]], partida, llegada))
            for _, d in ordenadas]
        claves = [d.cambio if con_llegada else d.zona_partida for d in resumen.dimensiones]
        orden = ORDEN_CAMBIO_ZONA if con_llegada else tuple(ORDEN_ZONA_DETALLE)
        conteo = [ConteoDetalle(codigo=c, cantidad=claves.count(c)) for c in orden if claves.count(c)]
    return DetallePartidaLlegada(
        instrumento=instrumento.codigo, nombre=instrumento.nombre,
        etiqueta=_etiqueta(sesion, instrumento, aplicaciones, acceso),
        lectura=textos_instrumento(instrumento, "orientadora", acceso.estudiante.nombre)["lectura"],
        estado=resumen.estado, fecha_partida=resumen.fecha_partida, fecha_llegada=resumen.fecha_llegada,
        opciones_bajas=bajas, conteo=conteo, dimensiones=dimensiones)


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
