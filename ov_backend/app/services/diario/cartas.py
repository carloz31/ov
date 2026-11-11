"""Cartas del diario (ajuste cartas-diario): fijas o adaptadas, sin LLM.

Una carta adaptada lleva `variantes = {huecos, variantes}`. Al desbloquearse se toma la primera variante cuyas
condiciones se cumplen todas y se llenan sus huecos; si ninguna cumple, falta un hueco o algún ítem que la carta lee
tiene su intento vigente `sensible` o con tipo final `emocional`, va `pregunta` (el respaldo). Solo lee opciones
marcadas, marcadores guardados, el Plan A y la opción inicial: nunca lo que el estudiante escribió.

Condiciones: ELIGIO / NO_ELIGIO (`item`, `opciones`) y OPCION_INICIAL (`valor`: MISMA, OTRA o SIN_OPCION; sin Plan A
no se cumple ninguna). Huecos: OPCION (`item`, `nombres`: la primera opción marcada), MARCADOR (`item`, `marcador`,
`origen` opcional: el valor guardado en `valores_contexto['marcadores']`), PLAN_A y OPCION_INICIAL (nombre de la
carrera).
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto
from app.models import Carrera, Cuenta, ItemRegistro, PreguntaDiario, ProgresoActividad, RespuestaRegistro, TarjetaCarrera
from app.services.referencias import referenciable

HUECO = re.compile(r'\{([a-z_]+)\}')


def huecos_de(texto: str) -> set[str]:
    return set(HUECO.findall(texto or ''))


def items_leidos(variantes: dict) -> set[str]:
    """Los ítems de registro que la carta lee: los de sus condiciones y los de sus huecos (con su origen)."""
    items = {c['item'] for v in variantes['variantes'] for c in v['condiciones'] if 'item' in c}
    for hueco in variantes['huecos'].values():
        items |= {hueco[clave] for clave in ('item', 'origen') if hueco.get(clave)}
    return items


def _vigentes(sesion: Session, cuenta: Cuenta, codigos: set[str]) -> dict[str, RespuestaRegistro]:
    definiciones = contexto(sesion).definiciones
    ids = {definiciones.por_codigo(ItemRegistro, c).id: c for c in codigos}
    if not ids:
        return {}
    return {ids[r.item_registro_id]: r for r in sesion.scalars(select(RespuestaRegistro).join(
        ProgresoActividad, ProgresoActividad.id == RespuestaRegistro.progreso_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, RespuestaRegistro.vigente,
        RespuestaRegistro.item_registro_id.in_(ids)))}


def _plan_a(sesion: Session, cuenta: Cuenta) -> tuple[int, str] | None:
    return sesion.execute(select(Carrera.id, Carrera.nombre).join(
        TarjetaCarrera, TarjetaCarrera.carrera_id == Carrera.id).where(
        TarjetaCarrera.cuenta_id == cuenta.id, TarjetaCarrera.activa).order_by(
        TarjetaCarrera.prioridad).limit(1)).first()


def _marcadas(respuesta) -> list[str]:
    return [e['codigo'] for e in (respuesta.opciones_elegidas or ())] if respuesta is not None else []


class _Lectura:
    """Lo que la carta necesita de la cuenta, leído una sola vez y solo si hace falta."""

    def __init__(self, sesion: Session, cuenta: Cuenta, variantes: dict):
        tipos = {c['tipo'] for v in variantes['variantes'] for c in v['condiciones']} | {
            h['tipo'] for h in variantes['huecos'].values()}
        self.respuestas = _vigentes(sesion, cuenta, items_leidos(variantes))
        con_planes = bool(tipos & {'OPCION_INICIAL', 'PLAN_A'})
        self.plan_a = _plan_a(sesion, cuenta) if con_planes else None
        self.inicial = (sesion.execute(select(Carrera.id, Carrera.nombre).where(
            Carrera.id == cuenta.opcion_inicial_id)).first()
            if con_planes and cuenta.opcion_inicial_id is not None else None)

    def cumple(self, condicion: dict) -> bool:
        if condicion['tipo'] == 'OPCION_INICIAL':
            if self.plan_a is None:
                return False
            valor = 'SIN_OPCION' if self.inicial is None else (
                'MISMA' if self.inicial.id == self.plan_a.id else 'OTRA')
            return valor == condicion['valor']
        marcadas = _marcadas(self.respuestas.get(condicion['item']))
        eligio = any(codigo in condicion['opciones'] for codigo in marcadas)
        return eligio if condicion['tipo'] == 'ELIGIO' else bool(marcadas) and not eligio

    def valor(self, hueco: dict) -> str | None:
        if hueco['tipo'] == 'PLAN_A':
            return None if self.plan_a is None else self.plan_a.nombre
        if hueco['tipo'] == 'OPCION_INICIAL':
            return None if self.inicial is None else self.inicial.nombre
        respuesta = self.respuestas.get(hueco['item'])
        if hueco['tipo'] == 'OPCION':
            marcadas = _marcadas(respuesta)
            return hueco['nombres'].get(marcadas[0]) if marcadas else None
        marcadores = ((respuesta.valores_contexto or {}).get('marcadores') or {}) if respuesta is not None else {}
        return marcadores.get(hueco['marcador']) or None


def armar_carta(sesion: Session, cuenta: Cuenta, pregunta: PreguntaDiario) -> tuple[str, str | None]:
    """(texto armado, código de la variante); el respaldo (`pregunta`) va con código nulo."""
    variantes = pregunta.variantes
    if not variantes:
        return pregunta.pregunta, None
    lectura = _Lectura(sesion, cuenta, variantes)
    if not all(referenciable(lectura.respuestas.get(item)) for item in lectura.respuestas):
        return pregunta.pregunta, None
    for variante in variantes['variantes']:
        if all(lectura.cumple(condicion) for condicion in variante['condiciones']):
            texto = variante['texto']
            for nombre in sorted(huecos_de(texto)):
                valor = lectura.valor(variantes['huecos'][nombre])
                if not valor:
                    return pregunta.pregunta, None
                texto = texto.replace(f'{{{nombre}}}', valor)
            return texto, variante['codigo']
    return pregunta.pregunta, None
