from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import TipoReferencia


class Referencia(Base):
    """Dato de la cuenta que lee una actividad o una pregunta de diario; se resuelve por cuenta al consultar."""
    __tablename__ = "referencia"
    __table_args__ = (
        CheckConstraint("(actividad_id IS NULL) <> (pregunta_diario_id IS NULL)", name="un_dueno"),
        CheckConstraint("tipo NOT IN ('ELECCION', 'TEXTO') OR item_registro_id IS NOT NULL",
                        name="fuente_registro"),
        CheckConstraint("(tipo IN ('RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO')) = (aplicacion_id IS NOT NULL)",
                        name="fuente_aplicacion"),
        CheckConstraint("(tipo = 'RESPUESTA_CUESTIONARIO') = (item_instrumento_id IS NOT NULL)",
                        name="fuente_cuestionario"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    tipo: Mapped[TipoReferencia] = mapped_column(enumerado(TipoReferencia))
    actividad_id: Mapped[int | None] = mapped_column(ForeignKey("actividad.id"))
    pregunta_diario_id: Mapped[int | None] = mapped_column(ForeignKey("pregunta_diario.id"))
    item_registro_id: Mapped[int | None] = mapped_column(ForeignKey("item_registro.id"))
    aplicacion_id: Mapped[int | None] = mapped_column(ForeignKey("aplicacion.id"))
    item_instrumento_id: Mapped[int | None] = mapped_column(ForeignKey("item_instrumento.id"))
