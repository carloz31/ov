"""Panel del salón de la orientadora (ajuste panel-salon). `salon` es el código de uno de sus salones; sin él,
todos los suyos. Otro rol o un salón ajeno responden 404."""

from fastapi import APIRouter

from app.dependencies import Ahora, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.panel import EstudiantePanel, SeguimientoPanel
from app.services.panel import estudiantes as estudiantes_panel
from app.services.panel import seguimiento as seguimiento_panel

router = APIRouter(tags=["Panel del salón"])


def _consultar(funcion):
    try:
        return funcion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/panel/seguimiento", response_model=SeguimientoPanel)
def consultar_seguimiento(cuenta: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None):
    return _consultar(lambda: seguimiento_panel.seguimiento(sesion, cuenta, salon, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes", response_model=list[EstudiantePanel])
def consultar_estudiantes(cuenta: str, conjunto: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None,
                          valor: str | None = None):
    return _consultar(lambda: estudiantes_panel.estudiantes_del_conjunto(sesion, cuenta, salon, conjunto, valor,
                                                                         ahora))
