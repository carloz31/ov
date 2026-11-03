"""Consultas de instrumentos: derivan vistas sin modificar respuestas ni resultados."""

from collections import Counter
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.core.definiciones import MODELOS_FIJOS
from app.exceptions import ConsultaPendiente
from app.models import (
    Actividad, ActividadItem, Aplicacion, AplicacionActividad, Audiencia, Bloque, Carrera,
    Coincidencia, Cuenta, Dimension, EscalaRespuesta, EstadoProgreso,
    FamiliaCarrera, Instrumento, ItemInstrumento, MomentoAplicacion, Ocupacion, OcupacionFamilia, OpcionEscala,
    ProgresoActividad, RespuestaItem, ResultadoDimension, ResultadoInstrumento, Rol, Tematica, ActividadTematica,
    TipoInstitucion, TipoResultado,
)
from app.schemas.instrumentos import (
    ActividadPublica, AplicacionPublica, AreaOcupaciones, AvanceAplicacion, AvanceInstrumento,
    CodigoInteresPublico, ComparacionAutopercepcion, ComparacionDimension, ComparacionItem,
    ConteoAvance, ConteoItems, DimensionPublica, DimensionResultado, EscalaPublica,
    FamiliaRecomendadaPublica, InstrumentoPublico, ItemPublico, OcupacionAfinPublica, OcupacionDeFamilia,
    OpcionPublica, RespuestaPublica, RespuestasActividad, ResultadoHistorico, ResultadoPublico,
)
from app.schemas.catalogo import FamiliaPublica
from app.services.instrumentos.calculo import (
    DimensionCalculada, calcular_codigo_interes, calcular_dimensiones_destacadas, calcular_zona,
    clasificar_preparacion, puntaje_visual, recomendar_familias, seleccionar_afines,
)


AudienciaTextos = Literal['estudiante', 'apoderado', 'orientadora']
SIN_FAMILIA = 'Sin familia'


def items_por_dimension(definiciones, instrumento: Instrumento) -> Counter:
    return Counter(item.dimension_id for item in definiciones.listar(ItemInstrumento)
                   if item.instrumento_id == instrumento.id)


def minimos_por_dimension(definiciones, instrumento: Instrumento) -> Counter:
    """Suma de los puntajes mínimos de las escalas de los ítems de cada dimensión: el 0 del puntaje visual."""
    minimos = {}
    for opcion in definiciones.listar(OpcionEscala):
        minimos[opcion.escala_id] = min(opcion.puntaje, minimos.get(opcion.escala_id, opcion.puntaje))
    resultado = Counter()
    for item in definiciones.listar(ItemInstrumento):
        if item.instrumento_id == instrumento.id:
            resultado[item.dimension_id] += minimos[item.escala_id]
    return resultado


def textos_dimension(dimension) -> dict:
    return dict(ejemplos=dimension.ejemplos, fortalezas=list(dimension.fortalezas or []),
                desarrollo=list(dimension.desarrollo or []))


def textos_instrumento(instrumento: Instrumento, audiencia: AudienciaTextos = 'estudiante',
                       nombre: str | None = None) -> dict:
    """`mensaje`, `lectura` y `guia_abierta` de la audiencia; `{nombre}` es el nombre de pila del estudiante."""
    pila = (nombre or '').split(' ')[0]
    return dict(mensaje=getattr(instrumento, f'mensaje_{audiencia}').replace('{nombre}', pila),
                lectura=getattr(instrumento, f'lectura_{audiencia}').replace('{nombre}', pila),
                guia_abierta=instrumento.guia_abierta)


def codigo_tematica(definiciones, dimension) -> str | None:
    tematica = definiciones.obtener(Tematica, dimension.tematica_id) if dimension.tematica_id is not None else None
    return None if tematica is None else tematica.codigo


@usar_contexto
def entidad_por_codigo(sesion: Session, modelo, codigo: str):
    entidad = (contexto(sesion).definiciones.por_codigo(modelo, codigo) if modelo in MODELOS_FIJOS
               else sesion.scalar(select(modelo).where(modelo.codigo == codigo)))
    if entidad is None:
        raise LookupError("Referencia no encontrada")
    return entidad


