"""Registro: validación de la actividad, opciones de un ítem, lectura del intento vigente y guardado de intentos.

Ajuste registros llm (lote 2): cada ítem tiene un intento vigente; guardar uno nuevo pasa el anterior, completo, al
histórico (`guardar_intento`). El flujo ítem por ítem con el LLM está en `flujo.py` (lote 3).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import exists, func, insert, select, update

from app.core.contexto import contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Cuenta, EstadoProgreso, EventoUso, ProgresoActividad, Referencia, RespuestaRegistro, Rol,
    TipoEventoUso, TipoObjetivo,
)
from app.models.enums import EstadoReferencia, FuenteOpciones
from app.services.comun import buscar_por_codigo, exigir_disponible
from app.services.referencias import resolver
from app.services.registro.eleccion import OpcionItem


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
