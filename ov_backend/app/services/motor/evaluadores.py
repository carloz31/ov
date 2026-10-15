from collections.abc import Callable
from functools import partial

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Actividad, Aplicacion, Bloque, Carrera, Cuenta, Dimension, HighPoint, Institucion, Instrumento,
    MomentoAplicacion, PasoTarjeta, ResultadoDimension, ResultadoInstrumento, SalonInstrumento, TipoCarrera, TipoEventoUso,
    TarjetaCarrera, TipoResultado,
)
from app.services.instrumentos.calculo import calcular_codigo_interes


def _vistos(datos, cuenta: Cuenta, evento: TipoEventoUso) -> set[int]:
    """Elementos distintos vistos (no eventos): las referencias de sus eventos de vista."""
    datos.cargar_conteos([cuenta.id])
    return {referencia for tipo, referencia in datos.conteos[cuenta.id] if tipo == evento and referencia is not None}


def _grupos_carrera_familia(sesion: Session, vistos: set[int] | None) -> set:
    carreras = contexto(sesion).definiciones.listar(Carrera)
    return {c.familia_id for c in carreras if vistos is None or c.id in vistos}


def _grupos_ocupacion_high_point(sesion: Session, vistos: set[int] | None) -> set:
    consulta = select(HighPoint.dimension_id).where(HighPoint.posicion == 1).distinct()
    if vistos is not None:
        consulta = consulta.where(HighPoint.ocupacion_id.in_(vistos))
    return set(sesion.scalars(consulta))


def _grupos_institucion_tipo(sesion: Session, vistos: set[int] | None) -> set:
    consulta = select(Institucion.tipo).distinct()
    if vistos is not None:
        consulta = consulta.where(Institucion.id.in_(vistos))
    return set(sesion.scalars(consulta))


# clase: (evento de vista, agrupador por atributo). El agrupador con `None` devuelve todos los grupos del catálogo.
CLASES_VISTAS = {
    ('CARRERA', 'familia'): (TipoEventoUso.VISTA_CARRERA, _grupos_carrera_familia),
    ('OCUPACION', 'high_point'): (TipoEventoUso.VISTA_OCUPACION, _grupos_ocupacion_high_point),
    ('INSTITUCION', 'tipo'): (TipoEventoUso.VISTA_INSTITUCION, _grupos_institucion_tipo),
}


@usar_contexto
def vistas_diversas(sesion: Session, cuenta: Cuenta, clase: str, atributo: str) -> bool:
    """B10: elementos distintos vistos de `clase`, agrupados por `atributo`; se cumple con al menos `umbral` grupos.

    El umbral es `parametro_evaluador`; nulo exige todos los grupos disponibles en el catálogo cargado."""
    datos = contexto(sesion)
    regla = getattr(datos, 'regla_en_evaluacion', None)
    if regla is None:
        raise ValueError('Debe indicar la regla para evaluar las vistas')
    umbral = regla.parametro_evaluador
    if umbral is not None and (isinstance(umbral, bool) or not isinstance(umbral, int) or umbral < 1):
        raise ValueError('El evaluador de vistas requiere un parámetro entero positivo o nulo')
    evento, agrupar = CLASES_VISTAS[clase, atributo]
    vistos = _vistos(datos, cuenta, evento)
    if not vistos:
        return False
    grupos = agrupar(sesion, vistos)
    if umbral is None:
        disponibles = agrupar(sesion, None)
        return bool(disponibles) and disponibles <= grupos
    return len(grupos) >= umbral


def _letra_principal_resultado(sesion: Session, cuenta: Cuenta) -> str | None:
    """Primera letra del código de interés del resultado RIASEC vigente; sin resultado o con perfil plano, None."""
    definiciones = contexto(sesion).definiciones
    instrumentos = {i.id for i in definiciones.listar(Instrumento) if i.tipo_resultado == TipoResultado.COINCIDENCIAS}
    aplicaciones = [a.id for a in definiciones.listar(Aplicacion) if a.instrumento_id in instrumentos]
    filas = sesion.execute(select(ResultadoInstrumento.id, ResultadoInstrumento.perfil_plano, Dimension.codigo,
                                  ResultadoDimension.puntaje).join(
        ResultadoDimension, ResultadoDimension.resultado_id == ResultadoInstrumento.id).join(
        Dimension, Dimension.id == ResultadoDimension.dimension_id).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
        ResultadoInstrumento.aplicacion_id.in_(aplicaciones)).order_by(
        ResultadoInstrumento.calculado_en.desc(), ResultadoInstrumento.id.desc(), Dimension.orden)).all()
    if not filas or filas[0].perfil_plano:
        return None
    vigente = [fila for fila in filas if fila.id == filas[0].id]
    codigo = calcular_codigo_interes([fila.puntaje for fila in vigente], [fila.codigo for fila in vigente])
    return codigo.codigo[0]


@usar_contexto
def vista_fuera_del_perfil(sesion: Session, cuenta: Cuenta) -> bool:
    """B10 · `t-explorar` (sin parámetro). Mira el tipo principal (posición 1) de las carreras y ocupaciones vistas.

    Con resultado RIASEC vigente, basta una vista de tipo principal distinto de la primera letra del código de
    interés; sin resultado o con perfil plano, hacen falta vistas de al menos dos tipos principales distintos."""
    datos = contexto(sesion)
    carreras = _vistos(datos, cuenta, TipoEventoUso.VISTA_CARRERA)
    ocupaciones = _vistos(datos, cuenta, TipoEventoUso.VISTA_OCUPACION)
    if not carreras and not ocupaciones:
        return False
    principales = set(sesion.scalars(select(Dimension.codigo).join(
        TipoCarrera, TipoCarrera.dimension_id == Dimension.id).where(
        TipoCarrera.posicion == 1, TipoCarrera.carrera_id.in_(carreras)).union(select(Dimension.codigo).join(
            HighPoint, HighPoint.dimension_id == Dimension.id).where(
            HighPoint.posicion == 1, HighPoint.ocupacion_id.in_(ocupaciones)))))
    letra = _letra_principal_resultado(sesion, cuenta)
    if letra is None:
        return len(principales) >= 2
    return bool(principales - {letra})