@usar_contexto
def cuenta_estudiante(sesion: Session, codigo: str) -> Cuenta:
    cuenta = entidad_por_codigo(sesion, Cuenta, codigo)
    if cuenta.rol != Rol.ESTUDIANTE:
        raise LookupError("Instrumentos no encontrados para esta cuenta")
    return cuenta


@usar_contexto
def actividad_estudiante(sesion: Session, codigo: str) -> Actividad:
    actividad = entidad_por_codigo(sesion, Actividad, codigo)
    if contexto(sesion).definiciones.obtener(Bloque, actividad.bloque_id).audiencia != Audiencia.ESTUDIANTE:
        raise LookupError("Actividad no encontrada para estudiantes")
    return actividad


@usar_contexto
def aplicaciones_de_instrumento(sesion: Session, instrumento: Instrumento) -> list[Aplicacion]:
    return sorted((aplicacion for aplicacion in contexto(sesion).definiciones.listar(Aplicacion)
                   if aplicacion.instrumento_id == instrumento.id), key=lambda aplicacion: aplicacion.codigo)


@usar_contexto
def actividades_de_aplicacion(sesion: Session, aplicacion: Aplicacion) -> list[Actividad]:
    definiciones = contexto(sesion).definiciones
    identificadores = {fila.actividad_id for fila in definiciones.listar(AplicacionActividad) if fila.aplicacion_id == aplicacion.id}
    return sorted((definiciones.obtener(Actividad, identificador) for identificador in identificadores),
                  key=lambda actividad: (actividad.orden, actividad.codigo))


def opcion_publica(opcion: OpcionEscala) -> OpcionPublica:
    return OpcionPublica(orden=opcion.orden, etiqueta=opcion.etiqueta, puntaje=opcion.puntaje)


@usar_contexto
def escala_publica(sesion: Session, escala: EscalaRespuesta) -> EscalaPublica:
    return EscalaPublica(codigo=escala.codigo, nombre=escala.nombre, opciones=[
        opcion_publica(opcion) for opcion in sorted((opcion for opcion in contexto(sesion).definiciones.listar(OpcionEscala)
                                      if opcion.escala_id == escala.id), key=lambda opcion: opcion.orden)
    ])


@usar_contexto
def catalogo_instrumentos(sesion: Session) -> list[InstrumentoPublico]:
    catalogo = []
    for instrumento in sorted(contexto(sesion).definiciones.listar(Instrumento), key=lambda instrumento: instrumento.codigo):
        dimensiones = sorted((dimension for dimension in contexto(sesion).definiciones.listar(Dimension)
                              if dimension.instrumento_id == instrumento.id), key=lambda dimension: (dimension.orden, dimension.codigo))
        escalas = sorted((escala for escala in contexto(sesion).definiciones.listar(EscalaRespuesta)
                          if escala.id in {item.escala_id for item in contexto(sesion).definiciones.listar(ItemInstrumento)
                                           if item.instrumento_id == instrumento.id}), key=lambda escala: escala.codigo)
        catalogo.append(InstrumentoPublico(
            codigo=instrumento.codigo, nombre=instrumento.nombre, descripcion=instrumento.descripcion,
            **textos_instrumento(instrumento), tipo_resultado=instrumento.tipo_resultado,
            dimensiones=[DimensionPublica(codigo=d.codigo, nombre=d.nombre, descripcion=d.descripcion,
                                         **textos_dimension(d), orden=d.orden) for d in dimensiones],
            escalas=[escala_publica(sesion, escala) for escala in escalas],
            aplicaciones=[AplicacionPublica(codigo=a.codigo, nombre=a.nombre, momento=a.momento, actividades=[
                ActividadPublica(codigo=t.codigo, titulo=t.titulo, orden=t.orden)
                for t in actividades_de_aplicacion(sesion, a)
            ]) for a in aplicaciones_de_instrumento(sesion, instrumento)],
        ))
    return catalogo


