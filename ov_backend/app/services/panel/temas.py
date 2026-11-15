"""Evaluadores de los temas «Para conversar» del perfil del estudiante (ajuste panel-estudiantes; reglas definitivas
del ajuste pendientes-orientadora).

Son filas de `alerta` en un grupo con `en_inicio = false`: el texto, el orden, la pestaña, los umbrales y las
plantillas de las frases opcionales están en la base. Cada evaluador devuelve, por estudiante que cumple, los datos
para las `{clave}` de `descripcion_perfil`; una frase opcional (`{voz}`, `{idea}`…) llega armada, con un espacio
delante, o vacía. Se registran en `EVALUADORES_ALERTA` (`alertas.py`) con sus claves y defectos.

Lecturas: los evaluadores no consultan cada uno por su cuenta. Comparten lo que el Resumen ya leyó (planes activos,
áreas sugeridas, partida y llegada) y, encima, una lectura por tabla que se hace solo la primera vez que una regla
activa la pide (motivos, conocimiento, dudas abiertas, complicaciones). Los registros de todas las filas activas se
leen en una sola consulta (`WHERE ítem IN (…)`): una fila nueva de `eleccion_registro` no suma consultas."""

from collections import defaultdict

from sqlalchemy import func, select

from app.core.contexto import contexto
from app.models import (
    ComplicacionTarjeta, ConocimientoTarjeta, DudaTarjeta, EstadoDuda, ItemRegistro, MomentoAplicacion, MotivoTarjeta,
    OpcionLista, ProgresoActividad, RespuestaConocimiento, RespuestaRegistro,
)
from app.services.panel.autopercepcion import comparar, dimensiones_de, instrumento_autopercepcion, mediciones_del_alcance
from app.services.panel.comun import Lecturas, areas_de_planes, planes_del_perfil
from app.services.panel.textos import resolver_texto, unir
from app.services.planes.consultas import opciones_lista
from app.services.referencias import referenciable

LISTA_CONOCIMIENTO = "CONOCIMIENTO_ORIENTADORA"
# Las columnas de medidor de `tarjeta_carrera` (1 a 3). Sus nombres y niveles están en los parámetros de la fila.
MEDIDORES = ("entusiasmo", "capacidad", "recursos")
# Evaluadores que leen registros: el ítem de `item` y los de `datos` se leen juntos, en una consulta.
EVALUADORES_CON_REGISTRO = frozenset({"eleccion_registro", "valores_fuera_del_plan"})


# --- Lecturas compartidas -------------------------------------------------------------------------

def _planes(lecturas: Lecturas, cuenta_id: int) -> dict[int, tuple]:
    """Sus planes activos por prioridad: {prioridad: (tarjeta, carrera, institución)}."""
    return {t.prioridad: (t, c, i) for t, c, i in planes_del_perfil(lecturas, cuenta_id)}


def _plan_a(lecturas: Lecturas, cuenta_id: int):
    return _planes(lecturas, cuenta_id).get(1)


def _tarjetas_plan_a(lecturas: Lecturas) -> dict[int, int]:
    """{tarjeta del Plan A: cuenta}, de todo el alcance."""
    return {plan[0].id: cuenta_id for cuenta_id in lecturas.alcance.ids if (plan := _plan_a(lecturas, cuenta_id))}


def _por_plan_a(lecturas: Lecturas, clave: str, leer) -> dict[int, object]:
    """Una lectura por tabla sobre las tarjetas del Plan A del alcance, solo la primera vez que una regla la pide."""
    def calcular():
        tarjetas = _tarjetas_plan_a(lecturas)
        return leer(list(tarjetas)) if tarjetas else {}
    return lecturas.una_vez(("temas", clave), calcular)


def _motivos(lecturas: Lecturas) -> dict[int, list[MotivoTarjeta]]:
    def leer(ids):
        por_tarjeta = defaultdict(list)
        for fila in lecturas.sesion.scalars(select(MotivoTarjeta).where(MotivoTarjeta.tarjeta_id.in_(ids))
                                            .order_by(MotivoTarjeta.tarjeta_id, MotivoTarjeta.posicion)):
            por_tarjeta[fila.tarjeta_id].append(fila)
        return por_tarjeta
    return _por_plan_a(lecturas, "motivos", leer)


def _respondio_no(lecturas: Lecturas) -> dict[int, int]:
    def leer(ids):
        return dict(lecturas.sesion.execute(select(ConocimientoTarjeta.tarjeta_id, func.count()).where(
            ConocimientoTarjeta.tarjeta_id.in_(ids), ConocimientoTarjeta.respuesta == RespuestaConocimiento.NO)
            .group_by(ConocimientoTarjeta.tarjeta_id)).all())
    return _por_plan_a(lecturas, "conocimiento", leer)


