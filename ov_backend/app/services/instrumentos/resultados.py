"""Generación y persistencia de resultados; la transacción pertenece a la acción."""

from collections import Counter
from collections.abc import Iterator
from datetime import datetime

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    ActividadItem, Aplicacion, AplicacionActividad, Coincidencia, Cuenta, Dimension,
    EstadoProgreso, Instrumento, ItemInstrumento, Ocupacion, OpcionEscala, ProgresoActividad,
    PuntajeOcupacion, RespuestaItem, ResultadoDimension, ResultadoInstrumento, TipoResultado,
)
from app.services.instrumentos.calculo import (
    ItemParaCalculo, PerfilOcupacion, calcular_coincidencias, calcular_dimension,
)


def perfiles_de_ocupaciones(sesion: Session, dimensiones: dict[str, int]) -> Iterator[PerfilOcupacion]:
    """Lectura diferida: un perfil plano no necesita consultar el catálogo."""
    clave = tuple(dimensiones.items())
    perfiles = sesion.info.get('perfiles_ocupaciones_calculo', {})
    if clave in perfiles:
        yield from perfiles[clave]
        return
    filas = sesion.execute(select(Ocupacion.id, Ocupacion.codigo_onet, Ocupacion.titulo,
                                   PuntajeOcupacion.dimension_id, PuntajeOcupacion.valor).outerjoin(
        PuntajeOcupacion, (PuntajeOcupacion.ocupacion_id == Ocupacion.id)
        & PuntajeOcupacion.dimension_id.in_(dimensiones.values()),
    ).order_by(Ocupacion.codigo_onet)).all()
    if not filas:
        raise ValueError("El catálogo de ocupaciones está vacío")
    ocupaciones, puntajes = {}, {}
    for identificador, codigo, titulo, dimension_id, valor in filas:
        ocupaciones[codigo] = (identificador, titulo)
        puntajes[identificador, dimension_id] = valor
    sesion.info['ids_ocupaciones_calculo'] = {codigo: datos[0] for codigo, datos in ocupaciones.items()}
    preparados = []
    for codigo, (identificador, titulo) in ocupaciones.items():
        try:
            vector = tuple(puntajes[identificador, dimension_id] for dimension_id in dimensiones.values())
        except KeyError as error:
            raise ValueError(f"Faltan puntajes RIASEC en la ocupación {codigo}") from error
        preparados.append(PerfilOcupacion(codigo, titulo, vector))
    perfiles[clave] = tuple(preparados)
    yield from preparados


def cargar_respuestas_calculo(sesion, cuenta, ids_aplicaciones):
    return sesion.execute(select(AplicacionActividad.aplicacion_id, ItemInstrumento, OpcionEscala).select_from(AplicacionActividad).join(
        ActividadItem, ActividadItem.actividad_id == AplicacionActividad.actividad_id,
    ).join(ItemInstrumento, ItemInstrumento.id == ActividadItem.item_id).join(
        ProgresoActividad, (ProgresoActividad.actividad_id == AplicacionActividad.actividad_id)
        & (ProgresoActividad.cuenta_id == cuenta.id) & (ProgresoActividad.estado == EstadoProgreso.COMPLETADA),
    ).join(RespuestaItem, (RespuestaItem.progreso_id == ProgresoActividad.id)
           & (RespuestaItem.item_id == ItemInstrumento.id)).join(
        OpcionEscala, OpcionEscala.id == RespuestaItem.opcion_id,
    ).where(AplicacionActividad.aplicacion_id.in_(ids_aplicaciones)).order_by(ItemInstrumento.numero)).all()


