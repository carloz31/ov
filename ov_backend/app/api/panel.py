"""Panel del salón de la orientadora (ajuste panel-salon). `salon` es el código de uno de sus salones; sin él,
todos los suyos. Otro rol o un salón ajeno responden 404."""

from fastapi import APIRouter, Query

from app.core.parametros import LIMITE_PAGINA_CATALOGO

from app.dependencies import Ahora, SesionBD
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.panel import EstudiantePanel, InteresesPanel, PaginaAreasPanel, PaginaInstitucionesPanel, SeguimientoPanel
from app.services.panel import estudiantes as estudiantes_panel
from app.services.panel import intereses as intereses_panel
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


@router.get("/cuentas/{cuenta}/panel/intereses", response_model=InteresesPanel)
def consultar_intereses(cuenta: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None,
                        orden_areas: str | None = None, orden_instituciones: str | None = None):
    return _consultar(lambda: intereses_panel.intereses(sesion, cuenta, salon, orden_areas, orden_instituciones, ahora))


@router.get("/cuentas/{cuenta}/panel/areas", response_model=PaginaAreasPanel)
def consultar_areas(cuenta: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None, orden: str | None = None,
                    buscar: str | None = None, tipo: str | None = None,
                    limite: int = Query(LIMITE_PAGINA_CATALOGO), desde: int = Query(0)):
    return _consultar(lambda: intereses_panel.lista_areas(sesion, cuenta, salon, orden, buscar, tipo, limite, desde,
                                                          ahora))


@router.get("/cuentas/{cuenta}/panel/instituciones", response_model=PaginaInstitucionesPanel)
def consultar_instituciones(cuenta: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None,
                            orden: str | None = None, buscar: str | None = None, tipo: str | None = None,
                            limite: int = Query(LIMITE_PAGINA_CATALOGO), desde: int = Query(0)):
    return _consultar(lambda: intereses_panel.lista_instituciones(sesion, cuenta, salon, orden, buscar, tipo, limite,
                                                                  desde, ahora))