def _dudas_abiertas(lecturas: Lecturas) -> dict[int, int]:
    def leer(ids):
        return dict(lecturas.sesion.execute(select(DudaTarjeta.tarjeta_id, func.count()).where(
            DudaTarjeta.tarjeta_id.in_(ids), DudaTarjeta.estado == EstadoDuda.ABIERTA)
            .group_by(DudaTarjeta.tarjeta_id)).all())
    return _por_plan_a(lecturas, "dudas", leer)


def _complicaciones(lecturas: Lecturas) -> dict[int, list[str]]:
    """Sus textos, en el orden en que las registró: las de lista en minúscula; las escritas a mano, tal cual."""
    def leer(ids):
        definiciones = contexto(lecturas.sesion).definiciones
        por_tarjeta = defaultdict(list)
        for fila in lecturas.sesion.scalars(select(ComplicacionTarjeta).where(ComplicacionTarjeta.tarjeta_id.in_(ids))
                                            .order_by(ComplicacionTarjeta.tarjeta_id, ComplicacionTarjeta.numero)):
            por_tarjeta[fila.tarjeta_id].append(definiciones.obtener(OpcionLista, fila.opcion_id).texto.lower()
                                                if fila.opcion_id else fila.texto_otro)
        return por_tarjeta
    return _por_plan_a(lecturas, "complicaciones", leer)


def _items_de_filas(lecturas: Lecturas) -> dict[int, str]:
    """{id: código} de los ítems que nombran las filas activas que leen registros (`item` y `datos`)."""
    definiciones = contexto(lecturas.sesion).definiciones
    codigos = set()
    for evaluador, parametros in lecturas.filas_activas:
        if evaluador in EVALUADORES_CON_REGISTRO:
            codigos.add(parametros["item"])
            codigos.update((parametros.get("datos") or {}).values())
    items = (definiciones.por_codigo(ItemRegistro, c) for c in codigos)
    return {i.id: i.codigo for i in items if i is not None}


def _registros(lecturas: Lecturas) -> dict[tuple[int, str], RespuestaRegistro]:
    """{(cuenta, código del ítem): intento vigente}, en una sola consulta para todas las filas activas."""
    def leer():
        items = _items_de_filas(lecturas)
        if not items or not lecturas.alcance.ids:
            return {}
        filas = lecturas.sesion.execute(select(ProgresoActividad.cuenta_id, RespuestaRegistro).join(
            RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).where(
            ProgresoActividad.cuenta_id.in_(lecturas.alcance.ids), RespuestaRegistro.vigente,
            RespuestaRegistro.item_registro_id.in_(items)))
        return {(cuenta_id, items[r.item_registro_id]): r for cuenta_id, r in filas}
    return lecturas.una_vez(("temas", "registros"), leer)


def _frase(parametros, clave: str, datos: dict) -> str:
    """La plantilla `frases[clave]` llena con `datos`, o vacía."""
    return resolver_texto(parametros["frases"][clave], datos)


def _con_idea(parametros, tarjeta) -> str:
    """` La idea de estudiarla vino {origen}.` si su origen está entre `origenes`."""
    origen = tarjeta.idea_origen.value if tarjeta.idea_origen else None
    if not parametros.get("origenes") or origen not in parametros["origenes"]:
        return ""
    return _frase(parametros, "idea", {"origen": parametros["textos_origen"][origen]})


# --- Registros -------------------------------------------------------------------------------------

def _elegida_vigente(respuesta: RespuestaRegistro | None) -> list[dict]:
    """Lo marcado tal como se mostró; nada de un ítem `sensible` o `emocional` (regla de referencias)."""
    return list(respuesta.opciones_elegidas or ()) if referenciable(respuesta) else []


def _es_exclusiva(item: ItemRegistro, codigo: str) -> bool:
    return any(o["codigo"] == codigo and o.get("exclusiva") for o in item.opciones_propias or ())


def carrera_guardada(respuesta: RespuestaRegistro, plan: str) -> str | None:
    """La carrera de `plan_a` o `plan_b` con que respondió, de `valores_contexto`: sus marcadores o, si no los tiene,
    los ecos mostrados (`proyecto`, `cabecera` y `carrera` dan el Plan A; `plan_a_b`, los dos)."""
    valores = respuesta.valores_contexto or {}
    marcadores = valores.get("marcadores") or {}
    if marcadores.get(plan):
        return marcadores[plan]
    if plan == "plan_a" and marcadores.get("carrera"):
        return marcadores["carrera"]
    posicion = 0 if plan == "plan_a" else 1
    for eco in valores.get("ecos_mostrar") or ():
        if not isinstance(eco, dict):
            continue
        if eco.get("planes") and len(eco["planes"]) > posicion:
            return eco["planes"][posicion].get("carrera")
        if plan == "plan_a" and eco.get("carrera"):
            return eco["carrera"]
    return None


