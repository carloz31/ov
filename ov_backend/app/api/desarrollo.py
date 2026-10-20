from fastapi import APIRouter

from app.dependencies import SesionBD, ejecutar_accion
from app.schemas.acciones import EventoEntrada, RespuestaAccion
from app.schemas.cuentas import CuentaResumen
from app.schemas.desarrollo import ReinicioDesarrollo
from app.services import desarrollo as servicio_desarrollo, eventos as servicio_eventos
from app.services.cuentas import listar_cuentas


# Solo con ENTORNO=desarrollo y fuera del guardia de acceso (B17).
router = APIRouter(tags=["Desarrollo"])


@router.post("/desarrollo/reiniciar", response_model=ReinicioDesarrollo)
def reiniciar(sesion: SesionBD):
    ejecutar_accion(sesion, lambda: servicio_desarrollo.reiniciar_estado(sesion))
    return ReinicioDesarrollo(mensaje="Datos de prueba reiniciados")


@router.post("/eventos", response_model=RespuestaAccion, response_model_exclude_unset=True, tags=["Depuración"])
def registrar_evento(entrada: EventoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_eventos.registrar_evento_crudo(sesion, entrada))


@router.get("/cuentas", response_model=list[CuentaResumen])
def consultar_cuentas(sesion: SesionBD):
    return listar_cuentas(sesion)
