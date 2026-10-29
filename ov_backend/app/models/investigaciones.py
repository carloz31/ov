"""Investigaciones y entrevistas (B13): guion, publicación, reacciones, reportes y Leyenda."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, UniqueConstraint, false, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import (
    EstadoEntrevista, EstadoInvestigacion, EstadoReporte, EstadoSugerenciaGuion, MotivoReporte, OrigenPreguntaGuion,
)


class PreguntaBaseGuion(Base):
    """Preguntas que siempre van en el guion (catálogo fijo)."""
    __tablename__ = "pregunta_base_guion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    orden: Mapped[int] = mapped_column(unique=True)
    texto: Mapped[str] = mapped_column(Text)


class TipoReaccion(Base):
    """Catálogo de reacciones; `icono` es un nombre que el front traduce."""
    __tablename__ = "tipo_reaccion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    pregunta: Mapped[str]
    comentario_obligatorio: Mapped[bool]
    icono: Mapped[str]
    orden: Mapped[int] = mapped_column(unique=True)


class Entrevista(Base):
    """Entrevista publicada. `busqueda`: título, profesional y ocupación sin tildes (la escribe el servicio)."""
    __tablename__ = "entrevista"
    __table_args__ = (CheckConstraint("leyenda_en IS NULL OR destacada_en IS NOT NULL", name="leyenda_destacada"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"))
    titulo: Mapped[str]
    profesional: Mapped[str]
    duracion: Mapped[str]
    enlace: Mapped[str]
    resumen: Mapped[str] = mapped_column(Text)
    busqueda: Mapped[str]
    estado: Mapped[EstadoEntrevista] = mapped_column(enumerado(EstadoEntrevista))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
    editada_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    destacada_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    destacada_por: Mapped[int | None] = mapped_column(ForeignKey("cuenta.id"), default=None)
    leyenda_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class EntrevistaAutor(Base):
    __tablename__ = "entrevista_autor"
    entrevista_id: Mapped[int] = mapped_column(ForeignKey("entrevista.id"), primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"), primary_key=True)


class Investigacion(Base):
    """Investigación de un estudiante sobre una ocupación. Una sola EN_CURSO o GUIA_LISTA por cuenta."""
    __tablename__ = "investigacion"
    __table_args__ = (
        Index("investigacion_activa_unica", "cuenta_id", unique=True,
              sqlite_where=text("estado IN ('EN_CURSO', 'GUIA_LISTA')"),
              postgresql_where=text("estado IN ('EN_CURSO', 'GUIA_LISTA')")),
        CheckConstraint("(estado = 'PUBLICADA') = (entrevista_id IS NOT NULL)", name="publicada_con_entrevista"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"))
    estado: Mapped[EstadoInvestigacion] = mapped_column(enumerado(EstadoInvestigacion))
    # Lo que pienso hoy (HU-100): lo ven el estudiante y su orientadora, no el salón.
    piensa_dia: Mapped[str] = mapped_column(Text)
    piensa_necesita: Mapped[str] = mapped_column(Text)
    piensa_duda: Mapped[str] = mapped_column(Text)
    # Falso al crear o al cambiar lo que pienso: la próxima petición de sugerencias llama al LLM.
    sugerencias_vigentes: Mapped[bool] = mapped_column(default=False, server_default=false())
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    guia_lista_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    entrevista_id: Mapped[int | None] = mapped_column(ForeignKey("entrevista.id"), default=None)


class PreguntaGuion(Base):
    __tablename__ = "pregunta_guion"
    __table_args__ = (UniqueConstraint("investigacion_id", "posicion"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    investigacion_id: Mapped[int] = mapped_column(ForeignKey("investigacion.id"))
    posicion: Mapped[int]
    origen: Mapped[OrigenPreguntaGuion] = mapped_column(enumerado(OrigenPreguntaGuion))
    texto: Mapped[str] = mapped_column(Text)


class SugerenciaGuion(Base):
    """Pregunta sugerida por el LLM; agregada o descartada no vuelve a ofrecerse."""
    __tablename__ = "sugerencia_guion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    investigacion_id: Mapped[int] = mapped_column(ForeignKey("investigacion.id"))
    texto: Mapped[str] = mapped_column(Text)
    estado: Mapped[EstadoSugerenciaGuion] = mapped_column(enumerado(EstadoSugerenciaGuion))


class Reaccion(Base):
    """Reacción de un estudiante (con tipo) o comentario de la orientadora (sin tipo). Borrado lógico."""
    __tablename__ = "reaccion"
    __table_args__ = (
        Index("reaccion_estudiante_unica", "entrevista_id", "cuenta_id", unique=True,
              sqlite_where=text("tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL"),
              postgresql_where=text("tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    entrevista_id: Mapped[int] = mapped_column(ForeignKey("entrevista.id"))
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    tipo_reaccion_id: Mapped[int | None] = mapped_column(ForeignKey("tipo_reaccion.id"))
    comentario: Mapped[str | None] = mapped_column(Text)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    editada_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    eliminada_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class Reporte(Base):
    """Reporte de una entrevista o de una reacción; uno por persona y contenido."""
    __tablename__ = "reporte"
    __table_args__ = (
        CheckConstraint("(entrevista_id IS NULL) <> (reaccion_id IS NULL)", name="un_contenido"),
        Index("reporte_entrevista_unico", "cuenta_id", "entrevista_id", unique=True,
              sqlite_where=text("entrevista_id IS NOT NULL"), postgresql_where=text("entrevista_id IS NOT NULL")),
        Index("reporte_reaccion_unico", "cuenta_id", "reaccion_id", unique=True,
              sqlite_where=text("reaccion_id IS NOT NULL"), postgresql_where=text("reaccion_id IS NOT NULL")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    entrevista_id: Mapped[int | None] = mapped_column(ForeignKey("entrevista.id"))
    reaccion_id: Mapped[int | None] = mapped_column(ForeignKey("reaccion.id"))
    motivo: Mapped[MotivoReporte] = mapped_column(enumerado(MotivoReporte))
    detalle: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[EstadoReporte] = mapped_column(enumerado(EstadoReporte))
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