def _plan_cambio(lecturas: Lecturas, cuenta_id: int, respuesta: RespuestaRegistro, parametros) -> bool:
    """`omitir_si_cambio`: el plan ya no existe o su carrera no es la de la respuesta. Sin la carrera guardada, se
    omite solo si la fila la nombra en `valores_requeridos` (el texto la usa)."""
    planes = _planes(lecturas, cuenta_id)
    for plan in parametros.get("omitir_si_cambio") or ():
        actual = planes.get(1 if plan == "plan_a" else 2)
        if actual is None:
            return True
        guardada = carrera_guardada(respuesta, plan)
        if guardada is None:
            if plan in (parametros.get("valores_requeridos") or ()):
                return True
        elif guardada != actual[1].nombre:
            return True
    return False


def _eleccion_registro(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """En el intento vigente de `item` marcó alguna de `opciones` (aunque el texto haya quedado vacío o abierto).
    `opcion`: el texto mostrado de lo marcado de la lista; `datos` ({clave: ítem}) trae la elección de otro ítem para
    las frases de `frases`; cada marcador de plan de la respuesta (`plan_a`, `plan_b`) también se devuelve."""
    definiciones = contexto(lecturas.sesion).definiciones
    registros = _registros(lecturas)
    opciones = set(parametros["opciones"])
    datos_otros = parametros.get("datos") or {}
    resultado = {}
    for cuenta_id in lecturas.alcance.ids:
        respuesta = registros.get((cuenta_id, parametros["item"]))
        marcadas = [e for e in _elegida_vigente(respuesta) if e["codigo"] in opciones]
        if not marcadas or _plan_cambio(lecturas, cuenta_id, respuesta, parametros):
            continue
        datos = {"opcion": unir(e["texto"] for e in marcadas)}
        for plan in ("plan_a", "plan_b"):
            datos[plan] = carrera_guardada(respuesta, plan) or ""
        otros = {}
        for clave, codigo_item in datos_otros.items():
            item = definiciones.por_codigo(ItemRegistro, codigo_item)
            elegidas = _elegida_vigente(registros.get((cuenta_id, codigo_item)))
            if elegidas and not any(_es_exclusiva(item, e["codigo"]) for e in elegidas):
                otros[clave] = unir(e["texto"] for e in elegidas)
        for frase, plantilla in (parametros.get("frases") or {}).items():
            faltan = [c for c in datos_otros if f"{{{c}}}" in plantilla and c not in otros]
            datos[frase] = "" if faltan else resolver_texto(plantilla, otros)
        resultado[cuenta_id] = datos
    return resultado


def _valores_fuera_del_plan(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """El podio vigente de `item` (ni `sensible` ni `emocional`), un Plan A con al menos un motivo de lista y ningún
    valor del podio entre esos motivos (misma lista `VALORES`, por código). `valores`: los del podio en su orden;
    `motivos`: los de lista, los tres primeros."""
    definiciones = contexto(lecturas.sesion).definiciones
    registros = _registros(lecturas)
    resultado = {}
    for cuenta_id in lecturas.alcance.ids:
        plan = _plan_a(lecturas, cuenta_id)
        podio = _elegida_vigente(registros.get((cuenta_id, parametros["item"])))
        if plan is None or not podio:
            continue
        de_lista = [definiciones.obtener(OpcionLista, m.opcion_id) for m in _motivos(lecturas).get(plan[0].id, ())
                    if m.opcion_id]
        if not de_lista or {e["codigo"] for e in podio} & {o.codigo for o in de_lista}:
            continue
        resultado[cuenta_id] = {"valores": unir(e["texto"] for e in podio),
                                "motivos": unir(o.texto for o in de_lista[:3])}
    return resultado


# --- Planes ----------------------------------------------------------------------------------------

def _plan_medidor(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Plan A activo con alguno de `medidores` fijado en `nivel_maximo` o menos (sin marcar no cuenta). `carrera`,
    `medidor` (el primero que cumple), `medidores` (todos, entre «» y unidos con «y»), `nivel` (el texto de `niveles`
    del primero) y las frases `idea` (con `origenes`) y `complicaciones` (con `con_complicaciones`)."""
    nombres, niveles = parametros["nombres_medidores"], parametros["niveles"]
    maximo = int(parametros["nivel_maximo"])
    medidores = [m for m in parametros["medidores"] if m in MEDIDORES]
    resultado = {}
    for cuenta_id in lecturas.alcance.ids:
        plan = _plan_a(lecturas, cuenta_id)
        if plan is None:
            continue
        tarjeta, carrera, _ = plan
        bajos = [(m, getattr(tarjeta, m)) for m in medidores
                 if getattr(tarjeta, m) is not None and getattr(tarjeta, m) <= maximo]
        if not bajos:
            continue
        datos = {"carrera": carrera.nombre, "medidor": nombres[bajos[0][0]], "nivel": niveles[bajos[0][1] - 1],
                 "medidores": unir(f"«{nombres[m]}»" for m, _ in bajos), "idea": _con_idea(parametros, tarjeta),
                 "complicaciones": ""}
        if parametros.get("con_complicaciones"):
            lista = _complicaciones(lecturas).get(tarjeta.id)
            if lista:
                datos["complicaciones"] = _frase(parametros, "complicaciones", {"lista": unir(lista)})
        resultado[cuenta_id] = datos
    return resultado


def _plan_conoce_poco(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Respondió «No» a `minimo_no` o más preguntas de conocimiento de su Plan A. `cantidad`, `total` (las preguntas
    de la lista CONOCIMIENTO_ORIENTADORA) y la frase `dudas` (`frases.dudas`, o `frases.duda` si es una)."""
    minimo = int(parametros["minimo_no"])
    total = len(opciones_lista(lecturas.sesion, LISTA_CONOCIMIENTO))
    respondio_no = _respondio_no(lecturas)
    resultado = {}
    for tarjeta_id, cuenta_id in _tarjetas_plan_a(lecturas).items():
        cantidad = respondio_no.get(tarjeta_id, 0)
        if cantidad < minimo:
            continue
        abiertas = _dudas_abiertas(lecturas).get(tarjeta_id, 0)
        dudas = _frase(parametros, "duda" if abiertas == 1 else "dudas", {"n": str(abiertas)}) if abiertas else ""
        resultado[cuenta_id] = {"cantidad": cantidad, "total": total, "dudas": dudas}
    return resultado


def _plan_fuera_de_areas(lecturas: Lecturas, _parametros) -> dict[int, dict]:
    """Su Plan A no está entre sus áreas sugeridas, con el criterio de «Planes frente al test» (Plan A y resultado
    vigente no plano). Usa las áreas que el Resumen ya leyó para «Lo que está pensando». `carrera`."""
    resultado = {}
    for cuenta_id in lecturas.alcance.ids:
        plan = _plan_a(lecturas, cuenta_id)
        if plan is not None and areas_de_planes(lecturas, cuenta_id).get(plan[1].id) is False:
            resultado[cuenta_id] = {"carrera": plan[1].nombre}
    return resultado


# --- Partida y llegada -----------------------------------------------------------------------------

def _llegada_sin_avance(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Con partida y llegada vigentes, alguna dimensión bajó de zona o sigue por trabajar en las dos (la comparación
    de «De la partida a la llegada»). `detalle`: «{dimensiones} bajó» y «{dimensiones} sigue por trabajar»
    (`textos_detalle`), cada una solo si tiene dimensiones, unidas con «; »."""
    instrumento = instrumento_autopercepcion(lecturas.sesion)
    if instrumento is None:
        return {}
    dimensiones = dimensiones_de(lecturas.sesion, instrumento)
    textos = parametros["textos_detalle"]
    resultado = {}
    for cuenta_id, por_momento in mediciones_del_alcance(lecturas).items():
        partida, llegada = por_momento.get(MomentoAplicacion.ENTRADA), por_momento.get(MomentoAplicacion.SALIDA)
        if partida is None or llegada is None:
            continue
        comparadas = comparar(dimensiones, partida, llegada)
        grupos = (("bajo", [c for c in comparadas if c.cambio == "BAJO"]),
                  ("sigue", [c for c in comparadas if c.sigue_por_trabajar]))
        partes = [resolver_texto(textos[clave], {"dimensiones": unir(f"«{c.dimension.nombre}»" for c in cuales)})
                  for clave, cuales in grupos if cuales]
        if partes:
            resultado[cuenta_id] = {"detalle": "; ".join(partes)}
    return resultado


# nombre del evaluador → (función, defectos de sus parámetros)
EVALUADORES_TEMAS = {
    # Opcionales sin defecto: `datos`, `frases`, `omitir_si_cambio` y `valores_requeridos`.
    "eleccion_registro": (_eleccion_registro, {}),
    "valores_fuera_del_plan": (_valores_fuera_del_plan, {}),
    # Opcionales sin defecto: `origenes` (con `textos_origen` y `frases.idea`) y `con_complicaciones` (con
    # `frases.complicaciones`).
    "plan_medidor": (_plan_medidor, {"nivel_maximo": 1}),
    "plan_conoce_poco": (_plan_conoce_poco, {"minimo_no": 3, "frases": {
        "duda": " Tiene {n} duda abierta.", "dudas": " Tiene {n} dudas abiertas."}}),
    "plan_fuera_de_areas": (_plan_fuera_de_areas, {}),
    "llegada_sin_avance": (_llegada_sin_avance, {"textos_detalle": {
        "bajo": "{dimensiones} bajó", "sigue": "{dimensiones} sigue por trabajar"}}),
}
