from sqlalchemy import JSON, CheckConstraint, ForeignKey, Text, column, false, text, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import TipoJSON
from app.models.base import Base, busqueda_de, enumerado
from app.models.enums import Audiencia, Espacio, TipoActividad, UsoPreguntaDiario, Visibilidad


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
        # Ajustes Central (6): puntos de satisfacción; el máximo es el total de necesidades del caso.
        CheckConstraint(
            "(tipo = 'CASO' AND puntaje_minimo IS NOT NULL AND puntaje_maximo IS NOT NULL "
            "AND puntaje_minimo BETWEEN 0 AND puntaje_maximo) OR "
            "(tipo != 'CASO' AND puntaje_minimo IS NULL AND puntaje_maximo IS NULL)",
            name="puntajes_solo_caso",
        ),
        CheckConstraint(
            "(tipo = 'BATALLA' AND preguntas_por_intento >= 1) OR "
            "(tipo != 'BATALLA' AND preguntas_por_intento IS NULL)",
            name="preguntas_por_intento_solo_batalla",
        ),
        CheckConstraint(
            "(tipo = 'BATALLA' AND vidas_enemigo >= 1 AND destellos >= 1) OR "
            "(tipo != 'BATALLA' AND vidas_enemigo IS NULL AND destellos IS NULL)",
            name="vidas_solo_batalla",
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
    # Configuración de un CASO, en puntos de satisfacción (una necesidad bien cubierta = 1 punto).
    puntaje_minimo: Mapped[int | None]
    puntaje_maximo: Mapped[int | None]
    # Configuración de una BATALLA: cuántas preguntas de su pool salen en cada intento (F04b).
    preguntas_por_intento: Mapped[int | None]
    # Vidas del enemigo y destellos del estudiante en cada intento (F04c): el servidor decide la victoria.
    vidas_enemigo: Mapped[int | None]
    destellos: Mapped[int | None]
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


class PreguntaBatalla(Base):
    """Pregunta del pool de una batalla (F04b). Cada una sale de una ficha; las fichas de la batalla
    se derivan de sus preguntas. `correcta` es el índice de la opción correcta en `opciones`."""
    __tablename__ = "pregunta_batalla"
    __table_args__ = (
        CheckConstraint(TipoJSON(column("opciones")) == 'array', name="opciones_lista"),
        CheckConstraint("correcta >= 0", name="correcta_valida"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"))
    ficha_id: Mapped[int] = mapped_column(ForeignKey("ficha.id"))
    enunciado: Mapped[str] = mapped_column(Text)
    opciones: Mapped[list[str]] = mapped_column(JSON)
    correcta: Mapped[int]
    explicacion: Mapped[str] = mapped_column(Text)


class Seccion(Base):
    __tablename__ = "seccion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    audiencia: Mapped[Audiencia] = mapped_column(enumerado(Audiencia))


class Presentacion(Base):
    """Presentación de primera visita de una vista del front; `codigo` es el id de la vista (`journal`, `missions`…)."""
    __tablename__ = "presentacion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
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
    # El enlace es el video (YouTube) y la descripción, el texto completo del testimonio.
    enlace: Mapped[str]
    pista: Mapped[str | None] = mapped_column(Text)
    # Ajustes Central (7): quién lo cuenta. El caso que lo regala se deduce de su regla SUPERA_CASO.
    persona: Mapped[str | None]
    ocupacion_id: Mapped[int | None] = mapped_column(ForeignKey("ocupacion.id"))
    anios_experiencia: Mapped[int | None]
    cita: Mapped[str | None] = mapped_column(Text)


class PreguntaDiario(Base):
    """Pregunta base del diario: DESBLOQUEABLE (la abre una regla) o DIARIA (entra al sorteo de la pregunta del día).

    `dimension_id` clasifica las DIARIA para el sorteo; no se muestra ni va al LLM.
    """
    __tablename__ = "pregunta_diario"
    __table_args__ = (
        CheckConstraint("uso = 'DIARIA' OR dimension_id IS NULL", name="dimension_solo_diaria"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    pregunta: Mapped[str] = mapped_column(Text)
    personalizada: Mapped[bool] = mapped_column(default=False, server_default=false())
    uso: Mapped[UsoPreguntaDiario] = mapped_column(enumerado(UsoPreguntaDiario))
    dimension_id: Mapped[int | None] = mapped_column(ForeignKey("dimension.id"))


class Conversacion(Base):
    __tablename__ = "conversacion"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    orden: Mapped[int] = mapped_column(unique=True)
    titulo: Mapped[str]
    pregunta_estudiante: Mapped[str] = mapped_column(Text)
    # Nula: el apoderado responde la misma pregunta que el estudiante.
    pregunta_apoderado: Mapped[str | None] = mapped_column(Text)
    preguntas_guia: Mapped[list[str]] = mapped_column(JSON)
    mensaje_diferencias: Mapped[str] = mapped_column(Text)


class GrupoInsignia(Base):
    """Página del pasaporte (ajuste pasaporte-perfil): agrupa insignias por `orden`."""
    __tablename__ = "grupo_insignia"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    orden: Mapped[int]


class Insignia(Base):
    __tablename__ = "insignia"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    descripcion: Mapped[str] = mapped_column(Text)
    requisito: Mapped[str] = mapped_column(Text)
    es_oculta: Mapped[bool]
    audiencia: Mapped[Audiencia] = mapped_column(enumerado(Audiencia))
    grupo_id: Mapped[int] = mapped_column(ForeignKey("grupo_insignia.id"))
    orden: Mapped[int]
    # Pista de Lumi mientras una oculta no se obtiene; se muestra aunque esté enmascarada.
    pista: Mapped[str | None] = mapped_column(Text, default=None)
    # Ajuste pasaporte-perfil (F5): la frase destacada del sello y cómo se consiguió, en pasado. `descripcion` es
    # su historia y `requisito`, lo que pide.
    frase: Mapped[str | None] = mapped_column(Text, default=None)
    logro: Mapped[str | None] = mapped_column(Text, default=None)


class Nivel(Base):
    __tablename__ = "nivel"
    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int] = mapped_column(unique=True)
    titulo: Mapped[str]
    descripcion: Mapped[str | None] = mapped_column(Text, default=None)
    # Ajuste pasaporte-perfil (F5): la cita de Lumi de cada nivel.
    cita_lumi: Mapped[str | None] = mapped_column(Text, default=None)


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
