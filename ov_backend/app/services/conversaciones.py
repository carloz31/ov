"""Conversaciones familiares y cartas (B12, F08). El estado es del vínculo; cada rol ve el suyo.

F08: una conversación queda conversada cuando responde el segundo; no hay marca aparte.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Conversacion, ConversacionVinculo, Cuenta, PreguntaDiario, Rol, TipoEventoUso, TipoNotificacion, TipoObjetivo,
    VinculoFamiliar,
)
from app.schemas.acciones import EscribirCartaEntrada, RespuestaAgrupada, RespuestaAccion
from app.schemas.conversaciones import (
    ConversacionCuenta, ConversacionesCuenta, EntradaDiarioConversacion, OtroVinculo, ResponderConversacionEntrada,
)
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, existe_evento, fecha_accion, responder_con_eventos, responder_varias_cuentas,
)
from app.services.motor.reglas import objetivo_disponible
from app.services.notificaciones import abrir_lote, crear as crear_notificacion
from app.services.secciones import exigir_seccion


# Sección que abre las conversaciones y la carta de cada rol.
SECCION_DE_ROL = {Rol.ESTUDIANTE: "FAMILIA", Rol.APODERADO: "CONVERSACIONES"}
ESTADOS = {(False, False): "sin_responder", (True, False): "esperando_al_otro",
           (False, True): "te_toca", (True, True): "conversada"}
SIN_CARTA = "Escribe tu carta para empezar las conversaciones"


def _vinculo(sesion: Session, cuenta: Cuenta, estudiante: str | None = None) -> VinculoFamiliar:
    """Rol con conversaciones (si no, 404), su sección abierta y un vínculo activo (si no, 409).

    El apoderado puede elegir el hijo (`estudiante`); sin él, el primer vínculo. Un hijo ajeno, 404.
    """
    if cuenta.rol not in SECCION_DE_ROL:
        raise ErrorAccion("Las conversaciones no corresponden a esta cuenta", estado_http=404)
    exigir_seccion(sesion, cuenta, SECCION_DE_ROL[cuenta.rol])
    columna = VinculoFamiliar.estudiante_id if cuenta.rol == Rol.ESTUDIANTE else VinculoFamiliar.apoderado_id
    consulta = select(VinculoFamiliar).where(columna == cuenta.id, VinculoFamiliar.es_activo.is_(True))
    if estudiante is not None and cuenta.rol == Rol.APODERADO:
        vinculo = sesion.scalar(consulta.join(Cuenta, Cuenta.id == VinculoFamiliar.estudiante_id).where(
            Cuenta.codigo == estudiante))
        if vinculo is None:
            raise ErrorAccion("El estudiante no es su hijo", estado_http=404)
        return vinculo
    vinculo = sesion.scalar(consulta.order_by(VinculoFamiliar.codigo).limit(1))
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


def _preguntas(conversacion: Conversacion, cuenta: Cuenta) -> tuple[str, str]:
    """La pregunta de quien consulta y la del otro; sin versión del apoderado, la misma para ambos."""
    del_apoderado = conversacion.pregunta_apoderado or conversacion.pregunta_estudiante
    if cuenta.rol == Rol.APODERADO:
        return del_apoderado, conversacion.pregunta_estudiante
    return conversacion.pregunta_estudiante, del_apoderado


def _entrada_diario(sesion: Session, cuenta: Cuenta, conversacion: Conversacion) -> EntradaDiarioConversacion | None:
    """La pregunta del diario que abre conversarla, si ya está desbloqueada para el estudiante."""
    definiciones = contexto(sesion).definiciones
    for regla in definiciones.reglas_evento.get(TipoEventoUso.COMPLETA_CONVERSACION, ()):
        if regla.tipo_objetivo != TipoObjetivo.PREGUNTA_DIARIO or not any(
                condicion.id_referencia == conversacion.id for condicion in regla.condiciones):
            continue
        if objetivo_disponible(sesion, cuenta, TipoObjetivo.PREGUNTA_DIARIO, regla.id_objetivo):
            pregunta = definiciones.obtener(PreguntaDiario, regla.id_objetivo)
            return EntradaDiarioConversacion(codigo=pregunta.codigo, nombre=pregunta.nombre, pregunta=pregunta.pregunta)
    return None


def _bloqueo(sesion: Session, cuenta: Cuenta, conversacion: Conversacion, carta_propia: str | None) -> str | None:
    """Sin carta, ninguna está abierta; el estudiante, además, solo tiene las que le abren sus reglas."""
    if carta_propia is None:
        return SIN_CARTA
    if cuenta.rol == Rol.ESTUDIANTE and not objetivo_disponible(
            sesion, cuenta, TipoObjetivo.CONVERSACION, conversacion.id):
        reglas = contexto(sesion).definiciones.reglas_objetivo.get((TipoObjetivo.CONVERSACION, conversacion.id), ())
        return reglas[0].mensaje_bloqueo if reglas else SIN_CARTA
    return None


def _otro(sesion: Session, cuenta: Cuenta, vinculo: VinculoFamiliar) -> Cuenta:
    return sesion.get(Cuenta, vinculo.apoderado_id if cuenta.rol == Rol.ESTUDIANTE else vinculo.estudiante_id)


@usar_contexto
def consultar_conversaciones(sesion: Session, cuenta: Cuenta, estudiante: str | None = None) -> ConversacionesCuenta:
    vinculo = _vinculo(sesion, cuenta, estudiante)
    registros = _registros(sesion, vinculo)
    catalogo = _catalogo(sesion)
    completadas = _completadas(catalogo, registros)
    entregadas = completadas == len(catalogo)
    propio, otro = _roles(cuenta)
    carta_propia = getattr(vinculo, f"carta_{propio}")
    otra_cuenta = _otro(sesion, cuenta, vinculo)
    conversaciones = []
    for conversacion in catalogo:
        registro = registros.get(conversacion.id)
        mia, suya = _respuestas(registro, cuenta)
        ambas = mia is not None and suya is not None
        bloqueo = _bloqueo(sesion, cuenta, conversacion, carta_propia)
        pregunta, pregunta_otro = _preguntas(conversacion, cuenta)
        conversaciones.append(ConversacionCuenta(
            codigo=conversacion.codigo, orden=conversacion.orden, titulo=conversacion.titulo,
            tema=conversacion.tema, pregunta=pregunta,
            estado="bloqueada" if bloqueo is not None and not ambas else ESTADOS[mia is not None, suya is not None],
            bloqueo_mensaje=bloqueo if not ambas else None,
            abierta_para_hijo=objetivo_disponible(sesion, otra_cuenta, TipoObjetivo.CONVERSACION, conversacion.id)
            if cuenta.rol == Rol.APODERADO else None,
            mi_respuesta=mia, conversada_en=registro.conversada_en if registro is not None else None,
            pregunta_otro=pregunta_otro if ambas else None, respuesta_otro=suya if ambas else None,
            preguntas_guia=list(conversacion.preguntas_guia) if ambas else None,
            mensaje_diferencias=conversacion.mensaje_diferencias if ambas else None,
            algo_que_saben=conversacion.algo_que_saben if ambas else None,
            entrada_diario=_entrada_diario(sesion, cuenta, conversacion)
            if ambas and cuenta.rol == Rol.ESTUDIANTE else None,
        ))
    return ConversacionesCuenta(
        carta_pendiente=carta_propia is None, completadas=completadas, total=len(catalogo),
        cartas_disponibles=entregadas, carta_propia=carta_propia,
        carta_recibida=getattr(vinculo, f"carta_{otro}") if entregadas else None,
        otro=OtroVinculo(codigo=otra_cuenta.codigo, nombre=otra_cuenta.nombre, parentesco=vinculo.parentesco),
        conversaciones=conversaciones,
    )


@usar_contexto
def escribir_carta(sesion: Session, entrada: EscribirCartaEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    vinculo = _vinculo(sesion, cuenta, entrada.estudiante)
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
def responder_conversacion(sesion: Session, entrada: ResponderConversacionEntrada) -> RespuestaAgrupada:
    """Guarda la respuesta propia; si con ella quedan las dos, la conversación queda conversada y ambas cuentas
    registran COMPLETA_CONVERSACION (la primera vez)."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    conversacion = buscar_por_codigo(sesion, Conversacion, entrada.conversacion)
    vinculo = _vinculo(sesion, cuenta, entrada.estudiante)
    propio, otro = _roles(cuenta)
    if getattr(vinculo, f"carta_{propio}") is None:
        raise ErrorAccion(SIN_CARTA)
    # El apoderado responde aunque el hijo aún no la tenga habilitada.
    if cuenta.rol == Rol.ESTUDIANTE:
        exigir_disponible(sesion, cuenta, TipoObjetivo.CONVERSACION, conversacion)
    registro = _registros(sesion, vinculo).get(conversacion.id)
    if registro is None:
        registro = ConversacionVinculo(vinculo_id=vinculo.id, conversacion_id=conversacion.id)
        sesion.add(registro)
    elif getattr(registro, f"respuesta_{otro}") is not None and getattr(registro, f"respuesta_{propio}") is not None:
        raise ErrorAccion("La otra persona ya respondió; tu respuesta ya no se puede cambiar")
    fecha = fecha_accion(entrada)
    primera_respuesta = getattr(registro, f"respuesta_{propio}") is None
    setattr(registro, f"respuesta_{propio}", entrada.texto)
    setattr(registro, f"respondida_{propio}_en", fecha)
    ids_cuentas = (vinculo.estudiante_id, vinculo.apoderado_id)
    por_id = {fila.id: fila for fila in sesion.scalars(select(Cuenta).where(Cuenta.id.in_(ids_cuentas)))}
    cuentas = [por_id[identificador] for identificador in ids_cuentas]
    eventos = {fila.id: [] for fila in cuentas}
    if getattr(registro, f"respuesta_{otro}") is not None and registro.conversada_en is None:
        registro.conversada_en = fecha
        registro.conversada_por = cuenta.id
        for fila in cuentas:
            if not existe_evento(sesion, fila, TipoEventoUso.COMPLETA_CONVERSACION, conversacion.id):
                eventos[fila.id] = [(TipoEventoUso.COMPLETA_CONVERSACION, conversacion.id)]
    sesion.flush()
    if primera_respuesta:
        # Ajuste notificaciones: el otro del vínculo se entera de la respuesta; al apoderado se le dice de qué hijo.
        otra_cuenta = por_id[vinculo.apoderado_id if cuenta.rol == Rol.ESTUDIANTE else vinculo.estudiante_id]
        hijo = por_id[vinculo.estudiante_id].codigo if otra_cuenta.rol == Rol.APODERADO else None
        abrir_lote(sesion)
        crear_notificacion(sesion, otra_cuenta, TipoNotificacion.RESPUESTA_CONVERSACION, conversacion.codigo,
                           conversacion.titulo, hijo, fecha=fecha)
    return responder_varias_cuentas(sesion, cuentas, eventos, fecha)
