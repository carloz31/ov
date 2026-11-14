"""Panel del salón de la orientadora (ajuste panel-salon): alertas configurables y parámetros del panel.

Son tablas de catálogo: las llena `datos/fijos.py`. Las alertas no se guardan por estudiante; se calculan al
consultar con el evaluador que nombra cada fila (`app/services/panel/alertas.py`)."""

from sqlalchemy import JSON, ForeignKey, Text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GrupoAlerta(Base):
    __tablename__ = "grupo_alerta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    orden: Mapped[int]


class Alerta(Base):
    __tablename__ = "alerta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    grupo_id: Mapped[int] = mapped_column(ForeignKey("grupo_alerta.id"))
    nombre: Mapped[str]
    descripcion: Mapped[str | None] = mapped_column(Text)
    evaluador: Mapped[str]
    parametros: Mapped[dict] = mapped_column(JSON, default=dict)
    orden: Mapped[int]
    activa: Mapped[bool] = mapped_column(default=True, server_default=true())


class Parametro(Base):
    __tablename__ = "parametro"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    valor: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
