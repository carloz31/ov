from fastapi import APIRouter

from app.dependencies import SesionBD, ejecutar_accion
from app.schemas.referencias import ReferenciasConsultadas
from app.services import referencias as servicio_referencias


router = APIRouter(tags=['Referencias'])


@router.get('/cuentas/{cuenta}/actividades/{actividad}/referencias', response_model=ReferenciasConsultadas,
            response_model_exclude_unset=True)
def consultar_referencias(cuenta: str, actividad: str, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: servicio_referencias.consultar_referencias(sesion, cuenta, actividad))
