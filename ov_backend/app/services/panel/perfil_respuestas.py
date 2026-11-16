"""Pestaña Respuestas del perfil (ajuste panel-estudiantes §9; presentación del ajuste respuestas-orientadora): los
registros del estudiante, ya agrupados y ordenados, con su marca, y al desplegar uno sus ítems en lectura. Las preguntas
van con los valores con que respondió (los de `valores_contexto`) y los ecos, ya resueltos en líneas (`EcoLinea`). Solo
el intento vigente; nunca el tipo del LLM, sus motivos, la pista ni los intentos anteriores.

Marcas (respuestas-orientadora §1): requiere atención (`sensible`) prima sobre sin contenido (`tipo_final` vacío o
fuera de tema). En «Destacados» también se ve todo registro con una respuesta sensible (§2.4).

Eco cambiado (§3.4): se compara cada eco **mostrado** con el de hoy del mismo código y por valor (cita, elección,
carrera e institución de cada plan). Los ecos del mismo registro nunca se marcan cambiados: su contenido está arriba.
Un eco que hoy ya no se muestra (por ejemplo, la fuente pasó a sensible) no cuenta como cambio. `eco_cambiado()`, que
decide lo que ve el estudiante, no se usa aquí.

Auditoría del panel (H1): el contexto de hoy de cada ítem sale de `LecturaContexto`, que lee una vez por petición y
arma cada ítem una sola vez."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Espacio, EstadoProgreso, EstadoRespuestaRegistro, EventoUso, ItemRegistro, ProgresoActividad,
    RespuestaRegistro, TipoActividad, TipoEventoUso,
)
from app.schemas.panel_estudiante import (
    EcoLinea, HoyEco, ItemLectura, OpcionElegidaLectura, PlanEco, RegistroFila, RegistroLectura, RespuestasEstudiante,
)
from app.services.avance import por_espacio
from app.services.panel.contexto_lectura import LecturaContexto
from app.services.panel.perfil_acceso import estudiante_de_orientadora
from app.services.panel.respuestas_resumen import TIPOS_SIN_CONTENIDO, destacados_del_colegio
from app.services.registro.contexto import con_marcadores, depende_de_otros
from app.services.registro.eleccion import FUENTES_PIEZAS, es_otra

ORDEN_GRUPOS = {"TRAMO": 0, "OPCIONALES": 1, "AUN_NO_LLEGA": 2}
ORDEN_MARCAS = {"REQUIERE_ATENCION": 0, "SIN_CONTENIDO": 1, None: 2}
FORMAS_PLANES = ("plan_a_b", "hoy")
SEPARADOR_CITA = " / "


def _registros_en_orden(sesion: Session) -> list[tuple[Bloque, Actividad, bool]]:
    """Los registros del camino por tramo y orden; después, los de la ciudad (misiones opcionales)."""
    filas = []
    for espacio, ciudad in ((Espacio.MISIONES_CAMPO, False), (Espacio.CIUDAD, True)):
        filas += [(b, a, ciudad) for b, a in sorted(por_espacio(sesion, espacio),
                                                    key=lambda par: (par[0].numero, par[1].orden, par[1].codigo))
                  if a.tipo == TipoActividad.REGISTRO]
    return filas


def _items(sesion: Session, actividad_id: int) -> list[ItemRegistro]:
    return sorted((i for i in contexto(sesion).definiciones.listar(ItemRegistro) if i.actividad_id == actividad_id),
                  key=lambda i: i.orden)


def _vigentes(sesion: Session, cuenta_id: int, actividades: list[int]) -> dict[int, dict[int, RespuestaRegistro]]:
    """Por actividad, la respuesta vigente de cada ítem."""
    por_actividad = {}
    if actividades:
        for actividad_id, respuesta in sesion.execute(select(ProgresoActividad.actividad_id, RespuestaRegistro).join(
                RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).where(
                ProgresoActividad.cuenta_id == cuenta_id, ProgresoActividad.actividad_id.in_(actividades),
                RespuestaRegistro.vigente)).tuples():
            por_actividad.setdefault(actividad_id, {})[respuesta.item_registro_id] = respuesta
    return por_actividad


def marca_item(respuesta: RespuestaRegistro | None) -> str | None:
    if respuesta is None:
        return None
    if respuesta.sensible:
        return "REQUIERE_ATENCION"
    if respuesta.tipo_final in TIPOS_SIN_CONTENIDO:
        return "VACIA" if respuesta.tipo_final == "vacio" else "FUERA_DE_TEMA"
    return None


# --- Ecos -------------------------------------------------------------------------------------------------

def _planes(eco: dict) -> list[PlanEco]:
    return [PlanEco(letra=letra, carrera=p.get("carrera"), institucion=p.get("institucion"))
            for letra, p in zip("AB", eco.get("planes") or ())]


def _hoy_item(eco: dict, de_hoy: dict | None) -> HoyEco | None:
    if de_hoy is None:
        return None
    cita = de_hoy.get("texto") if de_hoy.get("texto") != eco.get("texto") else None
    opciones = de_hoy.get("eleccion") if de_hoy.get("eleccion") != eco.get("eleccion") else None
    if not cita and not opciones:
        return None
    return HoyEco(cita=SEPARADOR_CITA.join(cita) if cita else None, opciones=opciones)


def _hoy_planes(antes: list[PlanEco], de_hoy: dict | None) -> HoyEco | None:
    if de_hoy is None:
        return None
    hoy = _planes(de_hoy)
    previos = {p.letra: (p.carrera, p.institucion) for p in antes}
    cambiados = [p for p in hoy if previos.get(p.letra) not in (None, (p.carrera, p.institucion))]
    return HoyEco(planes=cambiados) if cambiados else None


def _valor_otro(eco: dict) -> str | None:
    """El dato principal de un eco de otra forma: su carrera o su texto (pasos y proyecto no tienen uno solo)."""
    return eco.get("carrera") or eco.get("texto")


def _hoy_otro(eco: dict, de_hoy: dict | None) -> HoyEco | None:
    if de_hoy is None or not _valor_otro(de_hoy) or _valor_otro(de_hoy) == _valor_otro(eco):
        return None
    return HoyEco(texto=_valor_otro(de_hoy))


def _lineas_eco(sesion: Session, actividad: Actividad, numeros: dict[str, int], mostrados: list[dict],
                de_hoy: list[dict] | None) -> list[EcoLinea]:
    """Las líneas de eco de un ítem: las del mismo registro juntas en una, el resto una por eco. `de_hoy`: los ecos
    de hoy, para decir qué cambió (`None` si se muestran los de hoy)."""
    definiciones = contexto(sesion).definiciones
    hoy_por_codigo = {e.get("codigo"): e for e in de_hoy or ()}
    mismo, lineas = [], []
    for eco in mostrados:
        actual = hoy_por_codigo.get(eco.get("codigo")) if de_hoy is not None else None
        if eco.get("origen") == "ITEM":
            if eco["codigo"] in numeros:
                mismo.append(numeros[eco["codigo"]])
                continue
            fuente = definiciones.por_codigo(ItemRegistro, eco["codigo"])
            titulo = definiciones.obtener(Actividad, fuente.actividad_id).titulo if fuente else eco.get("nombre")
            texto = eco.get("texto")
            lineas.append(EcoLinea(fuente="TEXTO" if texto else "ELECCION", actividad=titulo,
                                   cita=SEPARADOR_CITA.join(texto) if texto else None,
                                   opciones=list(eco.get("eleccion") or ()), hoy=_hoy_item(eco, actual)))
        elif eco.get("forma") in FORMAS_PLANES:
            planes = _planes(eco)
            lineas.append(EcoLinea(fuente="PLANES", planes=planes, hoy=_hoy_planes(planes, actual)))
        else:
            lineas.append(EcoLinea(fuente="OTRO", eco=dict(eco), hoy=_hoy_otro(eco, actual)))
    if mismo:
        lineas.insert(0, EcoLinea(fuente="MISMO_REGISTRO", numeros=sorted(set(mismo))))
    return lineas


# --- Ítems y registros -------------------------------------------------------------------------------------

def _item(sesion: Session, lectura: LecturaContexto, actividad: Actividad, numeros: dict[str, int],
          item: ItemRegistro, respuesta: RespuestaRegistro | None) -> ItemLectura:
    valores = (respuesta.valores_contexto or {}) if respuesta else {}
    guardados = "marcadores" in valores and "ecos_mostrar" in valores
    mostrados_guardados = list(valores.get("ecos_mostrar") or []) if guardados else []
    hoy = (lectura.hoy(item) if respuesta is None or not guardados or depende_de_otros(item) or mostrados_guardados
           else None)
    marcadores = valores.get("marcadores") if guardados else (dict(hoy.marcadores) if hoy else {})
    ecos_hoy = [dict(e) for e in hoy.ecos_mostrar] if hoy else []
    if guardados:
        ecos = _lineas_eco(sesion, actividad, numeros, mostrados_guardados, ecos_hoy if hoy else None)
    else:
        ecos = _lineas_eco(sesion, actividad, numeros, ecos_hoy, None)
    elegidas = [OpcionElegidaLectura(texto=e["texto"], otra=es_otra(item, e["codigo"]), origen=e.get("origen"),
                                     grupo=e.get("grupo")) for e in (respuesta.opciones_elegidas or [] if respuesta else [])]
    eleccion = None
    if item.fuente_opciones is not None:
        eleccion = ("PIEZAS" if item.fuente_opciones in FUENTES_PIEZAS
                    else "ORDENADA" if item.eleccion_ordenada else "LISTA")
    return ItemLectura(
        numero=numeros[item.codigo], codigo=item.codigo, marca=marca_item(respuesta),
        aun_no_lo_sabe=respuesta is not None and respuesta.estado == EstadoRespuestaRegistro.ABIERTO, ecos=ecos,
        pregunta_eleccion=con_marcadores(item.pregunta_eleccion, marcadores), eleccion=eleccion, elegidas=elegidas,
        pregunta_texto=valores.get("pregunta") or con_marcadores(item.pregunta_texto, marcadores),
        primera_respuesta=respuesta.primera_respuesta if respuesta else None,
        repregunta=respuesta.repregunta if respuesta and respuesta.segunda_respuesta else None,
        segunda_respuesta=respuesta.segunda_respuesta if respuesta else None, respondido=respuesta is not None)


def _lectura(sesion: Session, lectura: LecturaContexto, actividad: Actividad,
             vigentes: dict[int, RespuestaRegistro]) -> RegistroLectura:
    items = _items(sesion, actividad.id)
    numeros = {item.codigo: numero for numero, item in enumerate(items, start=1)}
    return RegistroLectura(actividad=actividad.codigo, items=[
        _item(sesion, lectura, actividad, numeros, item, vigentes.get(item.id)) for item in items])


def _fila(bloque: Bloque, actividad: Actividad, ciudad: bool, estado, fecha, suyas: dict[int, RespuestaRegistro],
          destacado: bool) -> RegistroFila:
    marcas = [marca_item(r) for r in suyas.values()]
    sin_contenido = sum(1 for r in suyas.values() if r.tipo_final in TIPOS_SIN_CONTENIDO)
    marca = "REQUIERE_ATENCION" if "REQUIERE_ATENCION" in marcas else "SIN_CONTENIDO" if sin_contenido else None
    llego = estado is not None
    return RegistroFila(
        actividad=actividad.codigo, titulo=actividad.titulo, tramo=bloque.nombre,
        tramo_numero=None if ciudad else bloque.numero, ciudad=ciudad, destacado=destacado,
        en_destacados=destacado or marca == "REQUIERE_ATENCION",
        estado="COMPLETADO" if estado == EstadoProgreso.COMPLETADA else "EN_CURSO" if llego else "AUN_NO_LLEGA",
        fecha=fecha, grupo="AUN_NO_LLEGA" if not llego else "OPCIONALES" if ciudad else "TRAMO", marca=marca,
        sin_contenido=sin_contenido)


@usar_contexto
def respuestas(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> RespuestasEstudiante:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    cuenta_id = acceso.estudiante.id
    registros = _registros_en_orden(sesion)
    ids = [a.id for _, a, _ in registros]
    progresos = dict(sesion.execute(select(ProgresoActividad.actividad_id, ProgresoActividad.estado).where(
        ProgresoActividad.cuenta_id == cuenta_id, ProgresoActividad.actividad_id.in_(ids))).all()) if ids else {}
    fechas = dict(sesion.execute(select(EventoUso.id_referencia, func.max(EventoUso.fecha_hora)).where(
        EventoUso.cuenta_id == cuenta_id, EventoUso.tipo == TipoEventoUso.COMPLETA_ACTIVIDAD,
        EventoUso.id_referencia.in_(ids)).group_by(EventoUso.id_referencia)).all()) if ids else {}
    vigentes = _vigentes(sesion, cuenta_id, ids)
    destacados = set(destacados_del_colegio(sesion, acceso.salon.salon.colegio_id))
    filas = []
    for posicion, (bloque, actividad, ciudad) in enumerate(registros):
        estado = progresos.get(actividad.id)
        fecha = (fechas[actividad.id].date() if estado == EstadoProgreso.COMPLETADA and actividad.id in fechas
                 else None)
        fila = _fila(bloque, actividad, ciudad, estado, fecha, vigentes.get(actividad.id, {}),
                     actividad.id in destacados)
        filas.append(((ORDEN_GRUPOS[fila.grupo], fila.tramo_numero or 0 if fila.grupo == "TRAMO" else 0,
                       ORDEN_MARCAS[fila.marca] if fila.grupo != "AUN_NO_LLEGA" else 0, posicion), fila, actividad))
    filas.sort(key=lambda f: f[0])
    atencion = [(a, f) for _, f, a in filas if f.marca == "REQUIERE_ATENCION"]
    leer_primero = []
    if atencion:
        items = [i for a, _ in atencion for i in _items(sesion, a.id)]
        lectura = LecturaContexto(sesion, acceso.estudiante, items)
        leer_primero = [_lectura(sesion, lectura, a, vigentes.get(a.id, {})) for a, _ in atencion]
    lista = [f for _, f, _ in filas]
    return RespuestasEstudiante(
        hay_destacados=bool(destacados), total_destacados=sum(f.en_destacados for f in lista),
        por_revisar_destacados=sum(1 for f in lista if f.marca and f.en_destacados),
        por_revisar_todos=sum(1 for f in lista if f.marca), registros=lista, leer_primero=leer_primero)


@usar_contexto
def registro(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, codigo_actividad: str,
             ahora: datetime) -> RegistroLectura:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    actividad = next((a for _, a, _ in _registros_en_orden(sesion) if a.codigo == codigo_actividad), None)
    if actividad is None:
        raise ErrorAccion("Registro no encontrado", estado_http=404)
    vigentes = _vigentes(sesion, acceso.estudiante.id, [actividad.id]).get(actividad.id, {})
    return _lectura(sesion, LecturaContexto(sesion, acceso.estudiante, _items(sesion, actividad.id)), actividad, vigentes)
