"""Planes de carrera (B11): secciones de la tarjeta, referencias de rubros y caminos, y las tarjetas de cada cuenta.

Las opciones (motivos, camino, rubros, financiamiento, complicaciones y tipos de paso) son de listas comunes;
cada una admite «Otro» con texto: exactamente uno de los dos está presente."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text, UniqueConstraint, false, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import (
    EstadoDuda, EstadoPaso, EstadoSugerencia, FrecuenciaGasto, OrigenDuda, OrigenIdea, OrigenSugerencia,
    PreguntaConocimiento, RespuestaConocimiento,
)


def _opcion_u_otro(opcion: str, otro: str) -> CheckConstraint:
    return CheckConstraint(f"({opcion} IS NULL) <> ({otro} IS NULL)", name="opcion_u_otro")


# --- Catálogo ------------------------------------------------------------------------------------

class SeccionTarjeta(Base):
    """Sección de la tarjeta que se abre con una regla SECCION_PLAN; `para_comparar` entra en «listo para comparar»."""
    __tablename__ = "seccion_tarjeta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    orden: Mapped[int] = mapped_column(unique=True)
    para_comparar: Mapped[bool]


class ReferenciaRubro(Base):
    """Rubro de RUBROS_GASTO que el front propone, con su frecuencia y monto de referencia.

    Sin monto (nulo), el estudiante lo consulta en la institución (F07b: Matrícula y Pensión)."""
    __tablename__ = "referencia_rubro"
    __table_args__ = (CheckConstraint("monto_referencia >= 0", name="monto_valido"),)
    opcion_id: Mapped[int] = mapped_column(ForeignKey("opcion_lista.id"), primary_key=True)
    frecuencia_recomendada: Mapped[FrecuenciaGasto] = mapped_column(enumerado(FrecuenciaGasto))
    monto_referencia: Mapped[int | None]
    cero_si_publica: Mapped[bool] = mapped_column(default=False, server_default=false())
    solo_si_camino_prepara: Mapped[bool] = mapped_column(default=False, server_default=false())


class ReferenciaCamino(Base):
    """Opción de CAMINOS que incluye prepararse antes de postular (precarga del rubro Preparación)."""
    __tablename__ = "referencia_camino"
    opcion_id: Mapped[int] = mapped_column(ForeignKey("opcion_lista.id"), primary_key=True)
    incluye_preparacion: Mapped[bool]


# --- Estado de la cuenta -------------------------------------------------------------------------

class TarjetaCarrera(Base):
    __tablename__ = "tarjeta_carrera"
    __table_args__ = (
        UniqueConstraint("cuenta_id", "carrera_id", name="uq_tarjeta_carrera_carrera"),
        UniqueConstraint("cuenta_id", "prioridad", name="uq_tarjeta_carrera_prioridad"),
        CheckConstraint("prioridad >= 1", name="prioridad_valida"),
        CheckConstraint("camino_opcion_id IS NULL OR camino_otro IS NULL", name="un_camino"),
        CheckConstraint("entusiasmo BETWEEN 1 AND 3", name="entusiasmo_valido"),
        CheckConstraint("capacidad BETWEEN 1 AND 3", name="capacidad_valida"),
        CheckConstraint("recursos BETWEEN 1 AND 3", name="recursos_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    carrera_id: Mapped[int] = mapped_column(ForeignKey("carrera.id"))
    prioridad: Mapped[int]
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime)
    idea_origen: Mapped[OrigenIdea | None] = mapped_column(enumerado(OrigenIdea), default=None)
    relato: Mapped[str | None] = mapped_column(Text, default=None)
    institucion_id: Mapped[int | None] = mapped_column(ForeignKey("institucion.id"), default=None)
    camino_opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"), default=None)
    camino_otro: Mapped[str | None] = mapped_column(Text, default=None)
    entusiasmo: Mapped[int | None] = mapped_column(default=None)
    capacidad: Mapped[int | None] = mapped_column(default=None)
    recursos: Mapped[int | None] = mapped_column(default=None)
    guardada_por_que_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    guardada_conocimiento_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    guardada_realidad_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    guardada_pasos_en: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    # Último `numero` dado en cada secuencia de la tarjeta; los números no se reutilizan aunque se borren filas.
    ultimo_numero_duda: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    ultimo_numero_complicacion: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    ultimo_numero_sugerencia: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    ultimo_numero_paso: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    # Llamadas al LLM de sugerencias hechas para esta tarjeta; el tope es MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN.
    llamadas_sugerencias: Mapped[int] = mapped_column(default=0, server_default=text("0"))


class MotivoTarjeta(Base):
    """Motivo de VALORES u «Otro»; la posición 1 es el principal."""
    __tablename__ = "motivo_tarjeta"
    __table_args__ = (_opcion_u_otro("opcion_id", "texto_otro"),)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"))
    texto_otro: Mapped[str | None] = mapped_column(Text)


class ConocimientoTarjeta(Base):
    __tablename__ = "conocimiento_tarjeta"
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"), primary_key=True)
    pregunta: Mapped[PreguntaConocimiento] = mapped_column(enumerado(PreguntaConocimiento), primary_key=True)
    respuesta: Mapped[RespuestaConocimiento] = mapped_column(enumerado(RespuestaConocimiento))


class DudaTarjeta(Base):
    """Duda de una pregunta fija (una por pregunta), de DUDAS_SUGERIDAS o propia; un paso hecho la cierra."""
    __tablename__ = "duda_tarjeta"
    __table_args__ = (
        # `pregunta` solo existe con origen PREGUNTA, así que el único equivale a un índice parcial.
        UniqueConstraint("tarjeta_id", "pregunta", name="uq_duda_tarjeta_pregunta"),
        UniqueConstraint("tarjeta_id", "numero", name="uq_duda_tarjeta_numero"),
        CheckConstraint("(origen = 'PREGUNTA') = (pregunta IS NOT NULL)", name="pregunta_segun_origen"),
        CheckConstraint("(origen = 'SUGERIDA') = (opcion_id IS NOT NULL)", name="opcion_segun_origen"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"))
    numero: Mapped[int]
    origen: Mapped[OrigenDuda] = mapped_column(enumerado(OrigenDuda))
    pregunta: Mapped[PreguntaConocimiento | None] = mapped_column(enumerado(PreguntaConocimiento))
    opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"))
    texto: Mapped[str] = mapped_column(Text)
    estado: Mapped[EstadoDuda] = mapped_column(enumerado(EstadoDuda))
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    # `paso_tarjeta.duda_id` apunta de vuelta: esta clave se crea aparte para romper el ciclo.
    cerrada_por_paso_id: Mapped[int | None] = mapped_column(ForeignKey(
        "paso_tarjeta.id", use_alter=True, ondelete="SET NULL", name="fk_duda_tarjeta_cerrada_por_paso_id_paso_tarjeta"))


class GastoTarjeta(Base):
    __tablename__ = "gasto_tarjeta"
    __table_args__ = (_opcion_u_otro("rubro_opcion_id", "rubro_otro"),
                      CheckConstraint("monto >= 0", name="monto_valido"))
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    rubro_opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"))
    rubro_otro: Mapped[str | None] = mapped_column(Text)
    monto: Mapped[int]
    frecuencia: Mapped[FrecuenciaGasto] = mapped_column(enumerado(FrecuenciaGasto))


class FinanciamientoTarjeta(Base):
    __tablename__ = "financiamiento_tarjeta"
    __table_args__ = (_opcion_u_otro("opcion_id", "texto_otro"),)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"), primary_key=True)
    posicion: Mapped[int] = mapped_column(primary_key=True)
    opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"))
    texto_otro: Mapped[str | None] = mapped_column(Text)


class ComplicacionTarjeta(Base):
    __tablename__ = "complicacion_tarjeta"
    __table_args__ = (_opcion_u_otro("opcion_id", "texto_otro"),
                      UniqueConstraint("tarjeta_id", "numero", name="uq_complicacion_tarjeta_numero"))
    id: Mapped[int] = mapped_column(primary_key=True)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"))
    numero: Mapped[int]
    opcion_id: Mapped[int | None] = mapped_column(ForeignKey("opcion_lista.id"))
    texto_otro: Mapped[str | None] = mapped_column(Text)
    creada_en: Mapped[datetime] = mapped_column(DateTime)


class SugerenciaTarjeta(Base):
    """Paso sugerido para una duda o una complicación; se borra con ella, en cualquier estado."""
    __tablename__ = "sugerencia_tarjeta"
    __table_args__ = (CheckConstraint("(duda_id IS NULL) <> (complicacion_id IS NULL)", name="un_origen"),
                      UniqueConstraint("tarjeta_id", "numero", name="uq_sugerencia_tarjeta_numero"))
    id: Mapped[int] = mapped_column(primary_key=True)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"))
    numero: Mapped[int]
    duda_id: Mapped[int | None] = mapped_column(ForeignKey("duda_tarjeta.id", ondelete="CASCADE"))
    complicacion_id: Mapped[int | None] = mapped_column(ForeignKey("complicacion_tarjeta.id", ondelete="CASCADE"))
    tipo_opcion_id: Mapped[int] = mapped_column(ForeignKey("opcion_lista.id"))
    texto: Mapped[str] = mapped_column(Text)
    estado: Mapped[EstadoSugerencia] = mapped_column(enumerado(EstadoSugerencia))
    generada_por: Mapped[OrigenSugerencia] = mapped_column(enumerado(OrigenSugerencia))
    creada_en: Mapped[datetime] = mapped_column(DateTime)


class PasoTarjeta(Base):
    """Paso del estudiante; si se borra su duda, complicación o sugerencia, conserva texto, tipo y estado."""
    __tablename__ = "paso_tarjeta"
    __table_args__ = (UniqueConstraint("tarjeta_id", "numero", name="uq_paso_tarjeta_numero"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tarjeta_id: Mapped[int] = mapped_column(ForeignKey("tarjeta_carrera.id", ondelete="CASCADE"))
    numero: Mapped[int]
    posicion: Mapped[int]
    tipo_opcion_id: Mapped[int] = mapped_column(ForeignKey("opcion_lista.id"))
    texto: Mapped[str] = mapped_column(Text)
    duda_id: Mapped[int | None] = mapped_column(ForeignKey("duda_tarjeta.id", ondelete="SET NULL"))
    complicacion_id: Mapped[int | None] = mapped_column(ForeignKey("complicacion_tarjeta.id", ondelete="SET NULL"))
    sugerencia_id: Mapped[int | None] = mapped_column(ForeignKey("sugerencia_tarjeta.id", ondelete="SET NULL"))
    estado: Mapped[EstadoPaso] = mapped_column(enumerado(EstadoPaso))
    hallazgo: Mapped[str | None] = mapped_column(Text)
    hecho_en: Mapped[datetime | None] = mapped_column(DateTime)
