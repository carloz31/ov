"""Catálogo de exploración (B10): letras RIASEC de ocupaciones y carreras, instituciones e ingresos."""

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, busqueda_de, enumerado
from app.models.enums import GestionInstitucion, TipoInstitucion


class HighPoint(Base):
    """De 1 a 3 letras RIASEC de una ocupación, cargadas; la posición 1 es su tipo principal."""
    __tablename__ = "high_point"
    __table_args__ = (
        UniqueConstraint("ocupacion_id", "dimension_id"),
        CheckConstraint("posicion BETWEEN 1 AND 3", name="posicion_valida"),
    )
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("dimension.id"))


class TipoCarrera(Base):
    """De 0 a 3 letras RIASEC de una carrera, cargadas (opcional); la posición 1 es su tipo principal."""
    __tablename__ = "tipo_carrera"
    __table_args__ = (
        UniqueConstraint("carrera_id", "dimension_id"),
        CheckConstraint("posicion BETWEEN 1 AND 3", name="posicion_valida"),
    )
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("dimension.id"))


class Ubicacion(Base):
    __tablename__ = "ubicacion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]


class Institucion(Base):
    __tablename__ = "institucion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    busqueda: Mapped[str] = mapped_column(default=busqueda_de("nombre"))
    tipo: Mapped[TipoInstitucion] = mapped_column(enumerado(TipoInstitucion))
    gestion: Mapped[GestionInstitucion | None] = mapped_column(enumerado(GestionInstitucion), default=None)
    descripcion: Mapped[str | None] = mapped_column(Text, default=None)
    pagina_web: Mapped[str | None] = mapped_column(default=None)
    ubicacion_id: Mapped[int] = mapped_column(ForeignKey("ubicacion.id"))
    ubicacion: Mapped[Ubicacion] = relationship(viewonly=True, lazy="raise")
    carreras: Mapped[list["Carrera"]] = relationship(
        secondary="institucion_carrera", viewonly=True, lazy="raise", order_by="Carrera.codigo")


class InstitucionCarrera(Base):
    __tablename__ = "institucion_carrera"
    __table_args__ = (CheckConstraint("duracion_ciclos > 0", name="duracion_valida"),)
    institucion_id: Mapped[int] = mapped_column(ForeignKey("institucion.id"), primary_key=True)
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"), primary_key=True)
    # Ciclos que dura la carrera en esa institución (B11); sin ella, el plan no calcula el total de la carrera.
    duracion_ciclos: Mapped[int | None] = mapped_column(default=None)


class IngresoCarrera(Base):
    """Ingreso mensual promedio de quienes ejercen una carrera, con su fuente y año."""
    __tablename__ = "ingreso_carrera"
    __table_args__ = (CheckConstraint("promedio_mensual >= 0", name="promedio_valido"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"), unique=True)
    promedio_mensual: Mapped[int]
    fuente: Mapped[str]
    anio: Mapped[int]
    rangos: Mapped[list["RangoIngreso"]] = relationship(viewonly=True, lazy="raise", order_by="RangoIngreso.posicion")


class RangoIngreso(Base):
    """Un tramo de la distribución de ingresos de una carrera; `maximo` nulo es el tramo abierto."""
    __tablename__ = "rango_ingreso"
    __table_args__ = (
        CheckConstraint("minimo >= 0 AND (maximo IS NULL OR maximo > minimo)", name="tramo_valido"),
        CheckConstraint("porcentaje BETWEEN 0 AND 100", name="porcentaje_valido"),
    )
    ingreso_carrera_id: Mapped[int] = mapped_column(ForeignKey("ingreso_carrera.id"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    minimo: Mapped[int]
    maximo: Mapped[int | None]
    porcentaje: Mapped[float]
