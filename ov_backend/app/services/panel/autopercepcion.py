"""Cuestionario de partida y llegada visto por la orientadora (ajuste panel-estudiantes): zonas por dimensión de cada
aplicación con resultado vigente, por lotes. Usa el mismo cálculo de zona que `comparacion_autopercepcion`
(`calcular_zona` sobre el puntaje con los inversos ya aplicados) pero no exige que estén las dos; nunca expone el
puntaje."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto
from app.models import (
    Aplicacion, Dimension, Instrumento, MomentoAplicacion, ResultadoDimension, ResultadoInstrumento, TipoResultado,
)
from app.services.instrumentos.calculo import calcular_zona
from app.services.instrumentos.consultas import items_por_dimension


@dataclass(frozen=True)
class Medicion:
    """Una aplicación con resultado vigente: su fecha y la zona de cada dimensión (por id)."""
    aplicacion: Aplicacion
    fecha: datetime
    zonas: dict[int, str]


def instrumento_autopercepcion(sesion: Session) -> Instrumento | None:
    """El instrumento de partida y llegada (resultado COMPARACION); el primero por código si hubiera más."""
    instrumentos = sorted((i for i in contexto(sesion).definiciones.listar(Instrumento)
                           if i.tipo_resultado == TipoResultado.COMPARACION), key=lambda i: i.codigo)
    return instrumentos[0] if instrumentos else None


def dimensiones_de(sesion: Session, instrumento: Instrumento) -> list[Dimension]:
    return sorted((d for d in contexto(sesion).definiciones.listar(Dimension) if d.instrumento_id == instrumento.id),
                  key=lambda d: (d.orden, d.codigo))


def mediciones(sesion: Session, ids: list[int]) -> dict[int, dict[MomentoAplicacion, Medicion]]:
    """Por estudiante, la medición de ENTRADA (partida) y la de SALIDA (llegada), las que tengan resultado vigente."""
    instrumento = instrumento_autopercepcion(sesion)
    if instrumento is None or not ids:
        return {}
    definiciones = contexto(sesion).definiciones
    aplicaciones = {a.id: a for a in definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id}
    cantidades = items_por_dimension(definiciones, instrumento)
    filas = sesion.execute(select(
        ResultadoInstrumento.cuenta_id, ResultadoInstrumento.aplicacion_id, ResultadoInstrumento.calculado_en,
        ResultadoDimension.dimension_id, ResultadoDimension.puntaje,
    ).join(ResultadoDimension, ResultadoDimension.resultado_id == ResultadoInstrumento.id).where(
        ResultadoInstrumento.cuenta_id.in_(ids), ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)))
    zonas = defaultdict(dict)
    fechas = {}
    for cuenta_id, aplicacion_id, fecha, dimension_id, puntaje in filas:
        zonas[cuenta_id, aplicacion_id][dimension_id] = calcular_zona(puntaje, cantidades[dimension_id])
        fechas[cuenta_id, aplicacion_id] = fecha
    resultado = defaultdict(dict)
    for (cuenta_id, aplicacion_id), por_dimension in zonas.items():
        aplicacion = aplicaciones[aplicacion_id]
        resultado[cuenta_id][aplicacion.momento] = Medicion(aplicacion, fechas[cuenta_id, aplicacion_id], por_dimension)
    return resultado


def mediciones_del_alcance(lecturas) -> dict[int, dict[MomentoAplicacion, Medicion]]:
    """`mediciones` de los estudiantes de unas `Lecturas`, una vez por petición (temas y partida del perfil)."""
    return lecturas.una_vez("mediciones", lambda: mediciones(lecturas.sesion, lecturas.alcance.ids))
