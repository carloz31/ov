"""Evaluadores de los temas «Para conversar» del perfil del estudiante (ajuste panel-estudiantes, spec §3.3).

Son filas de `alerta` en un grupo con `en_inicio = false`: el texto, el orden, la pestaña y los umbrales están en la
base. Cada evaluador devuelve, por estudiante que cumple, los datos para las `{clave}` de `descripcion_perfil`. Se
registran en `EVALUADORES_ALERTA` (`alertas.py`) con sus claves y defectos."""

from collections import defaultdict

from sqlalchemy import select

from app.core.contexto import contexto
from app.models import (
    Carrera, ComplicacionTarjeta, ConocimientoTarjeta, Dimension, MomentoAplicacion, OpcionLista,
    RespuestaConocimiento, TarjetaCarrera, ZonaDimension,
)
from app.services.panel.autopercepcion import mediciones
from app.services.panel.comun import Lecturas, leer_parametros
from app.services.panel.intereses import DatosIntereses, frente_test
from app.services.panel.textos import unir
from app.services.planes.consultas import opciones_lista

LISTA_CONOCIMIENTO = "CONOCIMIENTO_ORIENTADORA"


def planes_a(lecturas: Lecturas) -> dict[int, TarjetaCarrera]:
    """El Plan A activo de cada estudiante del alcance."""
    if not lecturas.alcance.ids:
        return {}
    return {t.cuenta_id: t for t in lecturas.sesion.scalars(select(TarjetaCarrera).where(
        TarjetaCarrera.cuenta_id.in_(lecturas.alcance.ids), TarjetaCarrera.activa, TarjetaCarrera.prioridad == 1))}


def _nombres_carreras(lecturas: Lecturas, tarjetas) -> dict[int, str]:
    ids = {t.carrera_id for t in tarjetas}
    return dict(lecturas.sesion.execute(select(Carrera.id, Carrera.nombre).where(Carrera.id.in_(ids))).all()) if ids \
        else {}


def _plan_idea_ajena(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """La idea de su Plan A vino de un origen de `origenes`. `carrera`; `origen`: el texto de `textos_origen`."""
    origenes = set(parametros["origenes"])
    tarjetas = [t for t in planes_a(lecturas).values() if t.idea_origen and t.idea_origen.value in origenes]
    carreras = _nombres_carreras(lecturas, tarjetas)
    return {t.cuenta_id: {"carrera": carreras[t.carrera_id], "origen": parametros["textos_origen"][t.idea_origen.value]}
            for t in tarjetas}


def _plan_conoce_poco(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Respondió «No» a `minimo_no` o más preguntas de conocimiento de su Plan A. `cantidad`, `total` y `preguntas`
    (los textos de la lista CONOCIMIENTO_ORIENTADORA, en su orden)."""
    tarjetas = {t.id: t.cuenta_id for t in planes_a(lecturas).values()}
    if not tarjetas:
        return {}
    preguntas = list(opciones_lista(lecturas.sesion, LISTA_CONOCIMIENTO))
    posicion = {o.codigo: i for i, o in enumerate(preguntas)}
    textos = {o.codigo: o.texto for o in preguntas}
    respondio_no = defaultdict(list)
    for tarjeta_id, pregunta in lecturas.sesion.execute(select(ConocimientoTarjeta.tarjeta_id, ConocimientoTarjeta.pregunta)
                                                        .where(ConocimientoTarjeta.tarjeta_id.in_(tarjetas),
                                                               ConocimientoTarjeta.respuesta == RespuestaConocimiento.NO)):
        respondio_no[tarjetas[tarjeta_id]].append(pregunta.value)
    minimo = int(parametros["minimo_no"])
    return {cuenta_id: {"cantidad": len(codigos), "total": len(preguntas),
                        "preguntas": unir(textos.get(c, c) for c in sorted(codigos, key=lambda c: posicion.get(c, 99)))}
            for cuenta_id, codigos in respondio_no.items() if len(codigos) >= minimo}


def _plan_complicaciones(lecturas: Lecturas, _parametros) -> dict[int, dict]:
    """Registró alguna complicación en su Plan A. `complicaciones`: sus textos, en el orden en que las registró."""
    tarjetas = {t.id: t.cuenta_id for t in planes_a(lecturas).values()}
    if not tarjetas:
        return {}
    definiciones = contexto(lecturas.sesion).definiciones
    por_cuenta = defaultdict(list)
    for fila in lecturas.sesion.scalars(select(ComplicacionTarjeta).where(ComplicacionTarjeta.tarjeta_id.in_(tarjetas))
                                        .order_by(ComplicacionTarjeta.numero)):
        texto = definiciones.obtener(OpcionLista, fila.opcion_id).texto if fila.opcion_id else fila.texto_otro
        por_cuenta[tarjetas[fila.tarjeta_id]].append(texto.lower() if fila.opcion_id else texto)
    return {cuenta_id: {"complicaciones": unir(textos)} for cuenta_id, textos in por_cuenta.items()}


def _plan_fuera_de_areas(lecturas: Lecturas, _parametros) -> dict[int, dict]:
    """Su Plan A no está entre sus áreas sugeridas: el criterio de «Planes frente al test» del Inicio (Plan A y
    resultado vigente no plano). `carrera`."""
    datos = DatosIntereses(lecturas.sesion, lecturas.alcance)
    fuera = frente_test(lecturas, datos, leer_parametros(lecturas.sesion)).no_coinciden
    return {c: {"carrera": datos.carreras[datos.plan_a[c].carrera_id].nombre} for c in fuera}


def _dimension_por_trabajar(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """En su medición más reciente de partida y llegada (llegada si la tiene; si no, partida) alguna dimensión quedó
    «Por trabajar». `momento`: el texto de `textos_momento`; `dimensiones`: sus nombres en el orden del cuestionario,
    entre comillas latinas."""
    definiciones = contexto(lecturas.sesion).definiciones
    datos = {}
    for cuenta_id, por_momento in mediciones(lecturas.sesion, lecturas.alcance.ids).items():
        momento = MomentoAplicacion.SALIDA if MomentoAplicacion.SALIDA in por_momento else MomentoAplicacion.ENTRADA
        medicion = por_momento.get(momento)
        if medicion is None:
            continue
        dimensiones = sorted((definiciones.obtener(Dimension, d) for d, zona in medicion.zonas.items()
                              if zona == ZonaDimension.POR_TRABAJAR), key=lambda d: (d.orden, d.codigo))
        if dimensiones:
            datos[cuenta_id] = {"momento": parametros["textos_momento"][momento.value],
                                "dimensiones": unir(f"«{d.nombre}»" for d in dimensiones)}
    return datos


# nombre del evaluador → (función, defectos de sus parámetros)
EVALUADORES_TEMAS = {
    "plan_idea_ajena": (_plan_idea_ajena, {
        "origenes": ["FAMILIA", "CONOCIDO"],
        "textos_origen": {"FAMILIA": "de su familia", "CONOCIDO": "de alguien que conoce"}}),
    "plan_conoce_poco": (_plan_conoce_poco, {"minimo_no": 3}),
    "plan_complicaciones": (_plan_complicaciones, {}),
    "plan_fuera_de_areas": (_plan_fuera_de_areas, {}),
    "dimension_por_trabajar": (_dimension_por_trabajar, {
        "textos_momento": {"ENTRADA": "partida", "SALIDA": "llegada"}}),
}
