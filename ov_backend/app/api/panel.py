"""Panel del salón de la orientadora (ajuste panel-salon). `salon` es el código de uno de sus salones; sin él,
todos los suyos. Otro rol o un salón ajeno responden 404."""

from fastapi import APIRouter, Query

from app.core.parametros import LIMITE_PAGINA_CATALOGO

from app.dependencies import Ahora, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.panel import EstudiantePanel, InteresesPanel, PaginaAreasPanel, PaginaInstitucionesPanel, SeguimientoPanel
from app.schemas.instrumentos import ResultadoPublico
from app.schemas.panel_estudiante import (
    AvanceEstudiantePerfil, BorrarNotaEntrada, EditarNotaEntrada, EscribirNotaEntrada, NotaBorrada, NotaPerfil,
    PaginaEstudiantes, PerfilEstudiante, PlanCompleto, PlanesEstudiante, RegistroLectura, RespuestasEstudiante,
    DetallePartidaLlegada, TestsEstudiante,
)
from app.services.panel import estudiantes as estudiantes_panel
from app.services.panel import intereses as intereses_panel
from app.services.panel import lista as lista_panel
from app.services.panel import notas as notas_panel
from app.services.panel import perfil as perfil_panel
from app.services.panel import perfil_avance, perfil_planes, perfil_respuestas, perfil_tests
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


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/tests", response_model=TestsEstudiante)
def consultar_tests(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_tests.tests(sesion, cuenta, estudiante, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/tests/partida-llegada",
            response_model=DetallePartidaLlegada)
def consultar_partida_llegada(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_tests.respuestas_partida_llegada(sesion, cuenta, estudiante, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/tests/{aplicacion}/resultado",
            response_model=ResultadoPublico)
def consultar_resultado(cuenta: str, estudiante: str, aplicacion: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_tests.resultado_completo(sesion, cuenta, estudiante, aplicacion, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/planes", response_model=PlanesEstudiante)
def consultar_planes(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_planes.planes(sesion, cuenta, estudiante, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/planes/{prioridad}", response_model=PlanCompleto)
def consultar_plan(cuenta: str, estudiante: str, prioridad: int, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_planes.plan_completo(sesion, cuenta, estudiante, prioridad, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/respuestas", response_model=RespuestasEstudiante)
def consultar_respuestas(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_respuestas.respuestas(sesion, cuenta, estudiante, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/respuestas/{actividad}", response_model=RegistroLectura)
def consultar_registro_respuestas(cuenta: str, estudiante: str, actividad: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_respuestas.registro(sesion, cuenta, estudiante, actividad, ahora))


@router.get("/cuentas/{cuenta}/panel/estudiantes/{estudiante}/avance", response_model=AvanceEstudiantePerfil)
def consultar_avance(cuenta: str, estudiante: str, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda: perfil_avance.avance(sesion, cuenta, estudiante, ahora))


@router.post("/acciones/escribir-nota", response_model=NotaPerfil)
def escribir_nota(entrada: EscribirNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.escribir_nota(sesion, entrada, ahora))


@router.post("/acciones/editar-nota", response_model=NotaPerfil)
def editar_nota(entrada: EditarNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.editar_nota(sesion, entrada, ahora))


@router.post("/acciones/borrar-nota", response_model=NotaBorrada)
def borrar_nota(entrada: BorrarNotaEntrada, sesion: SesionBD, ahora: Ahora):
    return ejecutar_accion(sesion, lambda: notas_panel.borrar_nota(sesion, entrada, ahora))