@usar_contexto
def items_presentados(sesion: Session, actividad: Actividad) -> list[ItemPublico]:
    definiciones = contexto(sesion).definiciones
    presentaciones = sorted((fila for fila in definiciones.listar(ActividadItem) if fila.actividad_id == actividad.id),
                            key=lambda fila: (fila.orden, definiciones.obtener(ItemInstrumento, fila.item_id).numero))
    filas = [(definiciones.obtener(ItemInstrumento, fila.item_id), fila.orden) for fila in presentaciones]
    return [ItemPublico(
        codigo=item.codigo, instrumento=definiciones.obtener(Instrumento, item.instrumento_id).codigo,
        numero=item.numero, orden=orden, enunciado=item.enunciado,
        dimension=None if item.dimension_id is None else definiciones.obtener(Dimension, item.dimension_id).codigo,
        inverso=item.inverso, escala=escala_publica(sesion, definiciones.obtener(EscalaRespuesta, item.escala_id)),
    ) for item, orden in filas]


@usar_contexto
def respuestas_actuales(sesion: Session, cuenta: Cuenta, actividad: Actividad) -> RespuestasActividad:
    filas = sesion.execute(select(RespuestaItem, ItemInstrumento.codigo, OpcionEscala).select_from(
        RespuestaItem,
    ).join(ProgresoActividad).join(ItemInstrumento, ItemInstrumento.id == RespuestaItem.item_id).join(
        ActividadItem, (ActividadItem.item_id == ItemInstrumento.id) & (ActividadItem.actividad_id == actividad.id),
    ).join(OpcionEscala, OpcionEscala.id == RespuestaItem.opcion_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, ProgresoActividad.actividad_id == actividad.id,
    ).order_by(ActividadItem.orden, ItemInstrumento.numero))
    return RespuestasActividad(cuenta=cuenta.codigo, actividad=actividad.codigo, respuestas=[
        RespuestaPublica(item=codigo, opcion=opcion_publica(opcion), creada_en=respuesta.creada_en,
                        actualizada_en=respuesta.actualizada_en) for respuesta, codigo, opcion in filas
    ])


@usar_contexto
def avance_aplicacion(sesion: Session, cuenta: Cuenta, aplicacion: Aplicacion) -> AvanceAplicacion:
    actividades = actividades_de_aplicacion(sesion, aplicacion)
    datos = contexto(sesion)
    if not hasattr(datos, 'avances'):
        datos.avances = {}
    if cuenta.id not in datos.avances:
        respuestas = set(sesion.execute(select(ProgresoActividad.actividad_id, RespuestaItem.item_id).join(
            RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id,
        ).where(ProgresoActividad.cuenta_id == cuenta.id)).all())
        vigentes = set(sesion.scalars(select(ResultadoInstrumento.aplicacion_id).where(
            ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
        )))
        datos.avances[cuenta.id] = respuestas, vigentes
    respuestas, vigentes = datos.avances[cuenta.id]
    ids_actividades = {actividad.id for actividad in actividades}
    progresos = {identificador: progreso for identificador, progreso in datos.progresos_de(cuenta.id).items()
                 if identificador in ids_actividades}
    faltantes = [actividad.codigo for actividad in actividades if actividad.id not in progresos
                 or progresos[actividad.id].estado != EstadoProgreso.COMPLETADA]
    total_items = [fila for fila in datos.definiciones.listar(ActividadItem) if fila.actividad_id in ids_actividades
                   and datos.definiciones.obtener(ItemInstrumento, fila.item_id).instrumento_id == aplicacion.instrumento_id]
    respondidos = sum((fila.actividad_id, fila.item_id) in respuestas for fila in total_items)
    vigente = aplicacion.id in vigentes
    estado = "COMPLETADO" if not faltantes else "EN_PROGRESO" if progresos else "NO_INICIADO"
    return AvanceAplicacion(aplicacion=aplicacion.codigo, estado=estado,
        actividades=ConteoAvance(completadas=len(actividades) - len(faltantes), total=len(actividades), faltantes=faltantes),
        items=ConteoItems(respondidos=respondidos, total=len(total_items)), hay_resultado_vigente=vigente)


@usar_contexto
def avance_instrumentos(sesion: Session, cuenta: Cuenta) -> list[AvanceInstrumento]:
    return [AvanceInstrumento(instrumento=i.codigo, aplicaciones=[avance_aplicacion(sesion, cuenta, a)
        for a in aplicaciones_de_instrumento(sesion, i)])
        for i in sorted(contexto(sesion).definiciones.listar(Instrumento), key=lambda instrumento: instrumento.codigo)]


