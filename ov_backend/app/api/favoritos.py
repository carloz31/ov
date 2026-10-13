from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import RespuestaAccion
from app.schemas.favoritos import FavoritoEntrada, FavoritosCuenta
from app.services import favoritos as servicio_favoritos


router = APIRouter(tags=["Favoritos"])


@router.get("/cuentas/{cuenta}/favoritos", response_model=FavoritosCuenta)
def consultar_favoritos(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_favoritos.listar_favoritos(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.post("/acciones/marcar-favorito", response_model=RespuestaAccion, response_model_exclude_unset=True)
def marcar_favorito(entrada: FavoritoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_favoritos.marcar_favorito(sesion, entrada))


@router.post("/acciones/desmarcar-favorito", response_model=RespuestaAccion, response_model_exclude_unset=True)
def desmarcar_favorito(entrada: FavoritoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_favoritos.desmarcar_favorito(sesion, entrada))
