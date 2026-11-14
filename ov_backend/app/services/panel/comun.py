"""Lo compartido del panel del salón (ajuste panel-salon): alcance de la orientadora, parámetros, posición en el
camino, estado del instrumento principal y último check-in. Todo se lee por lotes: una consulta por dato para todo
el salón, nunca una por estudiante."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from functools import cached_property
from statistics import median

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Aplicacion, AplicacionActividad, Bloque, CheckIn, ConversacionVinculo, Cuenta, Espacio,
    EstadoProgreso, EventoUso, Instrumento, Parametro, ProgresoActividad, RespuestaItem, ResultadoInstrumento,
    RitmoAplicacion, Rol, Salon, SalonInstrumento, TipoEventoUso, VinculoFamiliar,
)
from app.services.avance import por_espacio, tramos_del_camino
from app.services.investigaciones.acciones import exigir_orientadora

SIN_EMPEZAR = "SIN_EMPEZAR"
TERMINO = "TERMINO"


@dataclass(frozen=True)
class Estudiante:
    id: int
    codigo: str
    nombre: str
    salon_id: int


@dataclass(frozen=True)
class Alcance:
    """Los estudiantes que ve la orientadora: los de un salón suyo o, sin salón, los de todos los suyos."""
    salones: dict[int, Salon]
    salon: Salon | None
    estudiantes: list[Estudiante]
    ahora: datetime

    @property
    def ids(self) -> list[int]:
        return [estudiante.id for estudiante in self.estudiantes]


def resolver_alcance(sesion: Session, codigo_cuenta: str, salon: str | None, ahora: datetime) -> Alcance:
    """Otro rol responde 404 (`exigir_orientadora`); un salón que no es suyo, 404 «Salón no encontrado»."""
    _, ids_salones = exigir_orientadora(sesion, codigo_cuenta)
    salones = {s.id: s for s in sesion.scalars(select(Salon).where(Salon.id.in_(ids_salones)))}
    elegido = None
    if salon is not None:
        elegido = next((s for s in salones.values() if s.codigo == salon), None)
        if elegido is None:
            raise ErrorAccion("Salón no encontrado", estado_http=404)
    alcance = [elegido.id] if elegido else list(salones)
    filas = sesion.execute(select(Cuenta.id, Cuenta.codigo, Cuenta.nombre, Cuenta.salon_id).where(
        Cuenta.rol == Rol.ESTUDIANTE, Cuenta.salon_id.in_(alcance)).order_by(Cuenta.nombre, Cuenta.codigo))
    return Alcance(salones=salones, salon=elegido, estudiantes=[Estudiante(*fila) for fila in filas], ahora=ahora)


# --- Parámetros ----------------------------------------------------------------------------------

def leer_parametros(sesion: Session) -> dict[str, str]:
    return dict(sesion.execute(select(Parametro.codigo, Parametro.valor)).all())


def entero(parametros: dict[str, str], codigo: str) -> int:
    """El valor de un parámetro del panel; si falta, es un dato fijo ausente y la lectura falla."""
    return int(parametros[codigo])


# --- Camino --------------------------------------------------------------------------------------

def completadas_por_estudiante(sesion: Session, ids: list[int]) -> dict[int, set[int]]:
    completadas = defaultdict(set)
    for cuenta_id, actividad_id in sesion.execute(select(ProgresoActividad.cuenta_id, ProgresoActividad.actividad_id)
                                                  .where(ProgresoActividad.cuenta_id.in_(ids),
                                                         ProgresoActividad.estado == EstadoProgreso.COMPLETADA)):
        completadas[cuenta_id].add(actividad_id)
    return completadas


@dataclass(frozen=True)
class Posicion:
    """Dónde está un estudiante: `SIN_EMPEZAR` (número 0), un bloque del camino (1…n) o `TERMINO` (n + 1).
    `siguiente` es la primera requerida pendiente de su tramo actual."""
    codigo: str
    numero: int
    siguiente: Actividad | None


@dataclass(frozen=True)
class Camino:
    bloques: list[Bloque]
    posiciones: dict[int, Posicion]


def posiciones_en_camino(sesion: Session, estudiantes: list[Estudiante],
                         completadas: dict[int, set[int]]) -> Camino:
    """El tramo actual es el de `avance.tramos_del_camino` (el mismo cálculo que `/avance`)."""
    camino = por_espacio(sesion, Espacio.MISIONES_CAMPO)
    bloques = sorted({bloque.id: bloque for bloque, _ in camino}.values(), key=lambda bloque: bloque.numero)
    numero = {bloque.codigo: indice for indice, bloque in enumerate(bloques, start=1)}
    requeridas = defaultdict(list)
    for bloque, actividad in camino:
        if actividad.requerida:
            requeridas[bloque.codigo].append(actividad)
    posiciones = {}
    for estudiante in estudiantes:
        hechas = completadas.get(estudiante.id, set())
        _, actual = tramos_del_camino(camino, hechas)
        if not hechas:
            posicion = Posicion(SIN_EMPEZAR, 0, None)
        elif actual is None:
            posicion = Posicion(TERMINO, len(bloques) + 1, None)
        else:
            pendientes = sorted((a for a in requeridas[actual.codigo] if a.id not in hechas),
                                key=lambda a: (a.orden, a.codigo))
            posicion = Posicion(actual.codigo, numero[actual.codigo], pendientes[0] if pendientes else None)
        posiciones[estudiante.id] = posicion
    return Camino(bloques=bloques, posiciones=posiciones)


def muy_atras(estudiantes: list[Estudiante], camino: Camino, tramos: int) -> set[int]:
    """Su número de tramo es ≤ la mediana de su propio salón − `tramos`."""
    por_salon = defaultdict(list)
    for estudiante in estudiantes:
        por_salon[estudiante.salon_id].append(camino.posiciones[estudiante.id].numero)
    medianas = {salon_id: median(numeros) for salon_id, numeros in por_salon.items()}
    return {e.id for e in estudiantes if camino.posiciones[e.id].numero <= medianas[e.salon_id] - tramos}


def dias_desde(ahora: datetime, fecha: datetime) -> int:
    """Días de calendario entre dos fechas de Lima (las guardadas y `ahora` ya están en esa hora)."""
    return (ahora.date() - fecha.date()).days


# --- Eventos -------------------------------------------------------------------------------------

def ultimo_evento(sesion: Session, ids: list[int], tipo: TipoEventoUso) -> dict[int, datetime]:
    return dict(sesion.execute(select(EventoUso.cuenta_id, func.max(EventoUso.fecha_hora)).where(
        EventoUso.cuenta_id.in_(ids), EventoUso.tipo == tipo).group_by(EventoUso.cuenta_id)).all())


# --- Check-ins -----------------------------------------------------------------------------------

def senales_recientes(sesion: Session, ids: list[int]) -> dict[int, list[int]]:
    """Los niveles de seguridad de cada estudiante, del check-in más reciente al más antiguo."""
    senales = defaultdict(list)
    for cuenta_id, nivel in sesion.execute(select(CheckIn.cuenta_id, CheckIn.nivel_seguridad).where(
            CheckIn.cuenta_id.in_(ids)).order_by(CheckIn.cuenta_id, CheckIn.fecha.desc())):
        senales[cuenta_id].append(nivel)
    return senales


# --- Instrumentos --------------------------------------------------------------------------------

def aplicaciones_de(sesion: Session, codigo_instrumento: str) -> tuple[Instrumento | None, list[Aplicacion]]:
    definiciones = contexto(sesion).definiciones
    instrumento = next((i for i in definiciones.listar(Instrumento) if i.codigo == codigo_instrumento), None)
    if instrumento is None:
        return None, []
    return instrumento, sorted((a for a in definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id),
                               key=lambda a: a.id)


def por_revisar(sesion: Session, ids: list[int], aplicaciones: list[int], avisos_velocidad: int) -> dict[int, str]:
    """Única definición de «Por revisar» (bloque del test y alerta `instrumento_por_revisar`): resultado vigente con
    perfil plano (`PLANO`) o, si no, con `avisos_velocidad` o más avisos en ese intento (`PRISA`). Rehacer el test
    anula el resultado y borra la fila de ritmo, así que deja de cumplir."""
    if not ids or not aplicaciones:
        return {}
    vigentes = sesion.execute(select(
        ResultadoInstrumento.cuenta_id, ResultadoInstrumento.aplicacion_id, ResultadoInstrumento.perfil_plano,
        RitmoAplicacion.avisos_velocidad,
    ).outerjoin(RitmoAplicacion, (RitmoAplicacion.cuenta_id == ResultadoInstrumento.cuenta_id)
                & (RitmoAplicacion.aplicacion_id == ResultadoInstrumento.aplicacion_id)).where(
        ResultadoInstrumento.cuenta_id.in_(ids), ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)))
    revisar = {}
    for cuenta_id, _, plano, avisos in vigentes:
        if plano:
            revisar[cuenta_id] = "PLANO"
        elif (avisos or 0) >= avisos_velocidad and revisar.get(cuenta_id) != "PLANO":
            revisar[cuenta_id] = "PRISA"
    return revisar


def con_resultado_vigente(sesion: Session, ids: list[int], aplicaciones: list[int]) -> dict[int, set[int]]:
    """Por aplicación, los estudiantes con resultado vigente."""
    vigentes = defaultdict(set)
    if ids and aplicaciones:
        for cuenta_id, aplicacion_id in sesion.execute(select(
                ResultadoInstrumento.cuenta_id, ResultadoInstrumento.aplicacion_id).where(
                ResultadoInstrumento.cuenta_id.in_(ids), ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
                ResultadoInstrumento.anulado_en.is_(None))):
            vigentes[aplicacion_id].add(cuenta_id)
    return vigentes


def actividades_de_aplicaciones(sesion: Session, aplicaciones: list[int]) -> dict[int, set[int]]:
    por_aplicacion = defaultdict(set)
    for fila in contexto(sesion).definiciones.listar(AplicacionActividad):
        if fila.aplicacion_id in aplicaciones:
            por_aplicacion[fila.aplicacion_id].add(fila.actividad_id)
    return por_aplicacion


def con_algo_hecho(sesion: Session, ids: list[int], actividades: set[int],
                   completadas: dict[int, set[int]]) -> set[int]:
    """Respondió algún ítem en esas actividades o completó alguna."""
    hecho = {cuenta_id for cuenta_id, hechas in completadas.items() if hechas & actividades}
    if ids and actividades:
        hecho |= set(sesion.scalars(select(ProgresoActividad.cuenta_id).join(
            RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id).where(
            ProgresoActividad.cuenta_id.in_(ids), ProgresoActividad.actividad_id.in_(actividades)).distinct()))
    return hecho


def estados_test(sesion: Session, ids: list[int], aplicaciones: list[int], avisos_velocidad: int,
                 completadas: dict[int, set[int]]) -> tuple[dict[int, str], dict[int, str]]:
    """Cada estudiante en un solo estado (LISTO, POR_REVISAR, EN_CURSO, SIN_EMPEZAR) y, de los por revisar, el
    motivo (PLANO o PRISA)."""
    revisar = por_revisar(sesion, ids, aplicaciones, avisos_velocidad)
    vigentes = set().union(*con_resultado_vigente(sesion, ids, aplicaciones).values())
    actividades = set().union(*actividades_de_aplicaciones(sesion, aplicaciones).values())
    hecho = con_algo_hecho(sesion, ids, actividades, completadas)
    estados = {}
    for cuenta_id in ids:
        if cuenta_id in revisar:
            estados[cuenta_id] = "POR_REVISAR"
        elif cuenta_id in vigentes:
            estados[cuenta_id] = "LISTO"
        elif cuenta_id in hecho:
            estados[cuenta_id] = "EN_CURSO"
        else:
            estados[cuenta_id] = "SIN_EMPEZAR"
    return estados, revisar


def etiqueta_cuestionario(sesion: Session, instrumento_id: int, actividades: set[int], salones: list[int]) -> str:
    """REQUISITO si es prioritario en todos los salones del alcance (en algunos: REQUISITO_ALGUNOS); si no, CAMINO
    si alguna de sus actividades es requerida del camino; si no, OPCIONAL."""
    definiciones = contexto(sesion).definiciones
    prioritario = {fila.salon_id for fila in definiciones.listar(SalonInstrumento)
                   if fila.instrumento_id == instrumento_id and fila.es_prioritario}
    if salones and all(salon_id in prioritario for salon_id in salones):
        return "REQUISITO"
    if any(salon_id in prioritario for salon_id in salones):
        return "REQUISITO_ALGUNOS"
    camino = {actividad.id for bloque, actividad in por_espacio(sesion, Espacio.MISIONES_CAMPO) if actividad.requerida}
    return "CAMINO" if actividades & camino else "OPCIONAL"


# --- Familia -------------------------------------------------------------------------------------

def apoderados_por_estudiante(sesion: Session, ids: list[int]) -> dict[int, set[int]]:
    """Los apoderados con vínculo activo de cada estudiante."""
    apoderados = defaultdict(set)
    for estudiante_id, apoderado_id in sesion.execute(select(VinculoFamiliar.estudiante_id, VinculoFamiliar.apoderado_id)
                                                      .where(VinculoFamiliar.estudiante_id.in_(ids),
                                                             VinculoFamiliar.es_activo)):
        apoderados[estudiante_id].add(apoderado_id)
    return apoderados


def con_conversacion(sesion: Session, ids: list[int]) -> set[int]:
    """Estudiantes con al menos una conversación marcada como conversada en un vínculo activo."""
    return set(sesion.scalars(select(VinculoFamiliar.estudiante_id).join(
        ConversacionVinculo, ConversacionVinculo.vinculo_id == VinculoFamiliar.id).where(
        VinculoFamiliar.estudiante_id.in_(ids), VinculoFamiliar.es_activo,
        ConversacionVinculo.conversada_en.is_not(None)).distinct()))


# --- Lecturas compartidas --------------------------------------------------------------------------

class Lecturas:
    """Lo que leen el resumen y los evaluadores del alcance, cada cosa una sola vez por petición."""

    def __init__(self, sesion: Session, alcance: Alcance):
        self.sesion = sesion
        self.alcance = alcance

    @cached_property
    def completadas(self) -> dict[int, set[int]]:
        return completadas_por_estudiante(self.sesion, self.alcance.ids)

    @cached_property
    def camino(self) -> Camino:
        return posiciones_en_camino(self.sesion, self.alcance.estudiantes, self.completadas)

    @cached_property
    def senales(self) -> dict[int, list[int]]:
        return senales_recientes(self.sesion, self.alcance.ids)

    @cached_property
    def ultimo_ingreso(self) -> dict[int, datetime]:
        return ultimo_evento(self.sesion, self.alcance.ids, TipoEventoUso.INGRESO)

    @cached_property
    def apoderados(self) -> dict[int, set[int]]:
        return apoderados_por_estudiante(self.sesion, self.alcance.ids)

    @cached_property
    def ingreso_apoderados(self) -> dict[int, datetime]:
        todos = sorted(set().union(*self.apoderados.values())) if self.apoderados else []
        return ultimo_evento(self.sesion, todos, TipoEventoUso.INGRESO)

    @cached_property
    def familias_participando(self) -> set[int]:
        """Vínculo activo y algún apoderado vinculado con un INGRESO (no existía otro concepto de «familia
        registrada»)."""
        return {estudiante_id for estudiante_id, apoderados in self.apoderados.items()
                if apoderados & set(self.ingreso_apoderados)}

    def sin_ingreso_desde(self, dias: int) -> set[int]:
        """Sin INGRESO hace `dias` días o más, por fecha de Lima; quien nunca ingresó también."""
        return {cuenta_id for cuenta_id in self.alcance.ids
                if (ultimo := self.ultimo_ingreso.get(cuenta_id)) is None
                or dias_desde(self.alcance.ahora, ultimo) >= dias}
