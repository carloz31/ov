from fastapi import APIRouter, Request

from app.dependencies import Ahora, CuentaConsultada, SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import AbrirPreguntaEntrada, AccionCuenta
from app.schemas.diario import (
    AmistadAsistente, CheckInsCuenta, EntradaDiarioPublica, PreguntaAbierta, PreguntaDelDia, PreguntaDiarioEstado,
)
from app.services.diario import acciones as acciones_diario, consultas as consultas_diario


router = APIRouter(tags=["Diario"])


def _consultar(consulta, sesion, cuenta):
    try:
        return consulta(sesion, cuenta)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.get("/cuentas/{cuenta}/diario/preguntas", response_model=list[PreguntaDiarioEstado])
def consultar_preguntas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(consultas_diario.listar_preguntas_cuenta, sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/diario/entradas", response_model=list[EntradaDiarioPublica])
def consultar_entradas(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(consultas_diario.listar_entradas, sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/diario/amistad", response_model=AmistadAsistente)
def consultar_amistad(cuenta_consultada: CuentaConsultada, sesion: SesionBD):
    return _consultar(consultas_diario.amistad_cuenta, sesion, cuenta_consultada)


@router.get("/cuentas/{cuenta}/check-ins", response_model=CheckInsCuenta)
def consultar_check_ins(cuenta_consultada: CuentaConsultada, sesion: SesionBD, ahora: Ahora):
    return _consultar(lambda sesion, cuenta: consultas_diario.check_ins_cuenta(sesion, cuenta, ahora.date()),
                      sesion, cuenta_consultada)


def _con_asistente(accion, entrada, peticion):
    # No usa la dependencia de sesión: la redacción va entre dos transacciones, como en el registro.
    try:
        return accion(peticion.app.state.fabrica_sesiones, entrada, peticion.app.state.evaluador_respuestas,
                      tiempo_maximo_segundos=peticion.app.state.configuracion_registro.timeout_segundos)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error


@router.post("/acciones/diario/abrir-pregunta", response_model=PreguntaAbierta)
def abrir_pregunta(entrada: AbrirPreguntaEntrada, peticion: Request):
    return _con_asistente(acciones_diario.abrir_pregunta, entrada, peticion)


# Ajuste del diario (F05): archivar una carta lista y devolverla a pendiente.
@router.post("/acciones/diario/archivar-pregunta", response_model=PreguntaDiarioEstado)
def archivar_pregunta(entrada: AbrirPreguntaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_diario.archivar_pregunta(sesion, entrada))


@router.post("/acciones/diario/desarchivar-pregunta", response_model=PreguntaDiarioEstado)
def desarchivar_pregunta(entrada: AbrirPreguntaEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_diario.desarchivar_pregunta(sesion, entrada))


@router.post("/acciones/diario/pregunta-del-dia", response_model=PreguntaDelDia)
def pregunta_del_dia(entrada: AccionCuenta, peticion: Request):
    return _con_asistente(acciones_diario.pregunta_del_dia, entrada, peticion)
