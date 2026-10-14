from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.schemas.tematicas import AvanceTematica
from app.services import tematicas as servicio_tematicas


router = APIRouter(tags=["Consultas"])


@router.get("/cuentas/{cuenta}/tematicas", response_model=list[AvanceTematica])
def consultar_tematicas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return servicio_tematicas.avance_tematicas(sesion, cuenta_consultada)
