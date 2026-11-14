"""Pestaña Seguimiento del panel del salón (ajuste panel-salon, spec §4): indicadores, a quién buscar, test de
intereses, otros cuestionarios, por dónde va el salón y cómo se sienten. Una sola respuesta."""

from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Actividad, ActividadItem, Aplicacion, Audiencia, Bloque, Espacio, Instrumento, ProgresoActividad, RespuestaItem,
    TarjetaCarrera, TipoEventoUso, TipoResultado,
)
from app.schemas.panel import (
    AlertaPanel, AvisosPanel, BandaSeguridad, CuestionarioPanel, DetenidosPanel, GrupoAlertaPanel, IndicadoresPanel,
    SalonPanel, SeguimientoPanel, SeguridadPanel, TestPanel, TramoPanel,
)
from app.models.base import sin_tildes
from app.services.familia import rutas_completas
from app.services.panel.alertas import calcular_alertas
from app.services.panel.comun import (
    SIN_EMPEZAR, TERMINO, Alcance, Lecturas, actividades_de_aplicaciones, aplicaciones_de, con_conversacion,
    con_resultado_vigente, dias_desde, entero, estados_test, etiqueta_cuestionario, leer_parametros,
    resolver_alcance,
    ultimo_evento,
)

ORDEN_ESPACIO = {Espacio.MISIONES_CAMPO: 0, Espacio.CIUDAD: 1}


def salones_del_alcance(alcance: Alcance) -> list[int]:
    return [alcance.salon.id] if alcance.salon else sorted(alcance.salones)


def _planes(sesion: Session, ids: list[int]) -> tuple[set[int], set[int]]:
    """Con Plan A (tarjeta activa de prioridad 1) y con sus tres planes (tres tarjetas activas)."""
    activas = Counter()
    plan_a = set()
    if ids:
        for cuenta_id, prioridad in sesion.execute(select(TarjetaCarrera.cuenta_id, TarjetaCarrera.prioridad).where(
                TarjetaCarrera.cuenta_id.in_(ids), TarjetaCarrera.activa)):
            activas[cuenta_id] += 1
            if prioridad == 1:
                plan_a.add(cuenta_id)
    return plan_a, {cuenta_id for cuenta_id, n in activas.items() if n >= 3}


def _indicadores(lecturas: Lecturas, parametros: dict, estados: dict[int, str]) -> IndicadoresPanel:
    sesion, ids = lecturas.sesion, lecturas.alcance.ids
    dias = entero(parametros, "PANEL_DIAS_INGRESO_RECIENTE")
    plan_a, tres = _planes(sesion, ids)
    apoderados = sorted(set().union(*lecturas.apoderados.values())) if lecturas.apoderados else []
    bloques = [b.id for b in contexto(sesion).definiciones.listar(Bloque) if b.audiencia == Audiencia.APODERADO]
    completas = set(rutas_completas(sesion, apoderados, bloques))
    estados_contados = Counter(estados.values())
    return IndicadoresPanel(
        ingresaron=len(ids) - len(lecturas.sin_ingreso_desde(dias)), dias_ingreso=dias,
        test_listo=estados_contados["LISTO"], test_por_revisar=estados_contados["POR_REVISAR"],
        test_sin_terminar=estados_contados["EN_CURSO"] + estados_contados["SIN_EMPEZAR"],
        con_plan_a=len(plan_a), con_tres_planes=len(tres),
        familias_participando=len(lecturas.familias_participando),
        familias_ruta_completa=sum(1 for e in ids if lecturas.apoderados.get(e, set()) & completas),
        familias_conversaron=len(con_conversacion(sesion, ids)))


def _avisos(lecturas: Lecturas, parametros: dict) -> AvisosPanel:
    visibles = entero(parametros, "PANEL_NOMBRES_VISIBLES_ALERTA")
    nombres = {e.id: e.nombre for e in lecturas.alcance.estudiantes}
    grupos: dict[str, GrupoAlertaPanel] = {}
    con_avisos = set()
    for calculada in calcular_alertas(lecturas):
        if not calculada.estudiantes:
            continue
        con_avisos |= calculada.estudiantes
        grupo = grupos.setdefault(calculada.grupo.codigo, GrupoAlertaPanel(
            codigo=calculada.grupo.codigo, nombre=calculada.grupo.nombre, alertas=[]))
        cantidad = len(calculada.estudiantes)
        grupo.alertas.append(AlertaPanel(
            codigo=calculada.alerta.codigo, nombre=calculada.nombre, descripcion=calculada.descripcion,
            cantidad=cantidad,
            nombres=sorted((nombres[i] for i in calculada.estudiantes), key=sin_tildes) if cantidad <= visibles else None))
    return AvisosPanel(con_avisos=len(con_avisos), grupos=list(grupos.values()))