@usar_contexto
def seleccionar_aplicacion(sesion: Session, instrumento: Instrumento, codigo: str | None) -> Aplicacion:
    aplicaciones = aplicaciones_de_instrumento(sesion, instrumento)
    if codigo is None:
        if len(aplicaciones) != 1:
            raise ValueError("Debe indicar la aplicación de este instrumento")
        return aplicaciones[0]
    for aplicacion in aplicaciones:
        if aplicacion.codigo == codigo:
            return aplicacion
    raise LookupError("Aplicación no encontrada para este instrumento")


def cargar_representaciones(sesion, resultados):
    """Dimensiones, coincidencias y familia principal de cada ocupación de los resultados, en lote: tres lecturas
    para cualquier número de resultados."""
    datos = contexto(sesion)
    if not hasattr(datos, 'representaciones'):
        datos.representaciones = {}
    faltantes = {resultado.id for resultado in resultados} - datos.representaciones.keys()
    if not faltantes:
        return
    por_dimension = {identificador: [] for identificador in faltantes}
    por_coincidencia = {identificador: [] for identificador in faltantes}
    for dimension, resultado in sesion.execute(select(Dimension, ResultadoDimension).join(ResultadoDimension).where(
        ResultadoDimension.resultado_id.in_(faltantes),
    ).order_by(Dimension.orden, Dimension.codigo)):
        por_dimension[resultado.resultado_id].append((dimension, resultado))
    riasec = {resultado.id for resultado in resultados if resultado.id in faltantes
              and datos.definiciones.obtener(Instrumento, datos.definiciones.obtener(Aplicacion, resultado.aplicacion_id).instrumento_id).tipo_resultado == TipoResultado.COINCIDENCIAS}
    principales = {}
    if riasec:
        for coincidencia, ocupacion in sesion.execute(select(Coincidencia, Ocupacion).join(Ocupacion).where(
            Coincidencia.resultado_id.in_(riasec),
        ).order_by(Coincidencia.posicion)):
            por_coincidencia[coincidencia.resultado_id].append((coincidencia, ocupacion))
        principales = dict(sesion.execute(select(OcupacionFamilia.ocupacion_id, OcupacionFamilia.familia_id).where(
            OcupacionFamilia.es_principal, OcupacionFamilia.ocupacion_id.in_(
                select(Coincidencia.ocupacion_id).where(Coincidencia.resultado_id.in_(riasec))))).all())
    datos.representaciones.update({identificador: (por_dimension[identificador], por_coincidencia[identificador],
                                                   principales) for identificador in faltantes})


def ocupaciones_principales_por_familia(sesion) -> Counter:
    """Ocupaciones del catálogo cuya familia principal es cada familia; una lectura por petición."""
    datos = contexto(sesion)
    if not hasattr(datos, 'principales_por_familia'):
        datos.principales_por_familia = Counter(dict(sesion.execute(
            select(OcupacionFamilia.familia_id, func.count()).join(Ocupacion).where(
                OcupacionFamilia.es_principal, Ocupacion.en_catalogo).group_by(OcupacionFamilia.familia_id)).all()))
    return datos.principales_por_familia


def carreras_por_familia(definiciones) -> dict[int, Counter]:
    """Carreras de cada familia por tipo, desde la caché de definiciones."""
    conteo: dict[int, Counter] = {}
    for carrera in definiciones.listar(Carrera):
        conteo.setdefault(carrera.familia_id, Counter())[carrera.tipo] += 1
    return conteo


def familia_publica(familia: FamiliaCarrera) -> FamiliaPublica:
    return FamiliaPublica(codigo=familia.codigo, nombre=familia.nombre, area_codigo=familia.area_codigo,
                          area_nombre=familia.area_nombre)


