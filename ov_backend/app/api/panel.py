"""Panel del salón de la orientadora (ajuste panel-salon). `salon` es el código de uno de sus salones; sin él,
todos los suyos. Otro rol o un salón ajeno responden 404."""

from fastapi import APIRouter, Query

from app.core.parametros import LIMITE_PAGINA_CATALOGO

from app.dependencies import Ahora, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.panel import EstudiantePanel, InteresesPanel, PaginaAreasPanel, PaginaInstitucionesPanel, SeguimientoPanel
from app.schemas.panel_estudiante import (
    BorrarNotaEntrada, EditarNotaEntrada, EscribirNotaEntrada, NotaBorrada, NotaPerfil, PaginaEstudiantes,
    PerfilEstudiante,
)
from app.services.panel import estudiantes as estudiantes_panel
from app.services.panel import intereses as intereses_panel
from app.services.panel import lista as lista_panel
from app.services.panel import notas as notas_panel
from app.services.panel import perfil as perfil_panel
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


# --- Ajuste panel-estudiantes: lista y perfil del estudiante -------------------------------------

@router.get("/cuentas/{cuenta}/panel/lista-estudiantes", response_model=PaginaEstudiantes)
def consultar_lista_estudiantes(cuenta: str, sesion: SesionBD, ahora: Ahora, salon: str | None = None,
                                buscar: str | None = None, aviso: str | None = None, test: str | None = None,
                                acceso: str | None = None, orden: str | None = None, limite: int | None = None,
                                desde: int = Query(0)):
    return _consultar(lambda: lista_panel.lista_estudiantes(sesion, cuenta, salon, buscar, aviso, test, acceso, orden,
                                                            limite, desde, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}", response_model=PerfilEstudiante)
def consultar_perfil(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_panel.perfil(sesion, cuenta, estudiante, ahora))


@router.post("/acciones/escribir-nota", response_model=NotaPerfil)
def escribir_nota(entrada: EscribirNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.escribir_nota(sesion, entrada, ahora))


@router.post("/acciones/editar-nota", response_model=NotaPerfil)
def editar_nota(entrada: EditarNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.editar_nota(sesion, entrada, ahora))


@router.post("/acciones/borrar-nota", response_model=NotaBorrada)
def borrar_nota(entrada: BorrarNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.borrar_nota(sesion, entrada, ahora))
