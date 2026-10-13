from sqlalchemy import CheckConstraint, ForeignKey, Text, text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, busqueda_de, enumerado
from app.models.enums import Audiencia, Espacio, TipoActividad, Visibilidad


class Bloque(Base):
    __tablename__ = "bloque"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    numero: Mapped[int]
    nombre: Mapped[str]
    espacio: Mapped[Espacio] = mapped_column(enumerado(Espacio))
    audiencia: Mapped[Audiencia] = mapped_column(enumerado(Audiencia))


class Actividad(Base):
    __tablename__ = "actividad"
    __table_args__ = (
        CheckConstraint(
            "(tipo = 'CASO' AND puntaje_minimo BETWEEN 0 AND 100 "
            "AND puntaje_minimo IS NOT NULL) OR "
            "(tipo != 'CASO' AND puntaje_minimo IS NULL)",
            name="puntaje_minimo_solo_caso",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    titulo: Mapped[str]
    tipo: Mapped[TipoActividad] = mapped_column(enumerado(TipoActividad))
    contenido: Mapped[str]
    visibilidad: Mapped[Visibilidad] = mapped_column(
        enumerado(Visibilidad), default=Visibilidad.SIEMPRE, server_default=text("'SIEMPRE'"),
    )
    orden: Mapped[int]
    bloque_id: Mapped[int] = mapped_column(ForeignKey("bloque.id"))
    puntaje_minimo: Mapped[float | None]
    requerida: Mapped[bool] = mapped_column(default=True, server_default=true())
    duracion_estimada_min: Mapped[int | None]
    descripcion: Mapped[str | None] = mapped_column(Text)


class Tematica(Base):
    """Una de las cinco dimensiones del cuestionario de partida y llegada, compartida por actividades."""
    __tablename__ = "tematica"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    orden: Mapped[int]


class ActividadTematica(Base):
    __tablename__ = "actividad_tematica"
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"), primary_key=True)
    tematica_id: Mapped[int] = mapped_column(ForeignKey("tematica.id"), primary_key=True)


class ActividadDimension(Base):
    """Tipos RIASEC de un caso (B08). Solo las actividades CASO las tienen; lo valida el cargador."""
    __tablename__ = "actividad_dimension"
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"), primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("dimension.id"), primary_key=True)


class Seccion(Base):
    __tablename__ = "seccion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    audiencia: Mapped[Audiencia] = mapped_column(enumerado(Audiencia))


class Ficha(Base):
    __tablename__ = "ficha"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    titulo: Mapped[str]
    contenido: Mapped[str] = mapped_column(Text)
    audiencia: Mapped[Audiencia] = mapped_column(
        enumerado(Audiencia), default=Audiencia.ESTUDIANTE, server_default=text("'ESTUDIANTE'"),
    )


class Testimonio(Base):
    __tablename__ = "testimonio"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    titulo: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    enlace: Mapped[str]
    pista: Mapped[str | None] = mapped_column(Text)


class PreguntaDiario(Base):
    __tablename__ = "pregunta_diario"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    pregunta: Mapped[str] = mapped_column(Text)


class Conversacion(Base):
    __tablename__ = "conversacion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    titulo: Mapped[str]
    tema: Mapped[str] = mapped_column(Text)


class Insignia(Base):
    __tablename__ = "insignia"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    requisito: Mapped[str] = mapped_column(Text)
    es_oculta: Mapped[bool]
    audiencia: Mapped[Audiencia] = mapped_column(enumerado(Audiencia))


class Nivel(Base):
    __tablename__ = "nivel"
    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int] = mapped_column(unique=True)
    titulo: Mapped[str]


class FamiliaCarrera(Base):
    __tablename__ = "familia_carrera"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]


class Carrera(Base):
    __tablename__ = "carrera"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    familia_id: Mapped[int] = mapped_column(ForeignKey("familia_carrera.id"))
    descripcion: Mapped[str | None] = mapped_column(Text, default=None)
    duracion: Mapped[str | None] = mapped_column(default=None)
    # Letras de `tipo_carrera` en orden de posición («RIS»); lo calcula el cargador.
    codigo_riasec: Mapped[str | None] = mapped_column(default=None)
    busqueda: Mapped[str] = mapped_column(default=busqueda_de("nombre"))
    # Relaciones de solo lectura para las consultas del catálogo (B10); se cargan con `selectinload`.
    familia: Mapped[FamiliaCarrera] = relationship(viewonly=True, lazy="raise")
    ocupaciones: Mapped[list["Ocupacion"]] = relationship(
        secondary="carrera_ocupacion", viewonly=True, lazy="raise", order_by="Ocupacion.codigo")
    instituciones: Mapped[list["Institucion"]] = relationship(
        secondary="institucion_carrera", viewonly=True, lazy="raise", order_by="Institucion.codigo")
    ingreso: Mapped["IngresoCarrera | None"] = relationship(viewonly=True, lazy="raise")