@usar_contexto
def misiones_camino_sin_inicio(sesion: Session, cuenta: Cuenta) -> bool:
    datos = contexto(sesion)
    regla = getattr(datos, 'regla_en_evaluacion', None)
    if regla is None:
        raise ValueError('Debe indicar la regla para evaluar las misiones del camino')
    minimo = regla.parametro_evaluador
    if not isinstance(minimo, int) or isinstance(minimo, bool) or minimo < 1:
        raise ValueError('El evaluador de misiones requiere un parámetro entero positivo')
    bloque = datos.definiciones.por_codigo(Bloque, 'CAMINO')
    if bloque is None:
        return False
    actividades = {actividad.id for actividad in datos.definiciones.listar(Actividad)
                   if actividad.bloque_id == bloque.id and actividad.orden != 1}
    datos.cargar_conteos([cuenta.id])
    completadas = {referencia for tipo, referencia in datos.conteos[cuenta.id]
                  if tipo == TipoEventoUso.COMPLETA_ACTIVIDAD and referencia in actividades}
    return len(completadas) >= minimo


@usar_contexto
def instrumentos_prioritarios(sesion: Session, cuenta: Cuenta) -> bool:
    """B07: la partida (ENTRADA de todo COMPARACION) y los cuestionarios prioritarios del salón, revelados.

    La partida es obligatoria por diseño; la marca de prioritario no aplica a un COMPARACION. Un prioritario
    cuenta como revelado con resultado vigente en todas sus aplicaciones."""
    definiciones = contexto(sesion).definiciones
    instrumentos = {i.id: i for i in definiciones.listar(Instrumento)}
    prioritarios = {fila.instrumento_id for fila in definiciones.listar(SalonInstrumento)
                    if fila.salon_id == cuenta.salon_id and fila.es_prioritario
                    and instrumentos[fila.instrumento_id].tipo_resultado != TipoResultado.COMPARACION}
    requeridas = {aplicacion.id for aplicacion in definiciones.listar(Aplicacion)
                  if aplicacion.instrumento_id in prioritarios
                  or (instrumentos[aplicacion.instrumento_id].tipo_resultado == TipoResultado.COMPARACION
                      and aplicacion.momento == MomentoAplicacion.ENTRADA)}
    if not requeridas:
        return True
    vigentes = set(sesion.scalars(select(ResultadoInstrumento.aplicacion_id).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
        ResultadoInstrumento.aplicacion_id.in_(requeridas))))
    return requeridas <= vigentes


def _parametro_positivo(datos, descripcion: str) -> int:
    regla = getattr(datos, 'regla_en_evaluacion', None)
    if regla is None:
        raise ValueError(f'Debe indicar la regla para evaluar {descripcion}')
    minimo = regla.parametro_evaluador
    if not isinstance(minimo, int) or isinstance(minimo, bool) or minimo < 1:
        raise ValueError(f'El evaluador de {descripcion} requiere un parámetro entero positivo')
    return minimo


@usar_contexto
def planes_listos_para_comparar(sesion: Session, cuenta: Cuenta) -> bool:
    """B11 · `t-comparar`: al menos `parametro` planes con todas sus secciones `para_comparar` en LISTA."""
    # Importación diferida: el dominio de planes usa el motor para saber qué secciones están abiertas.
    from app.services.planes.consultas import contar_listos_para_comparar
    minimo = _parametro_positivo(contexto(sesion), 'planes listos para comparar')
    return contar_listos_para_comparar(sesion, cuenta) >= minimo


@usar_contexto
def pasos_plan_a(sesion: Session, cuenta: Cuenta) -> bool:
    """B11 · `t-proyecto`: el plan A tiene al menos `parametro` pasos, en cualquier estado."""
    minimo = _parametro_positivo(contexto(sesion), 'pasos del plan A')
    pasos = sesion.scalar(select(func.count(PasoTarjeta.id)).join(
        TarjetaCarrera, TarjetaCarrera.id == PasoTarjeta.tarjeta_id).where(
        TarjetaCarrera.cuenta_id == cuenta.id, TarjetaCarrera.prioridad == 1))
    return pasos >= minimo


EVALUADORES: dict[str, Callable[[Session, Cuenta], bool]] = {
    "carreras_familias_distintas": partial(vistas_diversas, clase='CARRERA', atributo='familia'),
    "ocupaciones_high_point_distinto": partial(vistas_diversas, clase='OCUPACION', atributo='high_point'),
    "instituciones_tipos_distintos": partial(vistas_diversas, clase='INSTITUCION', atributo='tipo'),
    "vista_fuera_del_perfil": vista_fuera_del_perfil,
    "misiones_camino_sin_inicio": misiones_camino_sin_inicio,
    "instrumentos_prioritarios": instrumentos_prioritarios,
    "planes_listos_para_comparar": planes_listos_para_comparar,
    "pasos_plan_a": pasos_plan_a,
}