def ocupaciones_y_familias(sesion, afines_guardadas, principales) -> dict:
    """Lo que el resultado de intereses deriva al leer (ajuste resultados-intereses): las ocupaciones afines que
    se muestran, agrupadas también por área, y las familias recomendadas."""
    definiciones = contexto(sesion).definiciones
    por_codigo = {ocupacion.codigo: ocupacion for _, ocupacion in afines_guardadas}
    seleccion = seleccionar_afines([(o.codigo, c.correlacion) for c, o in afines_guardadas])
    familia_de = {codigo: definiciones.obtener(FamiliaCarrera, principales[o.id])
                  for codigo, o in por_codigo.items() if o.id in principales}
    ocupaciones = []
    for posicion, afin in enumerate(seleccion.ocupaciones, start=1):
        ocupacion, familia = por_codigo[afin.codigo], familia_de.get(afin.codigo)
        ocupaciones.append(OcupacionAfinPublica(
            posicion=posicion, codigo=ocupacion.codigo, codigo_onet=ocupacion.codigo_onet, titulo=ocupacion.titulo,
            resumen=ocupacion.resumen, riasec=list(ocupacion.codigo_riasec or ''), parecido=afin.parecido,
            banda=afin.banda, preparacion=clasificar_preparacion(ocupacion.job_zone),
            familia_principal=None if familia is None else familia_publica(familia)))
    areas: dict[str | None, AreaOcupaciones] = {}
    for ocupacion in ocupaciones:
        familia = ocupacion.familia_principal
        clave = None if familia is None else familia.area_codigo
        if clave not in areas:
            areas[clave] = AreaOcupaciones(area_codigo=clave, area_nombre=SIN_FAMILIA if familia is None
                                           else familia.area_nombre, ocupaciones=[])
        areas[clave].ocupaciones.append(ocupacion.codigo)
    por_area = [a for c, a in areas.items() if c is not None] + ([areas[None]] if None in areas else [])
    recomendadas = recomendar_familias(seleccion.ocupaciones, {c: f.codigo for c, f in familia_de.items()})
    carreras = carreras_por_familia(definiciones)
    # Los totales por familia se leen solo si hay familias que mostrar.
    totales = ocupaciones_principales_por_familia(sesion) if recomendadas else Counter()
    familias_por_codigo = {f.codigo: f for f in familia_de.values()}
    titulos = {o.codigo: o.titulo for o in ocupaciones}
    familias = []
    for posicion, recomendada in enumerate(recomendadas, start=1):
        familia = familias_por_codigo[recomendada.codigo]
        tipos = carreras.get(familia.id, Counter())
        familias.append(FamiliaRecomendadaPublica(
            posicion=posicion, codigo=familia.codigo, nombre=familia.nombre, area_codigo=familia.area_codigo,
            area_nombre=familia.area_nombre, descripcion=familia.descripcion,
            tipos=[t for t in TipoInstitucion if tipos[t]], total_carreras=sum(tipos.values()),
            total_ocupaciones=totales[familia.id],
            ocupaciones=[OcupacionDeFamilia(codigo=o.codigo, titulo=titulos[o.codigo], parecido=o.parecido)
                         for o in recomendada.ocupaciones],
            unica_ocupacion=recomendada.unica_ocupacion))
    return dict(perfil_poco_marcado=seleccion.poco_marcado, ocupaciones=ocupaciones, por_area=por_area,
                familias=familias)