def calcular_resultado(sesion: Session, cuenta: Cuenta, aplicacion: Aplicacion, fecha: datetime):
    definiciones = contexto(sesion).definiciones
    instrumento = definiciones.obtener(Instrumento, aplicacion.instrumento_id)
    dimensiones = sorted((dimension for dimension in definiciones.listar(Dimension)
                          if dimension.instrumento_id == instrumento.id), key=lambda dimension: (dimension.orden, dimension.codigo))
    esperados = {item.id for item in definiciones.listar(ItemInstrumento) if item.instrumento_id == instrumento.id}
    filas = [(item, opcion) for _, item, opcion in cargar_respuestas_calculo(sesion, cuenta, [aplicacion.id])]
    if not esperados or Counter(item.id for item, _ in filas) != Counter({item: 1 for item in esperados}):
        raise ValueError(f"Las respuestas de {aplicacion.codigo} no cubren exactamente los ítems del instrumento")
    limites = {}
    for opcion in definiciones.listar(OpcionEscala):
        minimo, maximo = limites.get(opcion.escala_id, (opcion.puntaje, opcion.puntaje))
        limites[opcion.escala_id] = (min(minimo, opcion.puntaje), max(maximo, opcion.puntaje))
    items_por_dimension = {dimension.id: [] for dimension in dimensiones}
    for item, opcion in filas:
        if item.dimension_id not in items_por_dimension or opcion.escala_id != item.escala_id:
            raise ValueError(f"Dimensión o escala inconsistente en {item.codigo}")
        minimo, maximo = limites[item.escala_id]
        items_por_dimension[item.dimension_id].append(ItemParaCalculo(opcion.puntaje, minimo, maximo, item.inverso))
    calculadas = {dimension.id: calcular_dimension(dimension.codigo, items_por_dimension[dimension.id])
                 for dimension in dimensiones}
    coincidencias = ()
    perfil_plano = False
    if instrumento.tipo_resultado == TipoResultado.COINCIDENCIAS:
        ids_dimensiones = {dimension.codigo: dimension.id for dimension in dimensiones}
        vector = tuple(calculadas[dimension.id].puntaje for dimension in dimensiones)
        calculo = calcular_coincidencias(vector, perfiles_de_ocupaciones(sesion, ids_dimensiones), len(dimensiones))
        perfil_plano = calculo.perfil_plano
        coincidencias = calculo.coincidencias
    return dict(cuenta_id=cuenta.id, aplicacion_id=aplicacion.id, calculado_en=fecha,
                anulado_en=None, perfil_plano=perfil_plano), calculadas, coincidencias


def guardar_resultados(sesion, calculos):
    if not calculos:
        return
    filas = [cabecera for cabecera, _, _ in calculos]
    ids_resultados = dict(sesion.execute(insert(ResultadoInstrumento.__table__).values(filas).returning(
        ResultadoInstrumento.aplicacion_id, ResultadoInstrumento.id,
    )).all())
    dimensiones, coincidencias = [], []
    ocupaciones = sesion.info.get('ids_ocupaciones_calculo', {})
    for cabecera, calculadas, afines in calculos:
        resultado_id = ids_resultados[cabecera['aplicacion_id']]
        dimensiones.extend(dict(resultado_id=resultado_id, dimension_id=dimension_id, puntaje=dimension.puntaje,
                                puntaje_maximo=dimension.puntaje_maximo, porcentaje=dimension.porcentaje)
                           for dimension_id, dimension in calculadas.items())
        coincidencias.extend(dict(resultado_id=resultado_id, ocupacion_id=ocupaciones[afin.codigo_onet],
                                  posicion=afin.posicion, correlacion=afin.correlacion, ajuste=afin.ajuste)
                             for afin in afines)
    sesion.execute(insert(ResultadoDimension.__table__), dimensiones)
    if coincidencias:
        sesion.execute(insert(Coincidencia.__table__), coincidencias)
    sesion.flush()


@usar_contexto
def generar_resultado(sesion: Session, cuenta: Cuenta, aplicacion: Aplicacion, fecha: datetime) -> bool:
    """Calcula y guarda el resultado de la aplicación (al revelar); devuelve si es perfil plano."""
    try:
        calculo = calcular_resultado(sesion, cuenta, aplicacion, fecha)
        guardar_resultados(sesion, [calculo])
    finally:
        sesion.info.pop('perfiles_ocupaciones_calculo', None)
    return calculo[0]['perfil_plano']
