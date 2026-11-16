"""Perfil de un estudiante para la orientadora (ajuste panel-estudiantes): cabecera y pestaña Resumen. El acceso
está en `perfil_acceso.py`."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Audiencia, Bloque, Cuenta, Dimension, FamiliaCarrera, Institucion, MomentoAplicacion, VinculoFamiliar,
)
from app.schemas.cuentas import SalonDatos
from app.schemas.panel_estudiante import (
    ApoderadoCabecera, AvisoPerfil, CabeceraEstudiante, DimensionInteres, DimensionPartida, GrupoAvisosPerfil,
    InstitucionPlan, InteresesResumen, PartidaResumen, PerfilEstudiante, PlanResumen, RespuestaDestino, TemaPerfil,
    TramoEstudiante,
)
from app.services.familia import rutas_completas
from app.services.instrumentos.consultas import avance_aplicacion
from app.services.panel.alertas import AlertaCalculada, calcular_alertas
from app.services.panel.autopercepcion import (
    comparar, dimensiones_de, instrumento_autopercepcion, mediciones, mediciones_del_alcance,
)
from app.services.panel.comun import (
    Lecturas, aplicaciones_de, areas_de_planes, dias_desde, entero, intereses_vigentes, planes_del_perfil,
)
from app.services.panel.notas import notas_de
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora
from app.services.panel.respuestas_resumen import resumen_respuestas

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
    return lecturas.estados_test([a.id for a in aplicaciones], entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"))


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
                              salon=SalonDatos.model_validate(salon),
                              dias_sin_ingreso=dias_sin_ingreso(lecturas, estudiante.id), apoderado=apoderado,
                              tramo=tramo_de(lecturas, estudiante.id))


def _respuesta(datos: dict) -> RespuestaDestino | None:
    """El registro y la pregunta a los que lleva el aviso o tema, si su evaluador los da (`actividad`, `item`)."""
    if datos.get("actividad") and datos.get("item"):
        return RespuestaDestino(actividad=datos["actividad"], item=datos["item"])
    return None


def _avisos(alertas: list[AlertaCalculada], cuenta_id: int) -> list[GrupoAvisosPerfil]:
    grupos: dict[str, GrupoAvisosPerfil] = {}
    for calculada in alertas:
        if cuenta_id in calculada.datos:
            grupo = grupos.setdefault(calculada.grupo.codigo, GrupoAvisosPerfil(
                codigo=calculada.grupo.codigo, nombre=calculada.grupo.nombre, avisos=[]))
            grupo.avisos.append(AvisoPerfil(codigo=calculada.alerta.codigo, nombre=calculada.nombre_perfil(cuenta_id),
                                            descripcion=calculada.descripcion_perfil(cuenta_id),
                                            destino=calculada.alerta.destino,
                                            respuesta=_respuesta(calculada.datos[cuenta_id])))
    return list(grupos.values())


def _temas(lecturas: Lecturas, cuenta_id: int) -> list[TemaPerfil]:
    """Todos los temas que cumple, en el orden de la base; el front corta en `temas_visibles`."""
    return [TemaPerfil(codigo=c.alerta.codigo, texto=c.descripcion_perfil(cuenta_id) or c.nombre_perfil(cuenta_id),
                       destino=c.alerta.destino, respuesta=_respuesta(c.datos[cuenta_id]))
            for c in calcular_alertas(lecturas, en_inicio=False) if cuenta_id in c.datos]


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
        instrumento=instrumento.codigo, estado=estados[cuenta_id], motivo_revision=motivos.get(cuenta_id),
        fecha=resultado.calculado_en.date() if resultado else None,
        codigo=[DimensionInteres(codigo=letra, nombre=dimensiones[letra].nombre if letra in dimensiones else letra)
                for letra in (codigo or "")],
        areas=[nombres_familias.get(f, f) for f in familias],
        partes_respondidas=sum(a.actividades.completadas for a in avances),
        partes_total=sum(a.actividades.total for a in avances))


def institucion_plan(institucion: Institucion | None) -> InstitucionPlan | None:
    return None if institucion is None else InstitucionPlan(nombre=institucion.nombre, tipo=institucion.tipo,
                                                            gestion=institucion.gestion)


def _planes(lecturas: Lecturas, cuenta_id: int) -> list[PlanResumen]:
    planes = planes_del_perfil(lecturas, cuenta_id)
    dentro = areas_de_planes(lecturas, cuenta_id)
    return [PlanResumen(prioridad=t.prioridad, carrera=c.nombre, institucion=institucion_plan(i),
                        en_areas=dentro.get(c.id)) for t, c, i in planes]


def partida_resumen(sesion: Session, cuenta_id: int, lecturas: Lecturas | None = None) -> PartidaResumen:
    """Con `lecturas` (cuyo alcance es esta cuenta), comparte sus mediciones con los temas."""
    instrumento = instrumento_autopercepcion(sesion)
    leidas = mediciones_del_alcance(lecturas) if lecturas is not None else mediciones(sesion, [cuenta_id])
    por_momento = leidas.get(cuenta_id, {})
    partida, llegada = por_momento.get(MomentoAplicacion.ENTRADA), por_momento.get(MomentoAplicacion.SALIDA)
    if instrumento is None or partida is None:
        return PartidaResumen(estado="SIN_PARTIDA", fecha_partida=None, fecha_llegada=None, dimensiones=[])
    dimensiones = [DimensionPartida(codigo=c.dimension.codigo, nombre=c.dimension.nombre, zona_partida=c.zona_partida,
                                    zona_llegada=c.zona_llegada, cambio=c.cambio)
                   for c in comparar(dimensiones_de(sesion, instrumento), partida, llegada)]
    return PartidaResumen(estado="CON_LLEGADA" if llegada else "SOLO_PARTIDA", fecha_partida=partida.fecha.date(),
                          fecha_llegada=llegada.fecha.date() if llegada else None, dimensiones=dimensiones)


@usar_contexto
def perfil(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> PerfilEstudiante:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    # Solo el estudiante consultado; del salón, únicamente el tramo de sus compañeros (`avance-bajo`).
    lecturas = Lecturas(sesion, acceso.solo, companeros=acceso.salon.estudiantes)
    parametros = lecturas.parametros
    cuenta_id = acceso.estudiante.id
    estados, motivos = estados_del_test(lecturas, parametros)
    return PerfilEstudiante(
        cabecera=_cabecera(acceso, lecturas),
        avisos=_avisos(calcular_alertas(lecturas), cuenta_id),
        temas=_temas(lecturas, cuenta_id),
        temas_visibles=entero(parametros, "PANEL_TEMAS_VISIBLES"),
        intereses=_intereses(lecturas, acceso, parametros, estados, motivos),
        planes=_planes(lecturas, cuenta_id),
        partida=partida_resumen(sesion, cuenta_id, lecturas),
        respuestas=resumen_respuestas(sesion, acceso.estudiante, acceso.salon.salon),
        notas=notas_de(sesion, acceso.orientadora.id, cuenta_id))