def _test(lecturas: Lecturas, parametros: dict) -> tuple[TestPanel, dict[int, str]]:
    sesion, ids = lecturas.sesion, lecturas.alcance.ids
    instrumento, aplicaciones = aplicaciones_de(sesion, parametros["PANEL_INSTRUMENTO_PRINCIPAL"])
    ids_aplicaciones = [a.id for a in aplicaciones]
    estados, revisar = estados_test(sesion, ids, ids_aplicaciones,
                                    entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)
    actividades = set().union(*actividades_de_aplicaciones(sesion, ids_aplicaciones).values())
    contados = Counter(estados.values())
    motivos = Counter(revisar.values())
    return TestPanel(
        instrumento=instrumento.codigo, nombre=instrumento.nombre,
        etiqueta=etiqueta_cuestionario(sesion, instrumento.id, actividades, salones_del_alcance(lecturas.alcance)),
        listo=contados["LISTO"], por_revisar=contados["POR_REVISAR"], perfil_plano=motivos["PLANO"],
        prisa=motivos["PRISA"], en_curso=contados["EN_CURSO"], sin_empezar=contados["SIN_EMPEZAR"]), estados


def _posicion_actividad(definiciones, actividad_id: int) -> tuple:
    actividad = definiciones.obtener(Actividad, actividad_id)
    bloque = definiciones.obtener(Bloque, actividad.bloque_id)
    return ORDEN_ESPACIO.get(bloque.espacio, 2), bloque.numero, actividad.orden, actividad.codigo


def _respondidas_completas(sesion: Session, ids: list[int], aplicaciones: list[Aplicacion],
                           actividades: dict[int, set[int]]) -> dict[int, set[int]]:
    """Por aplicación, los estudiantes que respondieron todos sus ítems (partida y llegada)."""
    definiciones = contexto(sesion).definiciones
    items = {a.id: {f.item_id for f in definiciones.listar(ActividadItem) if f.actividad_id in actividades[a.id]}
             for a in aplicaciones}
    todas = set().union(*actividades.values()) if actividades else set()
    completas = defaultdict(set)
    if not ids or not todas:
        return completas
    respondidas = defaultdict(set)
    for cuenta_id, actividad_id, item_id in sesion.execute(select(
            ProgresoActividad.cuenta_id, ProgresoActividad.actividad_id, RespuestaItem.item_id).join(
            RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id).where(
            ProgresoActividad.cuenta_id.in_(ids), ProgresoActividad.actividad_id.in_(todas))):
        for aplicacion in aplicaciones:
            if actividad_id in actividades[aplicacion.id]:
                respondidas[aplicacion.id, cuenta_id].add(item_id)
    for (aplicacion_id, cuenta_id), hechos in respondidas.items():
        if items[aplicacion_id] and items[aplicacion_id] <= hechos:
            completas[aplicacion_id].add(cuenta_id)
    return completas


def _cuestionarios(lecturas: Lecturas, parametros: dict) -> list[CuestionarioPanel]:
    """Una fila por aplicación de los demás instrumentos, en el orden del camino y luego la ciudad."""
    sesion, ids = lecturas.sesion, lecturas.alcance.ids
    definiciones = contexto(sesion).definiciones
    principal = parametros["PANEL_INSTRUMENTO_PRINCIPAL"]
    instrumentos = {i.id: i for i in definiciones.listar(Instrumento) if i.codigo != principal}
    aplicaciones = [a for a in definiciones.listar(Aplicacion) if a.instrumento_id in instrumentos]
    actividades = actividades_de_aplicaciones(sesion, [a.id for a in aplicaciones])
    comparacion = [a for a in aplicaciones
                   if instrumentos[a.instrumento_id].tipo_resultado == TipoResultado.COMPARACION]
    vigentes = con_resultado_vigente(sesion, ids, [a.id for a in aplicaciones if a not in comparacion])
    completas = _respondidas_completas(sesion, ids, comparacion, actividades)
    salones = salones_del_alcance(lecturas.alcance)

    def orden(aplicacion):
        posiciones = [_posicion_actividad(definiciones, a) for a in actividades[aplicacion.id]]
        return min(posiciones, default=(3,)), aplicacion.codigo

    return [CuestionarioPanel(
        aplicacion=a.codigo, nombre=a.nombre,
        etiqueta=etiqueta_cuestionario(sesion, a.instrumento_id, actividades[a.id], salones),
        n=len((completas if a in comparacion else vigentes)[a.id]),
    ) for a in sorted(aplicaciones, key=orden)]