@usar_contexto
def representar_resultado(sesion: Session, resultado: ResultadoInstrumento, historico: bool = False,
                          audiencia: AudienciaTextos = 'estudiante', nombre: str | None = None) -> ResultadoPublico:
    """El resultado guardado, con los textos de la `audiencia` (`nombre`: el del estudiante, para el apoderado)."""
    definiciones = contexto(sesion).definiciones
    aplicacion = definiciones.obtener(Aplicacion, resultado.aplicacion_id)
    instrumento = definiciones.obtener(Instrumento, aplicacion.instrumento_id)
    cargar_representaciones(sesion, [resultado])
    filas, afines, principales = contexto(sesion).representaciones[resultado.id]
    if instrumento.tipo_resultado == TipoResultado.COMPARACION:
        # B07: el estudiante recibe la zona en palabras, nunca los números.
        cantidades = items_por_dimension(definiciones, instrumento)
        dimensiones = [DimensionResultado(codigo=d.codigo, nombre=d.nombre, descripcion=d.descripcion,
            **textos_dimension(d), puntaje=None, puntaje_maximo=None, puntaje_visual=None,
            zona=calcular_zona(r.puntaje, cantidades[d.id]), tematica=codigo_tematica(definiciones, d)) for d, r in filas]
    else:
        minimos = minimos_por_dimension(definiciones, instrumento)
        dimensiones = [DimensionResultado(codigo=d.codigo, nombre=d.nombre, descripcion=d.descripcion,
            **textos_dimension(d), puntaje=r.puntaje, puntaje_maximo=r.puntaje_maximo,
            puntaje_visual=puntaje_visual(r.puntaje, minimos[d.id], r.puntaje_maximo)) for d, r in filas]
    datos = dict(instrumento=instrumento.codigo, aplicacion=aplicacion.codigo, calculado_en=resultado.calculado_en,
        perfil_plano=resultado.perfil_plano, **textos_instrumento(instrumento, audiencia, nombre),
        dimensiones=dimensiones)
    if instrumento.tipo_resultado == TipoResultado.DESTACADAS:
        destacadas = calcular_dimensiones_destacadas([
            DimensionCalculada(d.codigo, r.puntaje, r.puntaje_maximo) for d, r in filas
        ])
        datos["dimensiones_destacadas"] = [d for d in datos["dimensiones"] if d.codigo in destacadas]
    if instrumento.tipo_resultado == TipoResultado.COINCIDENCIAS:
        codigo = calcular_codigo_interes([r.puntaje for d, r in filas], [d.codigo for d, r in filas])
        datos["codigo_interes"] = CodigoInteresPublico(codigo=codigo.codigo, hay_empate=codigo.hay_empate)
        if not resultado.perfil_plano:
            datos.update(ocupaciones_y_familias(sesion, afines, principales))
    if historico:
        return ResultadoHistorico(**datos, anulado_en=resultado.anulado_en)
    return ResultadoPublico(**datos)


@usar_contexto
def resultado_vigente(sesion: Session, cuenta: Cuenta, instrumento: Instrumento, codigo: str | None) -> ResultadoPublico:
    aplicacion = seleccionar_aplicacion(sesion, instrumento, codigo)
    resultado = sesion.scalar(select(ResultadoInstrumento).where(ResultadoInstrumento.cuenta_id == cuenta.id,
        ResultadoInstrumento.aplicacion_id == aplicacion.id, ResultadoInstrumento.anulado_en.is_(None)))
    if resultado is None:
        raise ConsultaPendiente("No hay resultado vigente", avance_aplicacion(sesion, cuenta, aplicacion))
    return representar_resultado(sesion, resultado)


@usar_contexto
def historial_resultados(sesion: Session, cuenta: Cuenta, instrumento: Instrumento) -> list[ResultadoHistorico]:
    resultados = list(sesion.scalars(select(ResultadoInstrumento).join(Aplicacion).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, Aplicacion.instrumento_id == instrumento.id,
    ).order_by(ResultadoInstrumento.calculado_en.desc(), ResultadoInstrumento.id.desc())))
    cargar_representaciones(sesion, resultados)
    return [representar_resultado(sesion, resultado, historico=True) for resultado in resultados]


