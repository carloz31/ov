"""Lectura agrupada de los planes de una cuenta (B11). Vive en `core` para que el contexto de consultas la guarde
por petición (ajuste logros); el dominio de planes la reexporta desde `services/planes/consultas.py`."""

from dataclasses import dataclass, field

from sqlalchemy import select

from app.models import (
    ComplicacionTarjeta, ConocimientoTarjeta, DudaTarjeta, FinanciamientoTarjeta, GastoTarjeta, MotivoTarjeta,
    PasoTarjeta, SugerenciaTarjeta, TarjetaCarrera,
)


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


def cargar_tarjetas(sesion, cuenta_id: int) -> DatosPlanes:
    """Solo las tarjetas activas, por prioridad (1 consulta)."""
    return DatosPlanes(tarjetas=list(sesion.scalars(select(TarjetaCarrera).where(
        TarjetaCarrera.cuenta_id == cuenta_id, TarjetaCarrera.activa).order_by(TarjetaCarrera.prioridad))))


def cargar_hijas(sesion, datos: DatosPlanes) -> DatosPlanes:
    """Las filas hijas de esas tarjetas, una consulta por tabla (ninguna si no hay tarjetas)."""
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


def cargar_planes(sesion, cuenta) -> DatosPlanes:
    return cargar_hijas(sesion, cargar_tarjetas(sesion, cuenta.id))
