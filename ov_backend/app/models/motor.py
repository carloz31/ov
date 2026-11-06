from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, enumerado
from app.models.enums import TipoConteo, TipoEventoUso, TipoNotificacion, TipoObjetivo


class EventoUso(Base):
    __tablename__ = "evento_uso"
    __table_args__ = (Index("evento_cuenta_tipo", "cuenta_id", "tipo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    tipo: Mapped[TipoEventoUso] = mapped_column(enumerado(TipoEventoUso))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
    id_referencia: Mapped[int | None]


class ReglaDesbloqueo(Base):
    __tablename__ = "regla_desbloqueo"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    mensaje_bloqueo: Mapped[str] = mapped_column(Text)
    tipo_objetivo: Mapped[TipoObjetivo] = mapped_column(enumerado(TipoObjetivo))
    id_objetivo: Mapped[int]
    evaluador_especial: Mapped[str | None]
    parametro_evaluador: Mapped[int | None] = mapped_column(default=None)
    condiciones: Mapped[list["CondicionDesbloqueo"]] = relationship(
        back_populates="regla", order_by="CondicionDesbloqueo.id", lazy="selectin",
    )


class CondicionDesbloqueo(Base):
    __tablename__ = "condicion_desbloqueo"
    __table_args__ = (CheckConstraint("cantidad_minima >= 1", name="cantidad_minima_valida"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    regla_id: Mapped[int] = mapped_column(ForeignKey("regla_desbloqueo.id"))
    tipo_evento: Mapped[TipoEventoUso] = mapped_column(enumerado(TipoEventoUso))
    id_referencia: Mapped[int | None]
    tipo_conteo: Mapped[TipoConteo] = mapped_column(enumerado(TipoConteo))
    cantidad_minima: Mapped[int]
    # Lo que la condición pide, para mostrarlo tal cual (ajuste pasaporte-perfil); nulo si no tiene.
    texto: Mapped[str | None] = mapped_column(default=None)
    regla: Mapped[ReglaDesbloqueo] = relationship(back_populates="condiciones")


class Desbloqueo(Base):
    __tablename__ = "desbloqueo"
    __table_args__ = (UniqueConstraint("cuenta_id", "regla_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    regla_id: Mapped[int] = mapped_column(ForeignKey("regla_desbloqueo.id"))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
    visto: Mapped[bool] = mapped_column(default=False, server_default=false())


class Notificacion(Base):
    """Ajuste notificaciones: lo que la campana lista. `nombre` es una foto del nombre al crearla; `vista_en` nula
    mientras no se ve. El significado de `referencia` y `detalle` por tipo está en `motor.md`."""
    __tablename__ = "notificacion"
    __table_args__ = (Index("notificacion_cuenta_vista", "cuenta_id", "vista_en"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    tipo: Mapped[TipoNotificacion] = mapped_column(enumerado(TipoNotificacion))
    referencia: Mapped[str]
    nombre: Mapped[str]
    detalle: Mapped[str | None] = mapped_column(default=None)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    vista_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