@usar_contexto
def comparacion_autopercepcion(sesion: Session, cuenta: Cuenta, instrumento: Instrumento) -> ComparacionAutopercepcion:
    """HU-094: partida y llegada dimensión por dimensión, en palabras; exige las dos reveladas."""
    if instrumento.tipo_resultado != TipoResultado.COMPARACION:
        raise LookupError("Este instrumento no admite comparación")
    aplicaciones = aplicaciones_de_instrumento(sesion, instrumento)
    entradas = [aplicacion for aplicacion in aplicaciones if aplicacion.momento == MomentoAplicacion.ENTRADA]
    salidas = [aplicacion for aplicacion in aplicaciones if aplicacion.momento == MomentoAplicacion.SALIDA]
    if len(entradas) != 1 or len(salidas) != 1:
        raise ValueError("La comparación requiere una aplicación de entrada y una de salida")
    entrada, salida = entradas[0], salidas[0]
    avances = [avance_aplicacion(sesion, cuenta, a) for a in (entrada, salida)]
    if not all(avance.hay_resultado_vigente for avance in avances):
        raise ConsultaPendiente("Revela tu punto de partida y tu punto de llegada para compararlos", avances)
    definiciones = contexto(sesion).definiciones
    puntajes = {(aplicacion_id, dimension_id): puntaje for aplicacion_id, dimension_id, puntaje in sesion.execute(
        select(ResultadoInstrumento.aplicacion_id, ResultadoDimension.dimension_id, ResultadoDimension.puntaje).join(
            ResultadoDimension, ResultadoDimension.resultado_id == ResultadoInstrumento.id,
        ).where(ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.anulado_en.is_(None),
                ResultadoInstrumento.aplicacion_id.in_((entrada.id, salida.id))))}
    actividades = [{actividad.id for actividad in actividades_de_aplicacion(sesion, aplicacion)} for aplicacion in (entrada, salida)]
    respuestas_por_actividad = sesion.execute(select(ProgresoActividad.actividad_id, ItemInstrumento.codigo, OpcionEscala.etiqueta).select_from(
        RespuestaItem,
    ).join(ProgresoActividad).join(ItemInstrumento, ItemInstrumento.id == RespuestaItem.item_id).join(
        ActividadItem, (ActividadItem.item_id == ItemInstrumento.id) & (ActividadItem.actividad_id == ProgresoActividad.actividad_id),
    ).join(OpcionEscala, OpcionEscala.id == RespuestaItem.opcion_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, ProgresoActividad.actividad_id.in_(set.union(*actividades)),
    )).all()
    partida, llegada = ({codigo: etiqueta for actividad_id, codigo, etiqueta in respuestas_por_actividad if actividad_id in ids}
                        for ids in actividades)
    completadas = {identificador for identificador, progreso in contexto(sesion).progresos_de(cuenta.id).items()
                   if progreso.estado == EstadoProgreso.COMPLETADA}
    por_tematica = Counter(fila.tematica_id for fila in definiciones.listar(ActividadTematica)
                           if fila.actividad_id in completadas)
    cantidades = items_por_dimension(definiciones, instrumento)
    items = sorted((item for item in definiciones.listar(ItemInstrumento) if item.instrumento_id == instrumento.id),
                   key=lambda item: item.numero)
    dimensiones = sorted((d for d in definiciones.listar(Dimension) if d.instrumento_id == instrumento.id),
                         key=lambda d: (d.orden, d.codigo))
    textos = textos_instrumento(instrumento)
    return ComparacionAutopercepcion(instrumento=instrumento.codigo, lectura=textos['lectura'],
        mensaje=textos['mensaje'], partida=entrada.codigo, llegada=salida.codigo,
        dimensiones=[ComparacionDimension(codigo=d.codigo, nombre=d.nombre, descripcion=d.descripcion,
            tematica=codigo_tematica(definiciones, d),
            zona_partida=calcular_zona(puntajes[entrada.id, d.id], cantidades[d.id]),
            zona_llegada=calcular_zona(puntajes[salida.id, d.id], cantidades[d.id]),
            actividades_completadas=por_tematica[d.tematica_id] if d.tematica_id is not None else 0,
            items=[ComparacionItem(item=i.codigo, enunciado=i.enunciado, partida=partida[i.codigo],
                                   llegada=llegada[i.codigo], cambio=partida[i.codigo] != llegada[i.codigo])
                   for i in items if i.dimension_id == d.id])
            for d in dimensiones])


@usar_contexto
def resultado_intereses(sesion: Session, cuenta: Cuenta) -> ResultadoPublico | None:
    """El resultado vigente de intereses (COINCIDENCIAS) del estudiante, si lo tiene y no es perfil plano; el
    catálogo lo usa para marcar afinidades y familias recomendadas."""
    if cuenta.rol != Rol.ESTUDIANTE:
        return None
    definiciones = contexto(sesion).definiciones
    instrumentos = {i.id for i in definiciones.listar(Instrumento) if i.tipo_resultado == TipoResultado.COINCIDENCIAS}
    aplicaciones = [a.id for a in definiciones.listar(Aplicacion) if a.instrumento_id in instrumentos]
    resultado = sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None), ResultadoInstrumento.perfil_plano.is_(False),
    ).order_by(ResultadoInstrumento.calculado_en.desc()).limit(1))
    return None if resultado is None else representar_resultado(sesion, resultado)