def _tramos(lecturas: Lecturas) -> list[TramoPanel]:
    camino = lecturas.camino
    cantidades = Counter(p.codigo for p in camino.posiciones.values())
    return [TramoPanel(codigo=SIN_EMPEZAR, nombre="Sin empezar", cantidad=cantidades[SIN_EMPEZAR]),
            *(TramoPanel(codigo=b.codigo, nombre=b.nombre, cantidad=cantidades[b.codigo]) for b in camino.bloques),
            TramoPanel(codigo=TERMINO, nombre="Terminó", cantidad=cantidades[TERMINO])]


def detenidos(lecturas: Lecturas, parametros: dict) -> tuple[Actividad | None, set[int], int]:
    """La requerida pendiente (la siguiente de su tramo) que comparten más estudiantes cuya última actividad
    completada fue hace `PANEL_DIAS_DETENIDO` días o más. Quien no completó ninguna no cuenta."""
    dias = entero(parametros, "PANEL_DIAS_DETENIDO")
    ultima = ultimo_evento(lecturas.sesion, lecturas.alcance.ids, TipoEventoUso.COMPLETA_ACTIVIDAD)
    por_actividad = defaultdict(set)
    for cuenta_id, posicion in lecturas.camino.posiciones.items():
        fecha = ultima.get(cuenta_id)
        if (posicion.siguiente is not None and fecha is not None
                and dias_desde(lecturas.alcance.ahora, fecha) >= dias):
            por_actividad[posicion.siguiente.id].add(cuenta_id)
    if not por_actividad:
        return None, set(), dias
    definiciones = contexto(lecturas.sesion).definiciones
    actividad_id = min(por_actividad, key=lambda a: (-len(por_actividad[a]), _posicion_actividad(definiciones, a)))
    estudiantes = por_actividad[actividad_id]
    if len(estudiantes) < entero(parametros, "PANEL_MINIMO_DETENIDOS"):
        return None, set(), dias
    return definiciones.obtener(Actividad, actividad_id), estudiantes, dias


def bandas_seguridad(lecturas: Lecturas, parametros: dict) -> dict[str, set[int]]:
    """Por el último check-in de cada uno, sin ventana de fechas: BAJA, MEDIA, ALTA o SIN."""
    baja, alta = entero(parametros, "PANEL_SEGURIDAD_BAJA_MAXIMO"), entero(parametros, "PANEL_SEGURIDAD_ALTA_MINIMO")
    bandas = {"BAJA": set(), "MEDIA": set(), "ALTA": set(), "SIN": set()}
    for cuenta_id in lecturas.alcance.ids:
        niveles = lecturas.senales.get(cuenta_id)
        banda = "SIN" if not niveles else "BAJA" if niveles[0] <= baja else "ALTA" if niveles[0] >= alta else "MEDIA"
        bandas[banda].add(cuenta_id)
    return bandas


def _seguridad(lecturas: Lecturas, parametros: dict) -> SeguridadPanel:
    baja, alta = entero(parametros, "PANEL_SEGURIDAD_BAJA_MAXIMO"), entero(parametros, "PANEL_SEGURIDAD_ALTA_MINIMO")
    bandas = bandas_seguridad(lecturas, parametros)
    return SeguridadPanel(bandas=[
        BandaSeguridad(codigo="BAJA", desde=1, hasta=baja, cantidad=len(bandas["BAJA"])),
        BandaSeguridad(codigo="MEDIA", desde=baja + 1, hasta=alta - 1, cantidad=len(bandas["MEDIA"])),
        BandaSeguridad(codigo="ALTA", desde=alta, hasta=5, cantidad=len(bandas["ALTA"])),
    ], sin_senales=len(bandas["SIN"]))


@usar_contexto
def seguimiento(sesion: Session, codigo_cuenta: str, salon: str | None, ahora: datetime) -> SeguimientoPanel:
    alcance = resolver_alcance(sesion, codigo_cuenta, salon, ahora)
    lecturas = Lecturas(sesion, alcance)
    parametros = leer_parametros(sesion)
    test, estados = _test(lecturas, parametros)
    actividad, estudiantes, dias = detenidos(lecturas, parametros)
    return SeguimientoPanel(
        fecha=ahora.date(),
        salon=SalonPanel(codigo=alcance.salon.codigo, nombre=alcance.salon.nombre) if alcance.salon else None,
        total_estudiantes=len(alcance.ids),
        indicadores=_indicadores(lecturas, parametros, estados),
        avisos=_avisos(lecturas, parametros),
        test=test,
        cuestionarios=_cuestionarios(lecturas, parametros),
        tramos=_tramos(lecturas),
        detenidos=DetenidosPanel(actividad=actividad.codigo, titulo=actividad.titulo, cantidad=len(estudiantes),
                                 dias=dias) if actividad else None,
        seguridad=_seguridad(lecturas, parametros))
