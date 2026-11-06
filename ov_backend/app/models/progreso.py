from datetime import date, datetime

from sqlalchemy import (
    JSON, CheckConstraint, Date, DateTime, ForeignKey, Index, Text, UniqueConstraint, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import EstadoProgreso, OrigenEntrada, OrigenRedaccion, TipoFavorito, TipoRecomendacion


class ProgresoActividad(Base):
    __tablename__ = "progreso_actividad"
    __table_args__ = (UniqueConstraint("cuenta_id", "actividad_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"))
    estado: Mapped[EstadoProgreso] = mapped_column(enumerado(EstadoProgreso))
    posicion: Mapped[str | None] = mapped_column(Text)


class ResultadoCaso(Base):
    __tablename__ = "resultado_caso"
    # El tope (puntaje_maximo del caso) lo valida el servicio: un CHECK no ve otra tabla.
    __table_args__ = (CheckConstraint("puntaje >= 0", name="puntaje_valido"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    progreso_id: Mapped[int] = mapped_column(ForeignKey("progreso_actividad.id"))
    puntaje: Mapped[int]
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)


class ResultadoBatalla(Base):
    """Cada intento de una batalla (B08); el primero es el que cuenta para la métrica de conocimiento."""
    __tablename__ = "resultado_batalla"
    __table_args__ = (
        CheckConstraint("preguntas >= 1", name="preguntas_valida"),
        CheckConstraint("aciertos BETWEEN 0 AND preguntas", name="aciertos_validos"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    progreso_id: Mapped[int] = mapped_column(ForeignKey("progreso_actividad.id"))
    victoria: Mapped[bool]
    aciertos: Mapped[int]
    preguntas: Mapped[int]
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)


class RespuestaBatalla(Base):
    """Respuesta de un intento de batalla (F04b): la opción elegida, por su índice original."""
    __tablename__ = "respuesta_batalla"
    __table_args__ = (UniqueConstraint("resultado_batalla_id", "pregunta_batalla_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    resultado_batalla_id: Mapped[int] = mapped_column(ForeignKey("resultado_batalla.id"))
    pregunta_batalla_id: Mapped[int] = mapped_column(ForeignKey("pregunta_batalla.id"))
    opcion: Mapped[int]
    correcta: Mapped[bool]


class ColeccionOcupacion(Base):
    """Ocupaciones cuyo ícono la cuenta obtuvo al superar un caso (B08)."""
    __tablename__ = "coleccion_ocupacion"
    __table_args__ = (UniqueConstraint("cuenta_id", "ocupacion_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    ocupacion_id: Mapped[int] = mapped_column(ForeignKey("ocupacion.id"))
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"))
    obtenida_en: Mapped[datetime] = mapped_column(DateTime)


class Recomendacion(Base):
    """Pregunta del diario recibida por una cuenta: desbloqueada por una regla o sorteada como pregunta del día.

    `contexto` son las referencias resueltas al crearla; `texto` nulo = por redactar, y una vez guardado no cambia.
    `archivada_en` (ajuste del diario de F05): una carta archivada (DESBLOQUEADA) o una pregunta del día cerrada al
    borrar su entrada (DIARIA). `actividad_id`: la actividad cuya finalización la abrió (nula si la abrió otra cosa).
    """
    __tablename__ = "recomendacion"
    __table_args__ = (
        Index(
            "recomendacion_desbloqueada_unica", "cuenta_id", "pregunta_diario_id", unique=True,
            sqlite_where=text("tipo = 'DESBLOQUEADA'"),
            postgresql_where=text("tipo = 'DESBLOQUEADA'"),
        ),
        Index(
            "recomendacion_diaria_unica", "cuenta_id", "fecha", unique=True,
            sqlite_where=text("tipo = 'DIARIA'"),
            postgresql_where=text("tipo = 'DIARIA'"),
        ),
        CheckConstraint("(tipo = 'DIARIA') = (fecha IS NOT NULL)", name="fecha_solo_diaria"),
        CheckConstraint("(texto IS NULL) = (origen IS NULL)", name="texto_con_origen"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    pregunta_diario_id: Mapped[int] = mapped_column(ForeignKey("pregunta_diario.id"))
    tipo: Mapped[TipoRecomendacion] = mapped_column(enumerado(TipoRecomendacion))
    contexto: Mapped[list | None] = mapped_column(JSON(none_as_null=True))
    texto: Mapped[str | None] = mapped_column(Text)
    origen: Mapped[OrigenRedaccion | None] = mapped_column(enumerado(OrigenRedaccion))
    fecha: Mapped[date | None] = mapped_column(Date)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    archivada_en: Mapped[datetime | None] = mapped_column(DateTime)
    actividad_id: Mapped[int | None] = mapped_column(ForeignKey("actividad.id"))


class EntradaDiario(Base):
    """Entrada privada del diario. `numero` y `numero_libre` salen de `ContadorDiario` y no se reutilizan."""
    __tablename__ = "entrada_diario"
    __table_args__ = (
        UniqueConstraint("cuenta_id", "numero"),
        CheckConstraint(
            "(origen = 'LIBRE') = (recomendacion_id IS NULL) AND (origen = 'LIBRE') = (numero_libre IS NOT NULL)",
            name="recomendacion_segun_origen",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    origen: Mapped[OrigenEntrada] = mapped_column(enumerado(OrigenEntrada))
    recomendacion_id: Mapped[int | None] = mapped_column(ForeignKey("recomendacion.id"), unique=True)
    numero: Mapped[int]
    numero_libre: Mapped[int | None]
    titulo: Mapped[str | None] = mapped_column(Text)
    texto: Mapped[str] = mapped_column(Text)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime | None] = mapped_column(DateTime)


class ContadorDiario(Base):
    """Últimos números de entrada usados por la cuenta: borrar una entrada no libera su número."""
    __tablename__ = "contador_diario"
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"), primary_key=True)
    ultimo_numero: Mapped[int]
    ultimo_libre: Mapped[int]


class CheckIn(Base):
    __tablename__ = "check_in"
    __table_args__ = (
        UniqueConstraint("cuenta_id", "fecha"),
        CheckConstraint("nivel_seguridad BETWEEN 1 AND 5", name="nivel_seguridad_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    fecha: Mapped[date] = mapped_column(Date)
    nivel_seguridad: Mapped[int]


class ConversacionVinculo(Base):
    __tablename__ = "conversacion_vinculo"
    __table_args__ = (UniqueConstraint("vinculo_id", "conversacion_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    vinculo_id: Mapped[int] = mapped_column(ForeignKey("vinculo_familiar.id"))
    conversacion_id: Mapped[int] = mapped_column(ForeignKey("conversacion.id"))
    respuesta_estudiante: Mapped[str | None] = mapped_column(Text)
    respondida_estudiante_en: Mapped[datetime | None] = mapped_column(DateTime)
    respuesta_apoderado: Mapped[str | None] = mapped_column(Text)
    respondida_apoderado_en: Mapped[datetime | None] = mapped_column(DateTime)
    # Conversada = `conversada_en` no nulo; basta la marca de uno de los dos.
    conversada_en: Mapped[datetime | None] = mapped_column(DateTime)
    conversada_por: Mapped[int | None] = mapped_column(ForeignKey("cuenta.id"))


class Favorito(Base):
    """Carrera, ocupación o institución que el estudiante marca (B10). `id_referencia` apunta a la tabla de `tipo`."""
    __tablename__ = "favorito"
    __table_args__ = (UniqueConstraint("cuenta_id", "tipo", "id_referencia"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    tipo: Mapped[TipoFavorito] = mapped_column(enumerado(TipoFavorito))
    id_referencia: Mapped[int]
    fecha_hora: Mapped[datetime] = mapped_column(DateTime)


class InsigniaVitrina(Base):
    """Insignias obtenidas que el estudiante muestra a sus compañeros (ajuste pasaporte-perfil), hasta 3, por `orden`."""
    __tablename__ = "insignia_vitrina"
    __table_args__ = (
        UniqueConstraint("cuenta_id", "orden"),
        CheckConstraint("orden BETWEEN 1 AND 3", name="orden_vitrina_valido"),
    )
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"), primary_key=True)
    insignia_id: Mapped[int] = mapped_column(ForeignKey("insignia.id"), primary_key=True)
    orden: Mapped[int]


class PresentacionVista(Base):
    """Presentaciones de primera visita que la cuenta ya cerró; `vista_en` es la primera vez."""
    __tablename__ = "presentacion_vista"
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"), primary_key=True)
    presentacion_id: Mapped[int] = mapped_column(ForeignKey("presentacion.id"), primary_key=True)
    vista_en: Mapped[datetime] = mapped_column(DateTime)
