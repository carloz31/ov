"""Panel del salón de la orientadora (ajuste panel-salon): alertas configurables y parámetros del panel.

`grupo_alerta`, `alerta` y `parametro` son tablas de catálogo: las llena `datos/fijos.py`. Las alertas no se guardan
por estudiante; se calculan al consultar con el evaluador que nombra cada fila (`app/services/panel/alertas.py`).
`nota_orientadora` (ajuste panel-estudiantes) es estado: las notas privadas de cada orientadora sobre un estudiante."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import DestinoPerfil


class GrupoAlerta(Base):
    __tablename__ = "grupo_alerta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    orden: Mapped[int]
    # Ajuste panel-estudiantes: si aparece en el Inicio, en sus conteos y en la lista de estudiantes. Los temas «Para
    # conversar» van en un grupo con `en_inicio = false` y solo se muestran en el perfil.
    en_inicio: Mapped[bool] = mapped_column(default=True, server_default=true())


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
    # Ajuste panel-estudiantes: textos cuando se habla de un estudiante (lista y perfil; nulo = `nombre`), con `{clave}`
    # de los parámetros y de los datos del evaluador, y la pestaña del perfil a la que lleva su enlace.
    nombre_perfil: Mapped[str | None] = mapped_column(Text)
    descripcion_perfil: Mapped[str | None] = mapped_column(Text)
    destino: Mapped[DestinoPerfil | None] = mapped_column(enumerado(DestinoPerfil))


class Parametro(Base):
    __tablename__ = "parametro"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    valor: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)


class NotaOrientadora(Base):
    """Nota privada de una orientadora sobre un estudiante (HU-108): solo la ve, edita y elimina quien la escribió."""
    __tablename__ = "nota_orientadora"
    __table_args__ = (Index("ix_nota_orientadora_orientadora_estudiante", "orientadora_id", "estudiante_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    orientadora_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    estudiante_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    texto: Mapped[str] = mapped_column(Text)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime)
