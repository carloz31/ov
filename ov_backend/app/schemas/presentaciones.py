from pydantic import BaseModel

from app.schemas.acciones import AccionCuenta


class PresentacionesCuenta(BaseModel):
    """`vistas`: códigos de las presentaciones de primera visita que la cuenta ya cerró, ordenados por código."""
    vistas: list[str]


class PresentacionVistaEntrada(AccionCuenta):
    codigo: str
