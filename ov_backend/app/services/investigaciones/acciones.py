"""Acciones del estudiante sobre su investigación y sus entrevistas (B13)."""

from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Cuenta, EstadoInvestigacion, EstadoSugerenciaGuion, Investigacion, Ocupacion, OrigenPreguntaGuion,
    PreguntaGuion, SugerenciaGuion, TipoEventoUso,
)
from app.schemas.acciones import RespuestaAccion
from app.schemas.investigaciones import (
    CancelarInvestigacionEntrada, GuardarGuionEntrada, GuardarLoQuePiensoEntrada,
)
from app.services.comun import buscar_por_codigo, fecha_accion, responder_con_eventos
from app.services.investigaciones.consultas import (
    exigir_investigacion_activa, exigir_seccion_investigaciones, investigacion_activa,
)


def cuenta_estudiante(sesion: Session, codigo: str) -> Cuenta:
    """La cuenta con la sección INVESTIGACIONES abierta (404 si no es de estudiante, 409 si está cerrada)."""
    cuenta = buscar_por_codigo(sesion, Cuenta, codigo)
    exigir_seccion_investigaciones(sesion, cuenta)
    return cuenta


# --- Investigación y guion ----------------------------------------------------------------------

@usar_contexto
def guardar_lo_que_pienso(sesion: Session, entrada: GuardarLoQuePiensoEntrada) -> RespuestaAccion:
    """Sin investigación activa, la crea (INICIA_INVESTIGACION); con ella, cambia ocupación y textos sin cambiar su
    estado. Si cambia algo, las sugerencias pendientes dejan de valer y la próxima petición llama al LLM."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    ocupacion = buscar_por_codigo(sesion, Ocupacion, entrada.ocupacion)
    fecha = fecha_accion(entrada)
    textos = (entrada.dia, entrada.necesita, entrada.duda)
    investigacion = investigacion_activa(sesion, cuenta.id)
    if investigacion is None:
        sesion.add(Investigacion(
            codigo=f'INV-{uuid4().hex}', cuenta_id=cuenta.id, ocupacion_id=ocupacion.id,
            estado=EstadoInvestigacion.EN_CURSO, piensa_dia=textos[0], piensa_necesita=textos[1],
            piensa_duda=textos[2], creada_en=fecha))
        sesion.flush()
        return responder_con_eventos(sesion, cuenta, [(TipoEventoUso.INICIA_INVESTIGACION, ocupacion.id)], fecha)
    anteriores = (investigacion.ocupacion_id, investigacion.piensa_dia, investigacion.piensa_necesita,
                  investigacion.piensa_duda)
    if anteriores != (ocupacion.id, *textos):
        investigacion.ocupacion_id = ocupacion.id
        investigacion.piensa_dia, investigacion.piensa_necesita, investigacion.piensa_duda = textos
        investigacion.sugerencias_vigentes = False
        sesion.execute(delete(SugerenciaGuion).where(SugerenciaGuion.investigacion_id == investigacion.id,
                                                     SugerenciaGuion.estado == EstadoSugerenciaGuion.PENDIENTE))
        sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def guardar_guion(sesion: Session, entrada: GuardarGuionEntrada) -> RespuestaAccion:
    """Reemplaza las preguntas del guion. Las sugeridas citan una sugerencia pendiente (o ya agregada) de esta
    investigación, que pasa a AGREGADA; las descartadas, una pendiente. `terminar` (al menos una pregunta propia o la
    duda, validado en la entrada) deja la guía lista; la primera vez registra TERMINA_GUION."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    investigacion = exigir_investigacion_activa(sesion, cuenta)
    fecha = fecha_accion(entrada)
    sugerencias = {s.codigo: s for s in sesion.scalars(select(SugerenciaGuion).where(
        SugerenciaGuion.investigacion_id == investigacion.id))}
    agregadas = [p.sugerencia for p in entrada.preguntas if p.origen == OrigenPreguntaGuion.SUGERIDA]
    if any(codigo not in sugerencias or sugerencias[codigo].estado == EstadoSugerenciaGuion.DESCARTADA
           for codigo in agregadas):
        raise ErrorAccion('Esa sugerencia no está disponible en tu guion', estado_http=404)
    if any(codigo not in sugerencias or sugerencias[codigo].estado != EstadoSugerenciaGuion.PENDIENTE
           for codigo in entrada.descartadas):
        raise ErrorAccion('Esa sugerencia no está disponible en tu guion', estado_http=404)
    sesion.execute(delete(PreguntaGuion).where(PreguntaGuion.investigacion_id == investigacion.id))
    sesion.add_all(PreguntaGuion(investigacion_id=investigacion.id, posicion=posicion, origen=p.origen, texto=p.texto)
                   for posicion, p in enumerate(entrada.preguntas, start=1))
    for codigo in agregadas:
        sugerencias[codigo].estado = EstadoSugerenciaGuion.AGREGADA
    for codigo in entrada.descartadas:
        sugerencias[codigo].estado = EstadoSugerenciaGuion.DESCARTADA
    eventos = []
    if entrada.terminar:
        if investigacion.guia_lista_en is None:
            investigacion.guia_lista_en = fecha
            eventos.append((TipoEventoUso.TERMINA_GUION, investigacion.ocupacion_id))
        investigacion.estado = EstadoInvestigacion.GUIA_LISTA
    elif investigacion.estado == EstadoInvestigacion.GUIA_LISTA and not any(
            p.origen != OrigenPreguntaGuion.SUGERIDA for p in entrada.preguntas):
        raise ErrorAccion('Tu guion necesita al menos una pregunta tuya', estado_http=422)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, eventos, fecha)


@usar_contexto
def cancelar_investigacion(sesion: Session, entrada: CancelarInvestigacionEntrada) -> RespuestaAccion:
    """Borra la investigación activa con su guion y sus sugerencias; sus eventos quedan."""
    cuenta = cuenta_estudiante(sesion, entrada.cuenta)
    investigacion = exigir_investigacion_activa(sesion, cuenta)
    for modelo in (PreguntaGuion, SugerenciaGuion):
        sesion.execute(delete(modelo).where(modelo.investigacion_id == investigacion.id))
    sesion.delete(investigacion)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))
