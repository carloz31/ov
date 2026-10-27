"""Catálogo de exploración (B10, F06): letras RIASEC, grupos y estilos de ocupaciones, instituciones e ingresos."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, UniqueConstraint, text
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


class GrupoOcupacional(Base):
    """Grupo mayor O*NET (SOC de 2 cifras), con su nombre en español."""
    __tablename__ = "grupo_ocupacional"
    codigo: Mapped[str] = mapped_column(primary_key=True)
    nombre: Mapped[str]


class EstiloTrabajo(Base):
    """Estilo de trabajo de Mi Próximo Paso; `Ocupacion.estilos_trabajo` guarda sus códigos."""
    __tablename__ = "estilo_trabajo"
    codigo: Mapped[str] = mapped_column(primary_key=True)
    nombre: Mapped[str]


class Ubicacion(Base):
    """Departamento. Lo nacional no es una ubicación: es `ubicacion_id` nulo en `ingreso_familia`."""
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
    distrito: Mapped[str | None] = mapped_column(default=None)
    direccion: Mapped[str | None] = mapped_column(default=None)
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


class IngresoFamilia(Base):
    """Ingreso mensual de los egresados de un tipo de institución en una familia (campo CINE), por departamento;
    `ubicacion_id` nulo es el promedio nacional."""
    __tablename__ = "ingreso_familia"
    __table_args__ = (
        UniqueConstraint("tipo", "familia_id", "ubicacion_id"),
        Index("ix_ingreso_familia_nacional", "tipo", "familia_id", unique=True,
              sqlite_where=text("ubicacion_id IS NULL"), postgresql_where=text("ubicacion_id IS NULL")),
        CheckConstraint("minimo_jovenes >= 0 AND minimo_jovenes <= maximo_jovenes", name="jovenes_valido"),
        CheckConstraint("minimo_adultos >= 0 AND minimo_adultos <= maximo_adultos", name="adultos_valido"),
        CheckConstraint("promedio_jovenes >= 0 AND promedio_adultos >= 0", name="promedios_validos"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[TipoInstitucion] = mapped_column(enumerado(TipoInstitucion))
    familia_id: Mapped[int] = mapped_column(ForeignKey("familia_carrera.id"))
    ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicacion.id"), default=None)
    promedio_jovenes: Mapped[int]
    minimo_jovenes: Mapped[int]
    maximo_jovenes: Mapped[int]
    promedio_adultos: Mapped[int]
    minimo_adultos: Mapped[int]
    maximo_adultos: Mapped[int]
    ubicacion: Mapped[Ubicacion | None] = relationship(viewonly=True, lazy="raise")


class IngresoInstitucion(Base):
    """Ingreso mensual de los egresados de una institución en una familia (campo CINE)."""
    __tablename__ = "ingreso_institucion"
    __table_args__ = (CheckConstraint("promedio >= 0 AND minimo >= 0 AND minimo <= maximo", name="tramo_valido"),)
    institucion_id: Mapped[int] = mapped_column(ForeignKey("institucion.id"), primary_key=True)
    familia_id: Mapped[int] = mapped_column(ForeignKey("familia_carrera.id"), primary_key=True)
    promedio: Mapped[int]
    minimo: Mapped[int]
    maximo: Mapped[int]
