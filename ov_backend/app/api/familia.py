from fastapi import APIRouter

from app.dependencies import CuentaConsultada, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.familia import FamiliaApoderado
from app.schemas.instrumentos import ResultadoPublico
from app.services import familia as servicio_familia


router = APIRouter(tags=["Familia"])


@router.get("/cuentas/{cuenta}/familia", response_model=FamiliaApoderado)
def consultar_familia(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_familia.consultar_familia(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/familia/resultados", response_model=list[ResultadoPublico],
            response_model_exclude_unset=True)
def consultar_resultados_hijo(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    try:
        return servicio_familia.resultados_hijo(sesion, cuenta_consultada)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
