from pydantic import BaseModel

from app.models.enums import TipoFavorito
from app.schemas.acciones import AccionCuenta
from app.schemas.catalogo import CarreraResumen, InstitucionResumen, OcupacionResumen


class FavoritoEntrada(AccionCuenta):
    tipo: TipoFavorito
    codigo: str


class FavoritosCuenta(BaseModel):
    """Los favoritos de la cuenta por clase, del más reciente al más antiguo."""
    carreras: list[CarreraResumen]
    ocupaciones: list[OcupacionResumen]
    instituciones: list[InstitucionResumen]
