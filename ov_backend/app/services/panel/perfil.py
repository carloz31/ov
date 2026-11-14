"""Perfil de un estudiante para la orientadora (ajuste panel-estudiantes): cabecera y pestaña Resumen. El acceso
está en `perfil_acceso.py`."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Audiencia, Bloque, Carrera, Cuenta, Dimension, FamiliaCarrera, Institucion, MomentoAplicacion,
    ResultadoInstrumento, TarjetaCarrera, VinculoFamiliar,
)
from app.schemas.panel import SalonPanel
from app.schemas.panel_estudiante import (
    ApoderadoCabecera, AvisoPerfil, CabeceraEstudiante, DimensionInteres, DimensionPartida, GrupoAvisosPerfil,
    InstitucionPlan, InteresesResumen, PartidaResumen, PerfilEstudiante, PlanResumen, TemaPerfil, TramoEstudiante,
)
from app.services.familia import rutas_completas
from app.services.instrumentos.consultas import avance_aplicacion, intereses_por_cuenta
from app.services.panel.alertas import AlertaCalculada, calcular_alertas
from app.services.panel.autopercepcion import dimensiones_de, instrumento_autopercepcion, mediciones
from app.services.panel.comun import (
    Lecturas, aplicaciones_de, dias_desde, entero, estados_test, leer_parametros,
)
from app.services.panel.notas import notas_de
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora
from app.services.panel.respuestas_resumen import resumen_respuestas

ORDEN_ZONAS = {"POR_TRABAJAR": 0, "EN_CAMINO": 1, "FUERTE": 2}


# --- Piezas compartidas con la lista ---------------------------------------------------------------

def tramo_de(lecturas: Lecturas, cuenta_id: int) -> TramoEstudiante:
    camino = lecturas.camino
    posicion = camino.posiciones[cuenta_id]
    nombres = {b.codigo: b.nombre for b in camino.bloques}
    return TramoEstudiante(codigo=posicion.codigo, numero=posicion.numero, total=len(camino.bloques),
                           nombre=nombres.get(posicion.codigo))


def dias_sin_ingreso(lecturas: Lecturas, cuenta_id: int) -> int | None:
    ultimo = lecturas.ultimo_ingreso.get(cuenta_id)
    return None if ultimo is None else dias_desde(lecturas.alcance.ahora, ultimo)


def estados_del_test(lecturas: Lecturas, parametros: dict) -> tuple[dict[int, str], dict[int, str]]:
    _, aplicaciones = aplicaciones_de(lecturas.sesion, parametros["PANEL_INSTRUMENTO_PRINCIPAL"])
    return estados_test(lecturas.sesion, lecturas.alcance.ids, [a.id for a in aplicaciones],
                        entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)


def avisos_por_estudiante(alertas: list[AlertaCalculada]) -> dict[int, list[AlertaCalculada]]:
    """Las alertas que cumple cada estudiante, en el orden de la base (grupo y alerta): la primera es la más
    importante."""
    por_estudiante = {}
    for calculada in alertas:
        for cuenta_id in calculada.datos:
            por_estudiante.setdefault(cuenta_id, []).append(calculada)
    return por_estudiante


# --- Resumen -------------------------------------------------------------------------------------

def _cabecera(acceso: Acceso, lecturas: Lecturas) -> CabeceraEstudiante:
    sesion, estudiante = lecturas.sesion, acceso.estudiante
    salon = acceso.salon.salon
    vinculo = sesion.execute(select(VinculoFamiliar, Cuenta).join(Cuenta, Cuenta.id == VinculoFamiliar.apoderado_id)
                             .where(VinculoFamiliar.estudiante_id == estudiante.id, VinculoFamiliar.es_activo)
                             .order_by(VinculoFamiliar.id)).first()
    apoderado = None
    if vinculo is not None:
        _, cuenta_apoderado = vinculo
        bloques = [b.id for b in contexto(sesion).definiciones.listar(Bloque) if b.audiencia == Audiencia.APODERADO]
        estado = ("TERMINO_RUTA" if rutas_completas(sesion, [cuenta_apoderado.id], bloques)
                  else "INGRESO" if cuenta_apoderado.id in lecturas.ingreso_apoderados else "AUN_NO_INGRESA")
        apoderado = ApoderadoCabecera(nombre=cuenta_apoderado.nombre, parentesco=vinculo[0].parentesco, estado=estado)
    return CabeceraEstudiante(codigo=estudiante.codigo, nombre=estudiante.nombre,
                              salon=SalonPanel(codigo=salon.codigo, nombre=salon.nombre),
                              dias_sin_ingreso=dias_sin_ingreso(lecturas, estudiante.id), apoderado=apoderado,
                              tramo=tramo_de(lecturas, estudiante.id))


def _avisos(alertas: list[AlertaCalculada], cuenta_id: int) -> list[GrupoAvisosPerfil]:
    grupos: dict[str, GrupoAvisosPerfil] = {}
    for calculada in alertas:
        if cuenta_id in calculada.datos:
            grupo = grupos.setdefault(calculada.grupo.codigo, GrupoAvisosPerfil(
                codigo=calculada.grupo.codigo, nombre=calculada.grupo.nombre, avisos=[]))
            grupo.avisos.append(AvisoPerfil(codigo=calculada.alerta.codigo, nombre=calculada.nombre_perfil(cuenta_id),
                                            descripcion=calculada.descripcion_perfil(cuenta_id),
                                            destino=calculada.alerta.destino))
    return list(grupos.values())


def _temas(lecturas: Lecturas, cuenta_id: int) -> list[TemaPerfil]:
    return [TemaPerfil(codigo=c.alerta.codigo, texto=c.descripcion_perfil(cuenta_id) or c.nombre_perfil(cuenta_id),
                       destino=c.alerta.destino)
            for c in calcular_alertas(lecturas, en_inicio=False) if cuenta_id in c.datos]


def intereses_vigentes(sesion: Session, cuenta_id: int, parametros: dict):
    """El resultado vigente del instrumento principal y, si no es plano, su código y familias recomendadas."""
    instrumento, aplicaciones = aplicaciones_de(sesion, parametros["PANEL_INSTRUMENTO_PRINCIPAL"])
    resultado = sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta_id, ResultadoInstrumento.aplicacion_id.in_([a.id for a in aplicaciones]),
        ResultadoInstrumento.anulado_en.is_(None)).order_by(ResultadoInstrumento.calculado_en.desc()))
    codigo, familias = None, []
    if resultado is not None and not resultado.perfil_plano:
        codigo, familias = intereses_por_cuenta(sesion, [resultado]).get(cuenta_id, (None, []))
    return instrumento, aplicaciones, resultado, codigo, familias


def _intereses(lecturas: Lecturas, acceso: Acceso, parametros: dict, estados, motivos) -> InteresesResumen | None:
    sesion, cuenta_id = lecturas.sesion, acceso.estudiante.id
    instrumento, aplicaciones, resultado, codigo, familias = intereses_vigentes(sesion, cuenta_id, parametros)
    if instrumento is None:
        return None
    dimensiones = {d.codigo: d for d in contexto(sesion).definiciones.listar(Dimension)
                   if d.instrumento_id == instrumento.id}
    nombres_familias = dict(sesion.execute(select(FamiliaCarrera.codigo, FamiliaCarrera.nombre).where(
        FamiliaCarrera.codigo.in_(familias))).all()) if familias else {}
    avances = [avance_aplicacion(sesion, acceso.estudiante, a) for a in aplicaciones]
    return InteresesResumen(
        instrumento=instrumento.codigo, estado=estados[cuenta_id], motivo=motivos.get(cuenta_id),
        fecha=resultado.calculado_en.date() if resultado else None,
        codigo=[DimensionInteres(codigo=letra, nombre=dimensiones[letra].nombre if letra in dimensiones else letra)
                for letra in (codigo or "")],
        areas=[nombres_familias.get(f, f) for f in familias],
        partes_respondidas=sum(a.actividades.completadas for a in avances),
        partes_total=sum(a.actividades.total for a in avances))


def planes_activos(sesion: Session, cuenta_id: int) -> list[tuple[TarjetaCarrera, Carrera, Institucion | None]]:
    filas = sesion.execute(select(TarjetaCarrera, Carrera, Institucion).join(
        Carrera, Carrera.id == TarjetaCarrera.carrera_id).outerjoin(
        Institucion, Institucion.id == TarjetaCarrera.institucion_id).where(
        TarjetaCarrera.cuenta_id == cuenta_id, TarjetaCarrera.activa).order_by(TarjetaCarrera.prioridad))
    return list(filas)


def en_areas(sesion: Session, carreras: list[Carrera], familias: list[str], hay_resultado: bool) -> dict[int, bool]:
    """Por carrera, si su familia está entre las áreas sugeridas (solo con resultado vigente no plano)."""
    if not hay_resultado:
        return {}
    codigos = dict(sesion.execute(select(FamiliaCarrera.id, FamiliaCarrera.codigo).where(
        FamiliaCarrera.id.in_({c.familia_id for c in carreras}))).all()) if carreras else {}
    return {c.id: codigos.get(c.familia_id) in familias for c in carreras}


def institucion_plan(institucion: Institucion | None) -> InstitucionPlan | None:
    return None if institucion is None else InstitucionPlan(nombre=institucion.nombre, tipo=institucion.tipo,
                                                            gestion=institucion.gestion)


def _planes(sesion: Session, cuenta_id: int, parametros: dict) -> list[PlanResumen]:
    planes = planes_activos(sesion, cuenta_id)
    _, _, _, codigo, familias = intereses_vigentes(sesion, cuenta_id, parametros)
    dentro = en_areas(sesion, [c for _, c, _ in planes], familias, codigo is not None)
    return [PlanResumen(prioridad=t.prioridad, carrera=c.nombre, institucion=institucion_plan(i),
                        en_areas=dentro.get(c.id)) for t, c, i in planes]


def cambio(partida: str | None, llegada: str | None) -> str | None:
    if partida is None or llegada is None:
        return None
    diferencia = ORDEN_ZONAS[llegada] - ORDEN_ZONAS[partida]
    return "SUBIO" if diferencia > 0 else "BAJO" if diferencia < 0 else "IGUAL"


def partida_resumen(sesion: Session, cuenta_id: int) -> PartidaResumen:
    instrumento = instrumento_autopercepcion(sesion)
    por_momento = mediciones(sesion, [cuenta_id]).get(cuenta_id, {})
    partida, llegada = por_momento.get(MomentoAplicacion.ENTRADA), por_momento.get(MomentoAplicacion.SALIDA)
    if instrumento is None or partida is None:
        return PartidaResumen(estado="SIN_PARTIDA", fecha_partida=None, fecha_llegada=None, dimensiones=[])
    dimensiones = []
    for d in dimensiones_de(sesion, instrumento):
        zona_partida = partida.zonas.get(d.id)
        zona_llegada = llegada.zonas.get(d.id) if llegada else None
        dimensiones.append(DimensionPartida(codigo=d.codigo, nombre=d.nombre, zona_partida=zona_partida,
                                            zona_llegada=zona_llegada, cambio=cambio(zona_partida, zona_llegada)))
    return PartidaResumen(estado="CON_LLEGADA" if llegada else "SOLO_PARTIDA", fecha_partida=partida.fecha.date(),
                          fecha_llegada=llegada.fecha.date() if llegada else None, dimensiones=dimensiones)


@usar_contexto
def perfil(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> PerfilEstudiante:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    parametros = leer_parametros(sesion)
    lecturas = Lecturas(sesion, acceso.salon)
    cuenta_id = acceso.estudiante.id
    estados, motivos = estados_del_test(Lecturas(sesion, acceso.solo), parametros)
    return PerfilEstudiante(
        cabecera=_cabecera(acceso, lecturas),
        avisos=_avisos(calcular_alertas(lecturas), cuenta_id),
        temas=_temas(Lecturas(sesion, acceso.solo), cuenta_id),
        intereses=_intereses(lecturas, acceso, parametros, estados, motivos),
        planes=_planes(sesion, cuenta_id, parametros),
        partida=partida_resumen(sesion, cuenta_id),
        respuestas=resumen_respuestas(sesion, acceso.estudiante, acceso.salon.salon),
        notas=notas_de(sesion, acceso.orientadora.id, cuenta_id))

