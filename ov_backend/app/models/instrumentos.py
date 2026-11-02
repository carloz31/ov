from datetime import datetime

from sqlalchemy import (
    JSON, CheckConstraint, DateTime, ForeignKey, Index, Text, UniqueConstraint, column, false, text, true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.parametros import CORRELACION_MINIMA
from app.database import TipoJSON
from app.models.base import Base, busqueda_de, enumerado
from app.models.enums import MomentoAplicacion, TipoResultado


class Instrumento(Base):
    __tablename__ = "instrumento"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    # Cómo leer el resultado y una línea de encuadre, por audiencia (ajuste resultados-intereses); en el del
    # apoderado, `{nombre}` es el nombre del hijo y lo resuelve la consulta.
    lectura_estudiante: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    lectura_apoderado: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    lectura_orientadora: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    mensaje_estudiante: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    mensaje_apoderado: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    mensaje_orientadora: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    # La guía de dimensiones del resultado arranca abierta.
    guia_abierta: Mapped[bool] = mapped_column(default=False, server_default=false())
    tipo_resultado: Mapped[TipoResultado] = mapped_column(enumerado(TipoResultado), default=TipoResultado.DESTACADAS)


class Dimension(Base):
    __tablename__ = "dimension"
    __table_args__ = (
        CheckConstraint(TipoJSON(column("fortalezas")) == 'array', name="fortalezas_lista"),
        CheckConstraint(TipoJSON(column("desarrollo")) == 'array', name="desarrollo_lista"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    instrumento_id: Mapped[int] = mapped_column(ForeignKey("instrumento.id"))
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    # «Suele notarse cuando …», «Suele venir con …» y «Para desarrollarla» (vacío en RIASEC).
    ejemplos: Mapped[str | None] = mapped_column(Text, default=None)
    fortalezas: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list, server_default=text("'[]'"))
    desarrollo: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list, server_default=text("'[]'"))
    orden: Mapped[int]
    tematica_id: Mapped[int | None] = mapped_column(ForeignKey("tematica.id"))


class EscalaRespuesta(Base):
    __tablename__ = "escala_respuesta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]


class OpcionEscala(Base):
    __tablename__ = "opcion_escala"
    __table_args__ = (UniqueConstraint("escala_id", "orden"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    escala_id: Mapped[int] = mapped_column(ForeignKey("escala_respuesta.id"))
    orden: Mapped[int]
    etiqueta: Mapped[str]
    puntaje: Mapped[float]


class ItemInstrumento(Base):
    __tablename__ = "item_instrumento"
    __table_args__ = (UniqueConstraint("instrumento_id", "numero"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    instrumento_id: Mapped[int] = mapped_column(ForeignKey("instrumento.id"))
    codigo: Mapped[str] = mapped_column(unique=True)
    numero: Mapped[int]
    enunciado: Mapped[str] = mapped_column(Text)
    dimension_id: Mapped[int | None] = mapped_column(ForeignKey("dimension.id"))
    escala_id: Mapped[int] = mapped_column(ForeignKey("escala_respuesta.id"))
    inverso: Mapped[bool] = mapped_column(default=False, server_default=false())


class ActividadItem(Base):
    __tablename__ = "actividad_item"
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"), primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("item_instrumento.id"), primary_key=True)
    orden: Mapped[int]


class Aplicacion(Base):
    __tablename__ = "aplicacion"
    id: Mapped[int] = mapped_column(primary_key=True)
    instrumento_id: Mapped[int] = mapped_column(ForeignKey("instrumento.id"))
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    momento: Mapped[MomentoAplicacion] = mapped_column(enumerado(MomentoAplicacion), default=MomentoAplicacion.UNICA)


class AplicacionActividad(Base):
    __tablename__ = "aplicacion_actividad"
    aplicacion_id: Mapped[int] = mapped_column(ForeignKey("aplicacion.id"), primary_key=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"), primary_key=True)


class Ocupacion(Base):
    __tablename__ = "ocupacion"
    __table_args__ = (
        CheckConstraint(TipoJSON(column("conocimientos")) == 'array', name="conocimientos_lista"),
        CheckConstraint(TipoJSON(column("aptitudes")) == 'array', name="aptitudes_lista"),
        CheckConstraint(TipoJSON(column("tareas")) == 'array', name="tareas_lista"),
        CheckConstraint(TipoJSON(column("tambien_llamado")) == 'array', name="tambien_llamado_lista"),
        CheckConstraint(TipoJSON(column("estilos_trabajo")) == 'array', name="estilos_trabajo_lista"),
        CheckConstraint(TipoJSON(column("programas_cine")) == 'array', name="programas_cine_lista"),
        CheckConstraint("job_zone BETWEEN 1 AND 5", name="job_zone_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    codigo_onet: Mapped[str] = mapped_column(unique=True)
    # Nombre adaptado al Perú de la curaduría (o el de Mi Próximo Paso si no tiene).
    titulo: Mapped[str]
    # Participa en el cálculo de ocupaciones afines del test de intereses.
    en_test: Mapped[bool] = mapped_column(default=False, server_default=false())
    # Se lista en el catálogo; las que no, existen solo porque casos y testimonios las nombran.
    en_catalogo: Mapped[bool] = mapped_column(default=True, server_default=true())
    # Códigos CINE de 6 cifras de los programas de referencia; solo para nombrar programas de ejemplo.
    programas_cine: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list,
                                                      server_default=text("'[]'"))
    # Grupo mayor O*NET (2 cifras).
    grupo: Mapped[str] = mapped_column(ForeignKey("grupo_ocupacional.codigo"))
    resumen: Mapped[str | None] = mapped_column(default=None)
    descripcion: Mapped[str | None] = mapped_column(Text, default=None)
    job_zone: Mapped[int | None] = mapped_column(default=None)
    personalidad: Mapped[str | None] = mapped_column(Text, default=None)
    tambien_llamado: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list,
                                                       server_default=text("'[]'"))
    tareas: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list, server_default=text("'[]'"))
    conocimientos: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list,
                                                     server_default=text("'[]'"))
    aptitudes: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list, server_default=text("'[]'"))
    # Códigos de `estilo_trabajo`, en el orden de la fuente.
    estilos_trabajo: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list,
                                                       server_default=text("'[]'"))
    # Letras de `high_point` en orden de posición («RIS»); lo calcula el cargador.
    codigo_riasec: Mapped[str | None] = mapped_column(default=None)
    # Título y nombres alternativos sin tildes; el cargador la llena con ambos.
    busqueda: Mapped[str] = mapped_column(default=busqueda_de("titulo"))
    # Familia principal de la curaduría (`ocupacion_familia`, `es_principal`); nula en las que no tienen familia.
    familia_principal: Mapped["FamiliaCarrera | None"] = relationship(
        "FamiliaCarrera", secondary="ocupacion_familia", viewonly=True, lazy="raise", uselist=False,
        primaryjoin="Ocupacion.id == OcupacionFamilia.ocupacion_id",
        secondaryjoin="and_(FamiliaCarrera.id == OcupacionFamilia.familia_id, OcupacionFamilia.es_principal)")


class PuntajeOcupacion(Base):
    __tablename__ = "puntaje_ocupacion"
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"), primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("dimension.id"), primary_key=True)
    valor: Mapped[float]


class RespuestaItem(Base):
    __tablename__ = "respuesta_item"
    __table_args__ = (UniqueConstraint("progreso_id", "item_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    progreso_id: Mapped[int] = mapped_column(ForeignKey("progreso_actividad.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("item_instrumento.id"))
    opcion_id: Mapped[int] = mapped_column(ForeignKey("opcion_escala.id"))
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime)


class ResultadoInstrumento(Base):
    __tablename__ = "resultado_instrumento"
    __table_args__ = (
        Index("resultado_vigente_unico", "cuenta_id", "aplicacion_id", unique=True,
              sqlite_where=text("anulado_en IS NULL"), postgresql_where=text("anulado_en IS NULL")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    aplicacion_id: Mapped[int] = mapped_column(ForeignKey("aplicacion.id"))
    calculado_en: Mapped[datetime] = mapped_column(DateTime)
    anulado_en: Mapped[datetime | None] = mapped_column(DateTime)
    perfil_plano: Mapped[bool] = mapped_column(default=False, server_default=false())


class ResultadoDimension(Base):
    __tablename__ = "resultado_dimension"
    resultado_id: Mapped[int] = mapped_column(ForeignKey("resultado_instrumento.id"), primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("dimension.id"), primary_key=True)
    puntaje: Mapped[float]
    puntaje_maximo: Mapped[float]


class Coincidencia(Base):
    __tablename__ = "coincidencia"
    __table_args__ = (
        UniqueConstraint("resultado_id", "posicion"),
        CheckConstraint("posicion >= 1", name="posicion_valida"),
        CheckConstraint(f"correlacion >= {CORRELACION_MINIMA} AND correlacion <= 1", name="correlacion_valida"),
    )
    resultado_id: Mapped[int] = mapped_column(ForeignKey("resultado_instrumento.id"), primary_key=True)
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"), primary_key=True)
    posicion: Mapped[int]
    # Todas las de r ≥ 0 de las ocupaciones `en_test`, por r descendente (ajuste resultados-intereses): las
    # afines que se muestran y las familias recomendadas se derivan al leer.
    correlacion: Mapped[float]
