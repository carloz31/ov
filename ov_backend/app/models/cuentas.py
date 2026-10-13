from sqlalchemy import ForeignKey, Text, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, enumerado
from app.models.enums import Rol


class Salon(Base):
    __tablename__ = "salon"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]


class Cuenta(Base):
    __tablename__ = "cuenta"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    rol: Mapped[Rol] = mapped_column(enumerado(Rol))
    salon_id: Mapped[int | None] = mapped_column(ForeignKey("salon.id"))
    correo: Mapped[str | None] = mapped_column(unique=True)
    contrasena_hash: Mapped[str | None]
    activa: Mapped[bool] = mapped_column(default=True, server_default=true())


class OrientadoraSalon(Base):
    __tablename__ = "orientadora_salon"
    __table_args__ = (UniqueConstraint("orientadora_id", "salon_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    orientadora_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    salon_id: Mapped[int] = mapped_column(ForeignKey("salon.id"))
    es_principal: Mapped[bool]


class VinculoFamiliar(Base):
    __tablename__ = "vinculo_familiar"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    estudiante_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    apoderado_id: Mapped[int] = mapped_column(ForeignKey("cuenta.id"))
    parentesco: Mapped[str | None]
    es_activo: Mapped[bool] = mapped_column(default=True, server_default=true())
    carta_estudiante: Mapped[str | None] = mapped_column(Text)
    carta_apoderado: Mapped[str | None] = mapped_column(Text)
