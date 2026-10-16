"""Conversaciones familiares y cartas (B12). El estado es del vínculo; cada rol ve el suyo."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import Conversacion, ConversacionVinculo, Cuenta, Rol, TipoEventoUso, TipoObjetivo, VinculoFamiliar
from app.schemas.acciones import CompletarConversacionEntrada, EscribirCartaEntrada, RespuestaAccion, RespuestaAgrupada
from app.schemas.conversaciones import ConversacionCuenta, ConversacionesCuenta, ResponderConversacionEntrada
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, existe_evento, fecha_accion, responder_con_eventos, responder_varias_cuentas,
)
from app.services.motor.reglas import objetivo_disponible
from app.services.secciones import exigir_seccion


# Sección que abre las conversaciones y la carta de cada rol.
SECCION_DE_ROL = {Rol.ESTUDIANTE: "FAMILIA", Rol.APODERADO: "CONVERSACIONES"}
ESTADOS = {(False, False): "sin_responder", (True, False): "esperando_al_otro",
           (False, True): "te_toca", (True, True): "por_conversar"}


def _vinculo(sesion: Session, cuenta: Cuenta) -> VinculoFamiliar:
    """Rol con conversaciones (si no, 404), su sección abierta y un vínculo activo (si no, 409)."""
    if cuenta.rol not in SECCION_DE_ROL:
        raise ErrorAccion("Las conversaciones no corresponden a esta cuenta", estado_http=404)
    exigir_seccion(sesion, cuenta, SECCION_DE_ROL[cuenta.rol])
    columna = VinculoFamiliar.estudiante_id if cuenta.rol == Rol.ESTUDIANTE else VinculoFamiliar.apoderado_id
    vinculo = sesion.scalar(select(VinculoFamiliar).where(
        columna == cuenta.id, VinculoFamiliar.es_activo.is_(True)).order_by(VinculoFamiliar.codigo).limit(1))
    if vinculo is None:
        raise ErrorAccion("La cuenta no pertenece a un vínculo familiar")
    return vinculo


def _roles(cuenta: Cuenta) -> tuple[str, str]:
    """Sufijos de las columnas propias y de la otra persona."""
    return ("estudiante", "apoderado") if cuenta.rol == Rol.ESTUDIANTE else ("apoderado", "estudiante")


def _registros(sesion: Session, vinculo: VinculoFamiliar) -> dict[int, ConversacionVinculo]:
    return {registro.conversacion_id: registro for registro in sesion.scalars(
        select(ConversacionVinculo).where(ConversacionVinculo.vinculo_id == vinculo.id))}


def _catalogo(sesion: Session) -> list:
    return sorted(contexto(sesion).definiciones.listar(Conversacion), key=lambda conversacion: conversacion.orden)


def _completadas(catalogo: list, registros: dict[int, ConversacionVinculo]) -> int:
    return sum(1 for c in catalogo if c.id in registros and registros[c.id].conversada_en is not None)


def _respuestas(registro: ConversacionVinculo | None, cuenta: Cuenta) -> tuple[str | None, str | None]:
    propio, otro = _roles(cuenta)
    if registro is None:
        return None, None
    return getattr(registro, f"respuesta_{propio}"), getattr(registro, f"respuesta_{otro}")


@usar_contexto
def consultar_conversaciones(sesion: Session, cuenta: Cuenta) -> ConversacionesCuenta:
    vinculo = _vinculo(sesion, cuenta)
    registros = _registros(sesion, vinculo)
    catalogo = _catalogo(sesion)
    completadas = _completadas(catalogo, registros)
    propio, otro = _roles(cuenta)
    carta_propia = getattr(vinculo, f"carta_{propio}")
    conversaciones = []
    # Con la carta escrita: el apoderado ve todas; el estudiante, las que le habilitan sus reglas.
    for conversacion in catalogo if carta_propia is not None else []:
        if cuenta.rol == Rol.ESTUDIANTE and not objetivo_disponible(
                sesion, cuenta, TipoObjetivo.CONVERSACION, conversacion.id):
            continue
        registro = registros.get(conversacion.id)
        mia, suya = _respuestas(registro, cuenta)
        ambas = mia is not None and suya is not None
        conversada_en = registro.conversada_en if registro is not None else None
        pregunta = conversacion.pregunta_estudiante
        if cuenta.rol == Rol.APODERADO and conversacion.pregunta_apoderado is not None:
            pregunta = conversacion.pregunta_apoderado
        conversaciones.append(ConversacionCuenta(
            codigo=conversacion.codigo, titulo=conversacion.titulo, pregunta=pregunta,
            estado="conversada" if conversada_en is not None else ESTADOS[mia is not None, suya is not None],
            mi_respuesta=mia, conversada_en=conversada_en, respuesta_otro=suya if ambas else None,
            preguntas_guia=list(conversacion.preguntas_guia) if ambas else None,
            mensaje_diferencias=conversacion.mensaje_diferencias if ambas else None,
        ))
    return ConversacionesCuenta(
        carta_pendiente=carta_propia is None, completadas=completadas, total=len(catalogo), carta_propia=carta_propia,
        carta_recibida=getattr(vinculo, f"carta_{otro}") if completadas == len(catalogo) else None,
        conversaciones=conversaciones,
    )


@usar_contexto
def escribir_carta(sesion: Session, entrada: EscribirCartaEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    vinculo = _vinculo(sesion, cuenta)
    catalogo = _catalogo(sesion)
    if _completadas(catalogo, _registros(sesion, vinculo)) == len(catalogo):
        raise ErrorAccion("La carta ya se entregó y no se puede cambiar")
    columna = f"carta_{_roles(cuenta)[0]}"
    primera = getattr(vinculo, columna) is None and not existe_evento(
        sesion, cuenta, TipoEventoUso.ESCRIBE_CARTA, vinculo.id,
    )
    setattr(vinculo, columna, entrada.texto)
    eventos = [(TipoEventoUso.ESCRIBE_CARTA, vinculo.id)] if primera else []
    return responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada))


@usar_contexto
def responder_conversacion(sesion: Session, entrada: ResponderConversacionEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    conversacion = buscar_por_codigo(sesion, Conversacion, entrada.conversacion)
    vinculo = _vinculo(sesion, cuenta)
    propio, otro = _roles(cuenta)
    if getattr(vinculo, f"carta_{propio}") is None:
        raise ErrorAccion("Escribe tu carta para empezar las conversaciones")
    # El apoderado responde aunque el hijo aún no la tenga habilitada.
    if cuenta.rol == Rol.ESTUDIANTE:
        exigir_disponible(sesion, cuenta, TipoObjetivo.CONVERSACION, conversacion)
    registro = _registros(sesion, vinculo).get(conversacion.id)
    if registro is None:
        registro = ConversacionVinculo(vinculo_id=vinculo.id, conversacion_id=conversacion.id)
        sesion.add(registro)
    elif getattr(registro, f"respuesta_{propio}") is not None and getattr(registro, f"respuesta_{otro}") is not None:
        raise ErrorAccion("La otra persona ya respondió; tu respuesta ya no se puede cambiar")
    fecha = fecha_accion(entrada)
    setattr(registro, f"respuesta_{propio}", entrada.texto)
    setattr(registro, f"respondida_{propio}_en", fecha)
    sesion.flush()
    return responder_con_eventos(sesion, cuenta, [], fecha)


@usar_contexto
def completar_conversacion(sesion: Session, entrada: CompletarConversacionEntrada) -> RespuestaAgrupada:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    conversacion = buscar_por_codigo(sesion, Conversacion, entrada.conversacion)
    vinculo = _vinculo(sesion, cuenta)
    registro = _registros(sesion, vinculo).get(conversacion.id)
    if registro is None or registro.respuesta_estudiante is None or registro.respuesta_apoderado is None:
        raise ErrorAccion("Los dos deben responder la pregunta antes de marcar la conversación")
    ids_cuentas = (vinculo.estudiante_id, vinculo.apoderado_id)
    por_id = {otra.id: otra for otra in sesion.scalars(select(Cuenta).where(Cuenta.id.in_(ids_cuentas)))}
    cuentas = [por_id[identificador] for identificador in ids_cuentas]
    estudiante = por_id[vinculo.estudiante_id]
    fecha = fecha_accion(entrada)
    eventos = {otra.id: [] for otra in cuentas}
    # Basta una marca y marcar de nuevo no cambia nada. El evento es solo del estudiante: le da su entrada de diario.
    if registro.conversada_en is None:
        registro.conversada_en = fecha
        registro.conversada_por = cuenta.id
        if not existe_evento(sesion, estudiante, TipoEventoUso.COMPLETA_CONVERSACION, conversacion.id):
            eventos[estudiante.id] = [(TipoEventoUso.COMPLETA_CONVERSACION, conversacion.id)]
    sesion.flush()
    return responder_varias_cuentas(sesion, cuentas, eventos, fecha)
