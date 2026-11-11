from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.dependencies import SesionBD, ejecutar_accion
from app.exceptions import ErrorAccion, traducir_error_accion
from app.schemas.acciones import CompletarActividadEntrada
from app.schemas.registro import (
    AccionItemRegistroEntrada, ItemRegistroPublico, PasoRegistro, RegistroConsultado, ResponderItemEntrada,
    ResponderSeguimientoEntrada, RespuestaRegistroAccion,
)
from app.services.registro import consultas as consultas_registro, flujo as flujo_registro


router = APIRouter(tags=['Registro'])

# Ajuste registros llm (lote 3): responder, seguir y reenviar un ítem no usan la dependencia de sesión. La respuesta se
# confirma antes de llamar al LLM y la evaluación se escribe en otra transacción, como la pregunta del día.


def _con_llm(accion, entrada, peticion):
    try:
        return accion(peticion.app.state.fabrica_sesiones, entrada, peticion.app.state.cliente_llm)
    except ErrorAccion as error:
        raise traducir_error_accion(error) from error
    except IntegrityError as error:
        # Dos respuestas a la vez sobre el mismo ítem: el índice de un solo intento vigente rechaza la segunda.
        raise HTTPException(status_code=409, detail={
            "mensaje": "Ese ítem se está guardando en otra petición; intenta de nuevo",
        }) from error


@router.post('/acciones/registro/responder', response_model=PasoRegistro)
def responder(entrada: ResponderItemEntrada, peticion: Request):
    return _con_llm(flujo_registro.responder, entrada, peticion)


@router.post('/acciones/registro/responder-seguimiento', response_model=PasoRegistro)
def responder_seguimiento(entrada: ResponderSeguimientoEntrada, peticion: Request):
    return _con_llm(flujo_registro.responder_seguimiento, entrada, peticion)


@router.post('/acciones/registro/reenviar', response_model=PasoRegistro)
def reenviar(entrada: AccionItemRegistroEntrada, peticion: Request):
    return _con_llm(flujo_registro.reenviar, entrada, peticion)


@router.post('/acciones/registro/entregar', response_model=RespuestaRegistroAccion, response_model_exclude_unset=True)
def entregar(entrada: CompletarActividadEntrada, sesion: SesionBD):
    """Terminar el registro (§5)."""
    return ejecutar_accion(sesion, lambda: flujo_registro.terminar(sesion, entrada))


@router.get('/actividades/{actividad}/items-registro', response_model=list[ItemRegistroPublico])
def consultar_items(actividad: str, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: consultas_registro.consultar_items(sesion, actividad))


@router.get('/cuentas/{cuenta}/actividades/{actividad}/registro', response_model=RegistroConsultado)
def consultar_registro(cuenta: str, actividad: str, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: consultas_registro.consultar_registro(sesion, cuenta, actividad))
