"""Pestaña Respuestas del perfil (ajuste panel-estudiantes §9): los registros del estudiante con sus etiquetas y, al
desplegar uno, sus ítems en lectura. Las preguntas y los ecos van con los valores con que respondió (los de
`valores_contexto`); si hoy cambiaron (`eco_cambiado`, la misma condición que ve el estudiante), el registro lo dice y
el ítem trae también los ecos de hoy. Solo el intento vigente; nunca el tipo del LLM, sus motivos, la pista ni los
intentos anteriores."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Espacio, EstadoProgreso, EventoUso, ItemRegistro, ProgresoActividad, RespuestaRegistro,
    TipoActividad, TipoEventoUso,
)
from app.schemas.panel_estudiante import (
    ConteoEtiqueta, ItemLectura, OpcionElegidaLectura, RegistroFila, RegistroLectura, RespuestasEstudiante,
)
from app.services.avance import por_espacio
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora
from app.services.panel.respuestas_resumen import destacados_del_salon, etiquetas
from app.services.registro.contexto import (
    MarcadorSinValor, con_marcadores, depende_de_otros, eco_cambiado, resolver_contexto,
)
from app.services.registro.eleccion import FUENTES_PIEZAS, es_otra

ORDEN_ETIQUETAS = ("REQUIERE_ATENCION", "SIN_CONTENIDO", "AUN_NO_LO_SABE")


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


def _hoy(sesion: Session, acceso: Acceso, item: ItemRegistro):
    try:
        return resolver_contexto(sesion, acceso.estudiante, item.codigo)
    except MarcadorSinValor:
        return None


def _cambio(sesion: Session, acceso: Acceso, item: ItemRegistro, respuesta: RespuestaRegistro) -> bool:
    return depende_de_otros(item) and eco_cambiado(item, respuesta, _hoy(sesion, acceso, item))


def _item(sesion: Session, acceso: Acceso, numero: int, item: ItemRegistro,
          respuesta: RespuestaRegistro | None) -> ItemLectura:
    valores = (respuesta.valores_contexto or {}) if respuesta else {}
    guardados = "marcadores" in valores and "ecos_mostrar" in valores
    hoy = _hoy(sesion, acceso, item) if respuesta is None or not guardados or depende_de_otros(item) else None
    marcadores = valores.get("marcadores") if guardados else (dict(hoy.marcadores) if hoy else {})
    cambio = respuesta is not None and guardados and eco_cambiado(item, respuesta, hoy)
    elegidas = [OpcionElegidaLectura(texto=e["texto"], otra=es_otra(item, e["codigo"]), origen=e.get("origen"),
                                     grupo=e.get("grupo")) for e in (respuesta.opciones_elegidas or [] if respuesta else [])]
    eleccion = None
    if item.fuente_opciones is not None:
        eleccion = ("PIEZAS" if item.fuente_opciones in FUENTES_PIEZAS
                    else "ORDENADA" if item.eleccion_ordenada else "LISTA")
    return ItemLectura(
        numero=numero, codigo=item.codigo, nombre=item.nombre, etiquetas=etiquetas(respuesta) if respuesta else [],
        dialogo=con_marcadores(item.dialogo, marcadores),
        ecos=list(valores.get("ecos_mostrar") or []) if guardados else ([dict(e) for e in hoy.ecos_mostrar] if hoy else []),
        ecos_hoy=[dict(e) for e in hoy.ecos_mostrar] if cambio and hoy else None, ecos_de_hoy=not guardados,
        pregunta_eleccion=con_marcadores(item.pregunta_eleccion, marcadores), eleccion=eleccion, elegidas=elegidas,
        pregunta_texto=valores.get("pregunta") or con_marcadores(item.pregunta_texto, marcadores),
        primera_respuesta=respuesta.primera_respuesta if respuesta else None,
        repregunta=respuesta.repregunta if respuesta and respuesta.segunda_respuesta else None,
        segunda_respuesta=respuesta.segunda_respuesta if respuesta else None, respondido=respuesta is not None)


def _lectura(sesion: Session, acceso: Acceso, actividad: Actividad,
             vigentes: dict[int, RespuestaRegistro]) -> RegistroLectura:
    return RegistroLectura(actividad=actividad.codigo, items=[
        _item(sesion, acceso, numero, item, vigentes.get(item.id))
        for numero, item in enumerate(_items(sesion, actividad.id), start=1)])


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
    destacados = set(destacados_del_salon(sesion, acceso.estudiante.salon_id))
    items = {i.id: i for i in contexto(sesion).definiciones.listar(ItemRegistro) if i.actividad_id in set(ids)}
    filas, leer_primero = [], []
    for bloque, actividad, ciudad in registros:
        suyas = vigentes.get(actividad.id, {})
        conteo = {e: 0 for e in ORDEN_ETIQUETAS}
        for respuesta in suyas.values():
            for etiqueta in etiquetas(respuesta):
                conteo[etiqueta] += 1
        estado = progresos.get(actividad.id)
        filas.append(RegistroFila(
            actividad=actividad.codigo, titulo=actividad.titulo, tramo=bloque.nombre, ciudad=ciudad,
            destacado=actividad.id in destacados,
            estado="COMPLETADO" if estado == EstadoProgreso.COMPLETADA else "EN_CURSO" if estado else "AUN_NO_LLEGA",
            fecha=fechas[actividad.id].date() if estado == EstadoProgreso.COMPLETADA and actividad.id in fechas
            else None,
            etiquetas=[ConteoEtiqueta(etiqueta=e, cantidad=n) for e, n in conteo.items() if n],
            cambio_despues=any(_cambio(sesion, acceso, items[r.item_registro_id], r) for r in suyas.values())))
        if conteo["REQUIERE_ATENCION"]:
            leer_primero.append(_lectura(sesion, acceso, actividad, suyas))
    return RespuestasEstudiante(hay_destacados=bool(destacados), registros=filas, leer_primero=leer_primero)


@usar_contexto
def registro(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, codigo_actividad: str,
             ahora: datetime) -> RegistroLectura:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    actividad = next((a for _, a, _ in _registros_en_orden(sesion) if a.codigo == codigo_actividad), None)
    if actividad is None:
        raise ErrorAccion("Registro no encontrado", estado_http=404)
    vigentes = _vigentes(sesion, acceso.estudiante.id, [actividad.id]).get(actividad.id, {})
    return _lectura(sesion, acceso, actividad, vigentes)
