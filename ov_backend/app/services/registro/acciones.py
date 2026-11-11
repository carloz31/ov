"""Registro: lectura del intento vigente, guardado de intentos y entrega provisional.

Ajuste registros llm (lote 2): cada ítem tiene un intento vigente; guardar uno nuevo pasa el anterior, completo, al
histórico (`guardar_intento`). La entrega es PROVISIONAL hasta el flujo secuencial del lote 3: guarda la elección y
el texto de cada ítem sin LLM (estado COMPLETADO), completa la actividad y emite REGISTRO_ADECUADO.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import exists, func, insert, select, update

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Cuenta, EstadoProgreso, EventoUso, ProgresoActividad, Referencia, RespuestaRegistro, Rol,
    TipoEventoUso, TipoObjetivo,
)
from app.models.enums import EstadoReferencia, EstadoRespuestaRegistro, FuenteOpciones
from app.schemas.registro import OpcionGuardada, RespuestaRegistroAccion, RespuestaRegistroPublica
from app.services.actividades import completar_progreso
from app.services.comun import buscar_por_codigo, exigir_disponible, fecha_accion, responder_con_eventos
from app.services.referencias import resolver
from app.services.registro.eleccion import OpcionItem, invalida, validar_eleccion

PENDIENTE_LOTE_3 = 'Pendiente de reescritura (ajuste registros, lote 3)'


def validar_registro(sesion, codigo_actividad, codigo_cuenta=None, disponible=False):
    actividad = buscar_por_codigo(sesion, Actividad, codigo_actividad)
    definiciones = contexto(sesion).definiciones
    bloque = definiciones.obtener(Bloque, actividad.bloque_id)
    if bloque.audiencia.value != Rol.ESTUDIANTE.value:
        raise ErrorAccion("Actividad de estudiante no encontrada", estado_http=404)
    cuenta = None
    if codigo_cuenta is not None:
        cuenta = buscar_por_codigo(sesion, Cuenta, codigo_cuenta)
        if cuenta.rol != Rol.ESTUDIANTE:
            raise ErrorAccion("Registro no encontrado para esta cuenta", estado_http=404)
        if disponible:
            exigir_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, actividad)
    return cuenta, actividad, definiciones.items_registro_por_actividad.get(actividad.id, ())


def opciones_de(sesion, item):
    """Opciones de la lista del ítem; también en la elección que retoma una anterior (F02)."""
    return contexto(sesion).definiciones.opciones_por_lista.get(item.lista_id, ())


def opciones_por_item(sesion, cuenta, items):
    """{id del ítem: opciones que ofrece}: las de su lista o las de su referencia resuelta en vivo para la cuenta,
    más sus opciones propias. Las piezas (PIEZAS_*) no se listan aquí: las arma `contexto.py`."""
    definiciones = contexto(sesion).definiciones
    de_referencia = {item.id: definiciones.obtener(Referencia, item.referencia_opciones_id) for item in items
                     if item.fuente_opciones == FuenteOpciones.REFERENCIA}
    resueltas = resolver(sesion, cuenta, list(de_referencia.values())) if de_referencia else {}
    opciones = {}
    for item in items:
        if item.id in de_referencia:
            resuelta = resueltas[de_referencia[item.id].codigo]
            base = [OpcionItem(o.codigo, o.texto, de_referencia=True) for o in resuelta.opciones or ()
                    ] if resuelta.estado == EstadoReferencia.DISPONIBLE else []
        else:
            base = [OpcionItem(o.codigo, o.texto) for o in opciones_de(sesion, item)]
        propias = [OpcionItem(o['codigo'], o['texto'], exclusiva=o.get('exclusiva', False),
                              sin_llm=o.get('sin_llm', False))
                   for o in item.opciones_propias or ()]
        opciones[item.id] = tuple(base + propias)
    return opciones


@dataclass(frozen=True, slots=True)
class RegistroLeido:
    progreso: ProgresoActividad | None
    # {id del ítem: intento vigente}
    vigentes: dict[int, RespuestaRegistro]


def leer_registro(sesion, cuenta, actividad):
    """El progreso y el intento vigente de cada ítem. Relee las filas aunque ya estén en la sesión: las acciones
    escriben con sentencias, no con el ORM."""
    filas = sesion.execute(select(ProgresoActividad, RespuestaRegistro).outerjoin(
        RespuestaRegistro, (RespuestaRegistro.progreso_id == ProgresoActividad.id) & RespuestaRegistro.vigente).where(
        ProgresoActividad.cuenta_id == cuenta.id, ProgresoActividad.actividad_id == actividad.id,
    ).execution_options(populate_existing=True)).all()
    return RegistroLeido(filas[0][0] if filas else None,
                         {respuesta.item_registro_id: respuesta for _, respuesta in filas if respuesta is not None})


def guardar_intento(sesion, progreso_id, item_id, datos, fecha):
    """Guarda un intento nuevo del ítem y devuelve su id. El vigente anterior pasa al histórico tal como está
    (`vigente = false`): no se borra ni se modifica nada más de él. `datos` son las columnas del intento."""
    anterior = sesion.scalar(select(func.max(RespuestaRegistro.intento)).where(
        RespuestaRegistro.progreso_id == progreso_id, RespuestaRegistro.item_registro_id == item_id))
    sesion.execute(update(RespuestaRegistro.__table__).where(
        RespuestaRegistro.progreso_id == progreso_id, RespuestaRegistro.item_registro_id == item_id,
        RespuestaRegistro.vigente).values(vigente=False, actualizada_en=marca_actualizacion()))
    return sesion.execute(insert(RespuestaRegistro.__table__).returning(RespuestaRegistro.id), dict(
        progreso_id=progreso_id, item_registro_id=item_id, intento=(anterior or 0) + 1, vigente=True,
        creada_en=fecha, actualizada_en=marca_actualizacion(), **datos)).scalar_one()


def respuesta_publica(item, respuesta):
    return RespuestaRegistroPublica(
        item=item.codigo, estado=respuesta.estado, texto=respuesta.primera_respuesta,
        opciones_elegidas=[OpcionGuardada(codigo=e['codigo'], texto=e['texto']) for e in respuesta.opciones_elegidas or ()])


def registro_publico(registro, items):
    progreso = registro.progreso
    return dict(estado=progreso.estado if progreso is not None else None,
                respuestas=[respuesta_publica(item, registro.vigentes[item.id])
                            for item in items if item.id in registro.vigentes])


def publico(sesion, cuenta, actividad, items):
    return registro_publico(leer_registro(sesion, cuenta, actividad), items)


def crear_progreso(sesion, cuenta, actividad):
    progreso = ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id, estado=EstadoProgreso.EN_CURSO)
    sesion.add(progreso)
    sesion.flush()
    return progreso


def marca_actualizacion(anterior=None):
    """Avanza aunque la fecha simulada o el reloj retrocedan. En hora de Lima, como el resto de fechas guardadas."""
    ahora = datetime.now(timezone(timedelta(hours=-5))).replace(tzinfo=None)
    return max(ahora, anterior + timedelta(microseconds=1)) if anterior is not None else ahora


def registro_adecuado_emitido(sesion, cuenta, actividad):
    return sesion.scalar(select(exists().where(
        EventoUso.cuenta_id == cuenta.id, EventoUso.tipo == TipoEventoUso.REGISTRO_ADECUADO,
        EventoUso.id_referencia == actividad.id)))


def sin_llm_elegida(opciones, elegidas):
    """La opción marcada no pasa por el LLM (`sin_llm`): su texto es opcional."""
    por_codigo = {opcion.codigo: opcion for opcion in opciones}
    return any(por_codigo[e['codigo']].sin_llm for e in elegidas if e['codigo'] in por_codigo)


@usar_contexto
def entregar(sesion, entrada):
    """PROVISIONAL (lote 3): guarda todos los ítems de una vez, sin LLM (COMPLETADO), completa la actividad y emite
    REGISTRO_ADECUADO. Valida la elección contra las opciones fijas del ítem; de las piezas, solo el prefijo."""
    cuenta, actividad, items = validar_registro(sesion, entrada.actividad, entrada.cuenta, disponible=True)
    registro = leer_registro(sesion, cuenta, actividad)
    if registro.progreso is not None and registro.progreso.estado == EstadoProgreso.COMPLETADA:
        raise ErrorAccion("El registro ya fue entregado")
    por_codigo = {item.codigo: item for item in items}
    codigos = [i.item for i in entrada.items]
    if len(codigos) != len(set(codigos)):
        raise invalida("Un ítem no puede entregarse dos veces en la misma petición")
    if any(codigo not in por_codigo for codigo in codigos):
        raise ErrorAccion("El ítem no pertenece a esta actividad")
    faltantes = [item.codigo for item in items if item.obligatorio and item.codigo not in codigos]
    if faltantes:
        raise ErrorAccion("Faltan ítems por responder antes de entregar", items_faltantes=faltantes)
    opciones = opciones_por_item(sesion, cuenta, items)
    guardar = []
    for entrega in entrada.items:
        item = por_codigo[entrega.item]
        elegidas = validar_eleccion(item, opciones[item.id], entrega.opciones, True)
        # Ningún ítem se guarda vacío, salvo que la opción marcada vaya sin LLM.
        if not entrega.texto.strip() and not sin_llm_elegida(opciones[item.id], elegidas):
            raise invalida("La respuesta no puede estar vacía")
        guardar.append((item, elegidas, entrega.texto))
    fecha = fecha_accion(entrada)
    progreso = registro.progreso or crear_progreso(sesion, cuenta, actividad)
    for item, elegidas, texto in guardar:
        guardar_intento(sesion, progreso.id, item.id, dict(
            opciones_elegidas=elegidas, primera_respuesta=texto, estado=EstadoRespuestaRegistro.COMPLETADO), fecha)
    _, eventos = completar_progreso(sesion, cuenta, actividad)
    if not registro_adecuado_emitido(sesion, cuenta, actividad):
        eventos = [*eventos, (TipoEventoUso.REGISTRO_ADECUADO, actividad.id)]
    respuesta = responder_con_eventos(sesion, cuenta, eventos, fecha)
    return RespuestaRegistroAccion(**publico(sesion, cuenta, actividad, items), **respuesta.campos())


def pendiente_lote_3(*_):
    """Seguimiento, edición, borradores y continuar sin responder: el flujo secuencial es del lote 3."""
    raise ErrorAccion(PENDIENTE_LOTE_3, estado_http=501)
