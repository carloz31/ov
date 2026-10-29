from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError

from app.core.parametros import LIMITE_PAGINA_CATALOGO
from app.dependencies import CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import RespuestaAccion, RespuestaAgrupada
from app.schemas.investigaciones import (
    CancelarInvestigacionEntrada, ComentarEntrada, DestacarEntrada, EditarEntrevistaEntrada, EntrevistaDetalle,
    EntrevistaEntrada, GuardarGuionEntrada, GuardarLoQuePiensoEntrada, InvestigacionesCuenta, PaginaEntrevistas,
    PaginaPublicaciones, PedirSugerenciasEntrada, PublicacionDetalle, PublicarEntrevistaEntrada, ReaccionarEntrada,
    ReaccionEntrada, ReportarEntrada, ReporteEntrada, SugerenciasGuion,
)
from app.services.investigaciones import acciones as acciones_investigaciones
from app.services.investigaciones import consultas as consultas_investigaciones
from app.services.investigaciones import orientadora as orientadora_investigaciones
from app.services.investigaciones import sugerencias as sugerencias_investigaciones


router = APIRouter(tags=["Investigaciones"])


def _consultar(funcion):
    try:
        return funcion()
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/investigaciones", response_model=InvestigacionesCuenta)
def consultar_investigaciones(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(lambda: consultas_investigaciones.consultar_investigaciones(sesion, cuenta_consultada))


@router.post("/acciones/guardar-lo-que-pienso", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_lo_que_pienso(entrada: GuardarLoQuePiensoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.guardar_lo_que_pienso(sesion, entrada))


@router.post("/acciones/pedir-sugerencias-guion", response_model=SugerenciasGuion)
def pedir_sugerencias_guion(entrada: PedirSugerenciasEntrada, peticion: Request):
    # No usa la dependencia de sesión: la llamada al LLM va entre dos transacciones, como en planes.
    try:
        return sugerencias_investigaciones.pedir_sugerencias(
            peticion.app.state.fabrica_sesiones, entrada, peticion.app.state.evaluador_respuestas,
            tiempo_maximo_segundos=peticion.app.state.configuracion_registro.timeout_segundos)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail={
            "mensaje": "La acción entra en conflicto con el estado actual de la cuenta",
        }) from error


@router.post("/acciones/guardar-guion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def guardar_guion(entrada: GuardarGuionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.guardar_guion(sesion, entrada))


@router.post("/acciones/cancelar-investigacion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def cancelar_investigacion(entrada: CancelarInvestigacionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.cancelar_investigacion(sesion, entrada))


@router.get("/cuentas/{cuenta}/entrevistas", response_model=PaginaEntrevistas)
def listar_entrevistas(cuenta_consultada: CuentaConsultada, sesion: SesionBD, vista: str = 'SALON',
                       buscar: str | None = None, favoritas: bool = False, no_vistas: bool = False,
                       destacadas: bool = False, orden: str = 'RECIENTES', ocupacion: str | None = None,
                       limite: int = Query(LIMITE_PAGINA_CATALOGO, ge=1, le=100), desde: int = Query(0, ge=0)):
    return _consultar(lambda: consultas_investigaciones.listar_entrevistas(
        sesion, cuenta_consultada, vista, buscar, favoritas, no_vistas, destacadas, orden, limite, desde,
        ocupacion))


@router.get("/cuentas/{cuenta}/entrevistas/{codigo}", response_model=EntrevistaDetalle)
def detalle_entrevista(cuenta_consultada: CuentaConsultada, codigo: str, sesion: SesionBD):
    return _consultar(lambda: consultas_investigaciones.detalle_entrevista(sesion, cuenta_consultada, codigo))


@router.post("/acciones/publicar-entrevista", response_model=RespuestaAgrupada, response_model_exclude_unset=True)
def publicar_entrevista(entrada: PublicarEntrevistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.publicar_entrevista(sesion, entrada))


@router.post("/acciones/editar-entrevista", response_model=RespuestaAgrupada, response_model_exclude_unset=True)
def editar_entrevista(entrada: EditarEntrevistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.editar_entrevista(sesion, entrada))


@router.post("/acciones/retirar-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def retirar_entrevista(entrada: EntrevistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.retirar_entrevista(sesion, entrada))


@router.post("/acciones/ver-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def ver_entrevista(entrada: EntrevistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.ver_entrevista(sesion, entrada))


@router.post("/acciones/reaccionar-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def reaccionar_entrevista(entrada: ReaccionarEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.reaccionar(sesion, entrada))


@router.post("/acciones/eliminar-reaccion", response_model=RespuestaAccion, response_model_exclude_unset=True)
def eliminar_reaccion(entrada: ReaccionEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.eliminar_reaccion(sesion, entrada))


@router.post("/acciones/reportar", response_model=RespuestaAccion, response_model_exclude_unset=True)
def reportar(entrada: ReportarEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_investigaciones.reportar(sesion, entrada))


# --- Orientadora ---------------------------------------------------------------------------------

@router.get("/cuentas/{cuenta}/publicaciones", response_model=PaginaPublicaciones)
def listar_publicaciones(cuenta: str, sesion: SesionBD, salon: str | None = None, estado: str | None = None,
                         con_reportes: bool = False, buscar: str | None = None,
                         limite: int = Query(LIMITE_PAGINA_CATALOGO, ge=1, le=100), desde: int = Query(0, ge=0)):
    return _consultar(lambda: orientadora_investigaciones.listar_publicaciones(
        sesion, cuenta, salon, estado, con_reportes, buscar, limite, desde))


@router.get("/cuentas/{cuenta}/publicaciones/{codigo}", response_model=PublicacionDetalle)
def detalle_publicacion(cuenta: str, codigo: str, sesion: SesionBD):
    return _consultar(lambda: orientadora_investigaciones.detalle_publicacion(sesion, cuenta, codigo))


@router.post("/acciones/destacar-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def destacar_entrevista(entrada: DestacarEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: orientadora_investigaciones.destacar_entrevista(sesion, entrada))


@router.post("/acciones/comentar-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def comentar_entrevista(entrada: ComentarEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: orientadora_investigaciones.comentar_entrevista(sesion, entrada))


@router.post("/acciones/eliminar-entrevista", response_model=RespuestaAccion, response_model_exclude_unset=True)
def eliminar_entrevista(entrada: EntrevistaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: orientadora_investigaciones.eliminar_entrevista(sesion, entrada))


@router.post("/acciones/descartar-reporte", response_model=RespuestaAccion, response_model_exclude_unset=True)
def descartar_reporte(entrada: ReporteEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: orientadora_investigaciones.descartar_reporte(sesion, entrada))
