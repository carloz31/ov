from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, JSON, Text, UniqueConstraint, column, false, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import TipoJSON
from app.models.base import Base, enumerado
from app.models.enums import ClasificacionRespuesta, EstadoRespuestaRegistro, OrigenEvaluacion, TipoCriterio


class ListaOpciones(Base):
    __tablename__ = "lista_opciones"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    comun: Mapped[bool]


class OpcionLista(Base):
    __tablename__ = "opcion_lista"
    __table_args__ = (UniqueConstraint("lista_id", "codigo", name="uq_opcion_lista_codigo"),
                      UniqueConstraint("lista_id", "orden", name="uq_opcion_lista_orden"))
    id: Mapped[int] = mapped_column(primary_key=True)
    lista_id: Mapped[int] = mapped_column(ForeignKey("lista_opciones.id"))
    codigo: Mapped[str]
    texto: Mapped[str] = mapped_column(Text)
    orden: Mapped[int]


class ItemRegistro(Base):
    __tablename__ = "item_registro"
    __table_args__ = (
        UniqueConstraint("actividad_id", "orden"),
        CheckConstraint("min_caracteres IS NULL OR min_caracteres >= 1", name="min_caracteres_valido"),
        CheckConstraint(
            "(lista_id IS NULL AND referencia_id IS NULL AND eleccion_minima IS NULL"
            " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
            " OR ((lista_id IS NULL) <> (referencia_id IS NULL) AND eleccion_minima >= 0"
            " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
            " AND (referencia_id IS NULL OR permite_otra = false))",
            name="eleccion_valida"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"))
    orden: Mapped[int]
    nombre: Mapped[str]
    consigna: Mapped[str] = mapped_column(Text)
    min_caracteres: Mapped[int | None]
    obligatorio: Mapped[bool]
    repregunta_generica: Mapped[str] = mapped_column(Text)
    lista_id: Mapped[int | None] = mapped_column(ForeignKey("lista_opciones.id"))
    # Elección por referencia: las opciones son las que esa referencia ELECCION devuelve a la cuenta.
    # Cierra un ciclo con `referencia.item_registro_id`; por eso la FK se crea aparte.
    referencia_id: Mapped[int | None] = mapped_column(ForeignKey(
        "referencia.id", use_alter=True, name="fk_item_registro_referencia_id_referencia"))
    eleccion_minima: Mapped[int | None]
    eleccion_maxima: Mapped[int | None]
    eleccion_ordenada: Mapped[bool] = mapped_column(default=False, server_default=false())
    permite_otra: Mapped[bool] = mapped_column(default=False, server_default=false())


class CriterioCompletitud(Base):
    __tablename__ = "criterio_completitud"
    __table_args__ = (UniqueConstraint("item_registro_id", "codigo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    item_registro_id: Mapped[int] = mapped_column(ForeignKey("item_registro.id"))
    codigo: Mapped[str]
    tipo: Mapped[TipoCriterio] = mapped_column(enumerado(TipoCriterio))
    descripcion: Mapped[str] = mapped_column(Text)
    repregunta: Mapped[str] = mapped_column(Text)
    orden: Mapped[int]


class RespuestaRegistro(Base):
    __tablename__ = "respuesta_registro"
    __table_args__ = (
        UniqueConstraint("progreso_id", "item_registro_id"),
        CheckConstraint(TipoJSON(column("opciones_elegidas")) == 'array', name="opciones_elegidas_lista"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    progreso_id: Mapped[int] = mapped_column(ForeignKey("progreso_actividad.id"))
    item_registro_id: Mapped[int] = mapped_column(ForeignKey("item_registro.id"))
    texto_inicial: Mapped[str] = mapped_column(Text)
    opciones_elegidas: Mapped[list[dict]] = mapped_column(JSON(none_as_null=True), default=list,
                                                          server_default=text("'[]'"))
    texto_consolidado: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[EstadoRespuestaRegistro] = mapped_column(enumerado(EstadoRespuestaRegistro))
    clasificacion_inicial: Mapped[ClasificacionRespuesta | None] = mapped_column(enumerado(ClasificacionRespuesta))
    ampliada: Mapped[bool] = mapped_column(default=False, server_default=false())
    # 1 = entrega; 2 en adelante = ediciones. `texto_inicial` es el texto base de este intento.
    intento: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    reflexiva_registrada: Mapped[bool] = mapped_column(default=False, server_default=false())
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime)


class TurnoSeguimiento(Base):
    __tablename__ = "turno_seguimiento"
    __table_args__ = (
        UniqueConstraint("respuesta_id", "intento", "orden"),
        CheckConstraint("orden IN (1, 2)", name="orden_seguimiento_valido"),
        CheckConstraint(TipoJSON(column("criterios_objetivo")) == 'array', name="criterios_objetivo_lista"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    respuesta_id: Mapped[int] = mapped_column(ForeignKey("respuesta_registro.id"))
    intento: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    orden: Mapped[int]
    pregunta: Mapped[str] = mapped_column(Text)
    criterios_objetivo: Mapped[list[str]] = mapped_column(JSON(none_as_null=True))
    respuesta: Mapped[str | None] = mapped_column(Text)
    respondido_en: Mapped[datetime | None] = mapped_column(DateTime)
    creado_en: Mapped[datetime] = mapped_column(DateTime)


class EvaluacionRespuesta(Base):
    __tablename__ = "evaluacion_respuesta"
    __table_args__ = (
        CheckConstraint("numero >= 1 AND numero = CAST(numero AS INTEGER)", name="numero_evaluacion_valido"),
        CheckConstraint(TipoJSON(column("criterios_faltantes")) == 'array', name="criterios_faltantes_lista"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    respuesta_id: Mapped[int] = mapped_column(ForeignKey("respuesta_registro.id"))
    numero: Mapped[int]
    origen: Mapped[OrigenEvaluacion] = mapped_column(enumerado(OrigenEvaluacion))
    clasificacion: Mapped[ClasificacionRespuesta] = mapped_column(enumerado(ClasificacionRespuesta))
    criterios_faltantes: Mapped[list[str]] = mapped_column(JSON(none_as_null=True))
    pregunta_generada: Mapped[str | None] = mapped_column(Text)
    requiere_atencion: Mapped[bool] = mapped_column(default=False, server_default=false())
    modelo: Mapped[str | None]
    version_prompt: Mapped[str | None]
    latencia_ms: Mapped[int | None]
    error: Mapped[str | None] = mapped_column(Text)
    texto_evaluado: Mapped[str] = mapped_column(Text)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
