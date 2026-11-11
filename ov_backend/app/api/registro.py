from fastapi import APIRouter

from app.dependencies import SesionBD, ejecutar_accion
from app.schemas.registro import (
    AccionItemRegistroEntrada, BorradorRegistroEntrada, EditarRegistroEntrada, EntregarRegistroEntrada,
    ItemRegistroPublico, RegistroConsultado, ResponderSeguimientoEntrada, RespuestaRegistroAccion,
)
from app.services.registro import acciones as acciones_registro, consultas as consultas_registro


router = APIRouter(tags=['Registro'])

# Ajuste registros llm (lote 2): el flujo secuencial con el LLM v7 es del lote 3. Hasta entonces, la entrega es
# provisional y el resto responde 501 (después del guardia de acceso, como cualquier ruta).


@router.post('/acciones/registro/guardar-borrador')
def guardar_borrador(entrada: BorradorRegistroEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_registro.pendiente_lote_3(entrada))


@router.post('/acciones/registro/entregar', response_model=RespuestaRegistroAccion, response_model_exclude_unset=True)
def entregar(entrada: EntregarRegistroEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_registro.entregar(sesion, entrada))


@router.post('/acciones/registro/responder-seguimiento')
def responder_seguimiento(entrada: ResponderSeguimientoEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_registro.pendiente_lote_3(entrada))


@router.post('/acciones/registro/editar')
def editar(entrada: EditarRegistroEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_registro.pendiente_lote_3(entrada))


@router.post('/acciones/registro/continuar-sin-responder')
def continuar_sin_responder(entrada: AccionItemRegistroEntrada, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: acciones_registro.pendiente_lote_3(entrada))


@router.get('/actividades/{actividad}/items-registro', response_model=list[ItemRegistroPublico])
def consultar_items(actividad: str, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: consultas_registro.consultar_items(sesion, actividad))


@router.get('/cuentas/{cuenta}/actividades/{actividad}/registro', response_model=RegistroConsultado)
def consultar_registro(cuenta: str, actividad: str, sesion: SesionBD):
    return ejecutar_accion(sesion, lambda: consultas_registro.consultar_registro(sesion, cuenta, actividad))
