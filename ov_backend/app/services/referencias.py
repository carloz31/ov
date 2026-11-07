"""Resolución de referencias por cuenta (HU-009, RNF-20): solo tipos del catálogo y solo datos de la cuenta.

ELECCION: disponible desde la primera entrega del ítem fuente, sea cual sea su clasificación; la elección no se
edita y lo que puede quedar poco desarrollado es la justificación, no la decisión.
TEXTO: según la clasificación de la última evaluación del ítem fuente; la poco desarrollada no se cita.
RESULTADO y COINCIDENCIAS: el resultado vigente (revelado) de la aplicación fuente; con perfil plano, sin opciones.
RESPUESTA_CUESTIONARIO: la etiqueta elegida en un ítem de la aplicación fuente, cuando su actividad está completada.
FAVORITOS: las carreras, ocupaciones e instituciones marcadas, de la más reciente a la más antigua.
PLANES, PLAN, PASOS_PLAN_A y OPCION_INICIAL (B11): los planes por prioridad, el plan A (carrera, relato y
motivos), los pasos del plan A y la carrera de la opción inicial.
LO_QUE_PIENSO (B13): lo que el estudiante pensaba de la familia de carreras antes de su primera entrevista publicada.
FAMILIAS_RECOMENDADAS, TESTIMONIOS y DATOS_CARRERA_PLAN_A (ajuste registros): las cinco familias del resultado de
intereses, los testimonios desbloqueados (solo su título) y la duración, el tipo y la referencia de ingresos de la
familia de la carrera del plan A. Se resuelven en vivo: lo guardado en una respuesta conserva su texto.
Un TEXTO marcado sensible no se cita (SIN_DATO) y uno ABIERTA tampoco (ABIERTA); su ELECCION sí.
"""

from sqlalchemy import select

from app.core.contexto import contexto, usar_contexto
from app.core.parametros import LONGITUD_CODIGO_INTERES
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, ActividadItem, AplicacionActividad, Bloque, Carrera, Cuenta, Entrevista, EstadoInvestigacion, FamiliaCarrera,
    EstadoProgreso, EvaluacionRespuesta, IngresoFamilia, Testimonio, TipoObjetivo, Favorito, Institucion, Investigacion, ItemRegistro, MotivoTarjeta, Ocupacion, OpcionEscala, OpcionLista, PasoTarjeta,
    ProgresoActividad, RespuestaItem, RespuestaRegistro, ResultadoInstrumento, Rol, TarjetaCarrera, TipoFavorito,
)
from app.models.enums import (
    ClasificacionRespuesta, EstadoReferencia, EstadoRespuestaRegistro, TipoReferencia,
)
from app.schemas.referencias import OpcionReferida, ReferenciaResuelta, ReferenciasConsultadas
from app.services.comun import buscar_por_codigo
from app.services.instrumentos.consultas import cargar_representaciones, representar_resultado


CODIGO_OTRA = 'OTRA'


def _leer_fuentes(sesion, cuenta, items_fuente):
    """Respuesta y clasificación vigente de cada ítem fuente, solo de esta cuenta: dos lecturas en total."""
    if not items_fuente:
        return {}, {}
    respuestas = {r.item_registro_id: r for r in sesion.scalars(select(RespuestaRegistro).join(
        ProgresoActividad, ProgresoActividad.id == RespuestaRegistro.progreso_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, RespuestaRegistro.item_registro_id.in_(items_fuente)))}
    vigentes = {}
    if respuestas:
        for respuesta_id, clasificacion in sesion.execute(select(
                EvaluacionRespuesta.respuesta_id, EvaluacionRespuesta.clasificacion).where(
                EvaluacionRespuesta.respuesta_id.in_([r.id for r in respuestas.values()])).order_by(
                EvaluacionRespuesta.numero)):
            vigentes[respuesta_id] = clasificacion
    return respuestas, vigentes


def _opciones(sesion, item, elegidas):
    """La OTRA y las opciones tomadas de una referencia guardan su texto; las de lista y las propias, su código."""
    textos = {o.codigo: o.texto for o in contexto(sesion).definiciones.opciones_por_lista.get(item.lista_id, ())}
    textos.update({o['codigo']: o['texto'] for o in item.opciones_propias or ()})
    return [OpcionReferida(codigo=e['codigo'], texto=e['texto'] if 'texto' in e else textos.get(e['codigo'], e['codigo']))
            for e in elegidas or ()]


def _leer_resultados(sesion, cuenta, aplicaciones):
    """Resultado vigente de cada aplicación fuente, solo de esta cuenta, ya representado."""
    if not aplicaciones:
        return {}
    resultados = list(sesion.scalars(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None))))
    cargar_representaciones(sesion, resultados)
    return {r.aplicacion_id: representar_resultado(sesion, r) for r in resultados}


def _leer_respuestas_cuestionario(sesion, cuenta, referencias):
    """Etiqueta elegida por (aplicación, ítem), solo en actividades COMPLETADA de esta cuenta: una lectura."""
    if not referencias:
        return {}
    filas = sesion.execute(select(AplicacionActividad.aplicacion_id, RespuestaItem.item_id, OpcionEscala.etiqueta).select_from(
        AplicacionActividad).join(
        ProgresoActividad, (ProgresoActividad.actividad_id == AplicacionActividad.actividad_id)
        & (ProgresoActividad.cuenta_id == cuenta.id) & (ProgresoActividad.estado == EstadoProgreso.COMPLETADA)).join(
        RespuestaItem, RespuestaItem.progreso_id == ProgresoActividad.id).join(
        ActividadItem, (ActividadItem.actividad_id == ProgresoActividad.actividad_id)
        & (ActividadItem.item_id == RespuestaItem.item_id)).join(
        OpcionEscala, OpcionEscala.id == RespuestaItem.opcion_id).where(
        AplicacionActividad.aplicacion_id.in_({r.aplicacion_id for r in referencias}),
        RespuestaItem.item_id.in_({r.item_instrumento_id for r in referencias})))
    return {(aplicacion_id, item_id): etiqueta for aplicacion_id, item_id, etiqueta in filas}


def _opciones_de_resultado(tipo, resultado):
    if resultado.perfil_plano:
        return []
    if tipo == TipoReferencia.COINCIDENCIAS:
        return [OpcionReferida(codigo=c.codigo or c.codigo_onet, texto=c.titulo) for c in resultado.ocupaciones or ()]
    if resultado.dimensiones_destacadas is not None:
        dimensiones = resultado.dimensiones_destacadas
    else:
        # Código de interés: las de mayor puntaje, con el orden del instrumento como desempate.
        dimensiones = [d for _, d in sorted(enumerate(resultado.dimensiones),
                                            key=lambda par: (-par[1].puntaje, par[0]))][:LONGITUD_CODIGO_INTERES]
    return [OpcionReferida(codigo=d.codigo, texto=d.nombre) for d in dimensiones]


def _leer_favoritos(sesion, cuenta):
    # Solo el catálogo: las fichas y los testimonios favoritos (ajuste mochila) no son opciones de la referencia.
    catalogo = (TipoFavorito.CARRERA, TipoFavorito.OCUPACION, TipoFavorito.INSTITUCION)
    filas = sesion.execute(select(Favorito.tipo, Favorito.id_referencia).where(
        Favorito.cuenta_id == cuenta.id, Favorito.tipo.in_(catalogo)).order_by(
        Favorito.fecha_hora.desc(), Favorito.id.desc())).all()
    por_tipo = {}
    for tipo, referencia in filas:
        por_tipo.setdefault(tipo, []).append(referencia)
    columnas = {TipoFavorito.CARRERA: (Carrera, Carrera.codigo, Carrera.nombre),
                TipoFavorito.OCUPACION: (Ocupacion, Ocupacion.codigo_onet, Ocupacion.titulo),
                TipoFavorito.INSTITUCION: (Institucion, Institucion.codigo, Institucion.nombre)}
    nombres = {}
    for tipo, ids in por_tipo.items():
        modelo, codigo, texto = columnas[tipo]
        nombres.update({(tipo, i): OpcionReferida(codigo=c, texto=t)
                        for i, c, t in sesion.execute(select(modelo.id, codigo, texto).where(modelo.id.in_(ids)))})
    return [nombres[tipo, referencia] for tipo, referencia in filas if (tipo, referencia) in nombres]


DE_PLANES = (TipoReferencia.PLANES, TipoReferencia.PLAN, TipoReferencia.PASOS_PLAN_A, TipoReferencia.OPCION_INICIAL)


def _leer_planes(sesion, cuenta, tipos):
    """Datos de las referencias de planes por tipo, solo de esta cuenta; un tipo sin dato no aparece."""
    definiciones = contexto(sesion).definiciones
    planes = sesion.execute(select(TarjetaCarrera, Carrera.codigo, Carrera.nombre).join(
        Carrera, Carrera.id == TarjetaCarrera.carrera_id).where(
        TarjetaCarrera.cuenta_id == cuenta.id, TarjetaCarrera.activa).order_by(TarjetaCarrera.prioridad)).all()

    def opcion(opcion_id, texto_otro=None, texto=None):
        if opcion_id is None:
            return OpcionReferida(codigo=CODIGO_OTRA, texto=texto_otro)
        fila = definiciones.obtener(OpcionLista, opcion_id)
        return OpcionReferida(codigo=fila.codigo, texto=texto or fila.texto)

    datos = {}
    if planes:
        datos[TipoReferencia.PLANES] = dict(opciones=[OpcionReferida(codigo=c, texto=n) for _, c, n in planes])
        plan_a, _, nombre_a = planes[0]
        if TipoReferencia.PLAN in tipos:
            motivos = sesion.scalars(select(MotivoTarjeta).where(MotivoTarjeta.tarjeta_id == plan_a.id).order_by(
                MotivoTarjeta.posicion))
            datos[TipoReferencia.PLAN] = dict(texto=nombre_a, cita=plan_a.relato,
                                              opciones=[opcion(m.opcion_id, m.texto_otro) for m in motivos])
        if TipoReferencia.PASOS_PLAN_A in tipos:
            pasos = sesion.scalars(select(PasoTarjeta).where(PasoTarjeta.tarjeta_id == plan_a.id).order_by(
                PasoTarjeta.posicion)).all()
            if pasos:
                datos[TipoReferencia.PASOS_PLAN_A] = dict(
                    opciones=[opcion(p.tipo_opcion_id, texto=p.texto) for p in pasos])
    if TipoReferencia.OPCION_INICIAL in tipos and cuenta.opcion_inicial_id is not None:
        datos[TipoReferencia.OPCION_INICIAL] = dict(texto=sesion.scalar(select(Carrera.nombre).where(
            Carrera.id == cuenta.opcion_inicial_id)))
    return datos


def _leer_lo_que_pienso(sesion, cuenta):
    """La investigación de la primera entrevista publicada: nombre de la familia y los tres textos (DIA, NECESITA,
    DUDA). La entrevista puede haberse retirado después: lo que pensaba no cambia."""
    fila = sesion.execute(select(Investigacion, FamiliaCarrera.nombre).join(
        Entrevista, Entrevista.id == Investigacion.entrevista_id).join(
        FamiliaCarrera, FamiliaCarrera.id == Investigacion.familia_id).where(
        Investigacion.cuenta_id == cuenta.id, Investigacion.estado == EstadoInvestigacion.PUBLICADA).order_by(
        Entrevista.fecha_hora, Entrevista.id).limit(1)).first()
    if fila is None:
        return None
    investigacion, titulo = fila
    return dict(texto=titulo, opciones=[
        OpcionReferida(codigo='DIA', texto=investigacion.piensa_dia),
        OpcionReferida(codigo='NECESITA', texto=investigacion.piensa_necesita),
        OpcionReferida(codigo='DUDA', texto=investigacion.piensa_duda)])


TEXTO_TIPO_CARRERA = {'UNIVERSIDAD': 'Universitaria', 'INSTITUTO': 'Técnica', 'FFAA_POLICIA': 'Pública'}


def _leer_familias_recomendadas(sesion, cuenta):
    from app.services.instrumentos.consultas import resultado_intereses
    resultado = resultado_intereses(sesion, cuenta)
    return [OpcionReferida(codigo=f.codigo, texto=f.nombre) for f in (resultado.familias or ())] if resultado else []


def _leer_testimonios(sesion, cuenta):
    # Importación diferida: el motor resuelve reglas que a su vez usan referencias en las preguntas del diario.
    from app.services.motor.reglas import objetivo_disponible
    testimonios = sorted(contexto(sesion).definiciones.listar(Testimonio), key=lambda t: t.codigo)
    return [OpcionReferida(codigo=t.codigo, texto=t.titulo) for t in testimonios
            if objetivo_disponible(sesion, cuenta, TipoObjetivo.TESTIMONIO, t.id)]


def _leer_datos_carrera(sesion, cuenta):
    """De la carrera del plan A: duración y tipo, y el promedio de ingresos de jóvenes de su familia y tipo (sin
    ubicación), que es una referencia de la familia, no el sueldo de la carrera. Un campo sin dato se omite."""
    fila = sesion.execute(select(Carrera).join(TarjetaCarrera, TarjetaCarrera.carrera_id == Carrera.id).where(
        TarjetaCarrera.cuenta_id == cuenta.id, TarjetaCarrera.activa).order_by(TarjetaCarrera.prioridad).limit(1)
    ).scalar_one_or_none()
    if fila is None:
        return None
    ingreso = sesion.scalar(select(IngresoFamilia.promedio_jovenes).where(
        IngresoFamilia.familia_id == fila.familia_id, IngresoFamilia.tipo == fila.tipo,
        IngresoFamilia.ubicacion_id.is_(None)).limit(1))
    opciones = []
    if ingreso is not None:
        opciones.append(OpcionReferida(codigo='INGRESO_FAMILIA',
                                       texto=f'S/ {ingreso:,}'.replace(',', ' ') + ' al mes: referencia de carreras de esta familia'))
    if fila.duracion:
        opciones.append(OpcionReferida(codigo='DURACION', texto=fila.duracion))
    opciones.append(OpcionReferida(codigo='TIPO', texto=TEXTO_TIPO_CARRERA[fila.tipo.value]))
    return dict(texto=fila.nombre, opciones=opciones)


EN_VIVO = (TipoReferencia.FAMILIAS_RECOMENDADAS, TipoReferencia.TESTIMONIOS, TipoReferencia.DATOS_CARRERA_PLAN_A)


def resolver(sesion, cuenta, referencias):
    """{código: ReferenciaResuelta} para `referencias` (filas del catálogo), con datos de `cuenta`."""
    definiciones = contexto(sesion).definiciones
    de_registro = [r for r in referencias if r.item_registro_id is not None]
    respuestas, vigentes = _leer_fuentes(sesion, cuenta, {r.item_registro_id for r in de_registro})
    de_cuestionario = [r for r in referencias if r.tipo == TipoReferencia.RESPUESTA_CUESTIONARIO]
    respuestas_cuestionario = _leer_respuestas_cuestionario(sesion, cuenta, de_cuestionario)
    resultados = _leer_resultados(sesion, cuenta, {r.aplicacion_id for r in referencias
                                                   if r.aplicacion_id is not None and r not in de_cuestionario})
    favoritos = (_leer_favoritos(sesion, cuenta) if any(r.tipo == TipoReferencia.FAVORITOS for r in referencias)
                 else [])
    tipos_planes = {r.tipo for r in referencias if r.tipo in DE_PLANES}
    planes = _leer_planes(sesion, cuenta, tipos_planes) if tipos_planes else {}
    lo_que_pienso = (_leer_lo_que_pienso(sesion, cuenta)
                     if any(r.tipo == TipoReferencia.LO_QUE_PIENSO for r in referencias) else None)
    tipos = {r.tipo for r in referencias}
    en_vivo = {}
    if TipoReferencia.FAMILIAS_RECOMENDADAS in tipos:
        familias = _leer_familias_recomendadas(sesion, cuenta)
        en_vivo[TipoReferencia.FAMILIAS_RECOMENDADAS] = dict(opciones=familias) if familias else None
    if TipoReferencia.TESTIMONIOS in tipos:
        testimonios = _leer_testimonios(sesion, cuenta)
        en_vivo[TipoReferencia.TESTIMONIOS] = dict(opciones=testimonios) if testimonios else None
    if TipoReferencia.DATOS_CARRERA_PLAN_A in tipos:
        en_vivo[TipoReferencia.DATOS_CARRERA_PLAN_A] = _leer_datos_carrera(sesion, cuenta)
    resueltas = {}
    for referencia in referencias:
        base = dict(codigo=referencia.codigo, tipo=referencia.tipo)
        if referencia.item_registro_id is not None:
            # ELECCION y TEXTO: la actividad del ítem fuente, en todo estado (F02: el aviso la nombra).
            fuente = definiciones.obtener(ItemRegistro, referencia.item_registro_id)
            base['actividad'] = definiciones.obtener(Actividad, fuente.actividad_id).codigo
        if referencia.tipo in DE_PLANES:
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, **planes[referencia.tipo])
                if referencia.tipo in planes else ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO))
            continue
        if referencia.tipo in EN_VIVO:
            datos = en_vivo[referencia.tipo]
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if datos is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, **datos))
            continue
        if referencia.tipo == TipoReferencia.LO_QUE_PIENSO:
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if lo_que_pienso is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, **lo_que_pienso))
            continue
        if referencia.tipo == TipoReferencia.FAVORITOS:
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, opciones=favoritos) if favoritos else
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO))
            continue
        if referencia.tipo == TipoReferencia.RESPUESTA_CUESTIONARIO:
            etiqueta = respuestas_cuestionario.get((referencia.aplicacion_id, referencia.item_instrumento_id))
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if etiqueta is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE, texto=etiqueta))
            continue
        if referencia.aplicacion_id is not None:
            resultado = resultados.get(referencia.aplicacion_id)
            resueltas[referencia.codigo] = (
                ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO) if resultado is None else
                ReferenciaResuelta(**base, estado=EstadoReferencia.DISPONIBLE,
                                   opciones=_opciones_de_resultado(referencia.tipo, resultado)))
            continue
        respuesta = respuestas.get(referencia.item_registro_id)
        if respuesta is None or respuesta.estado == EstadoRespuestaRegistro.BORRADOR:
            resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
        elif referencia.tipo == TipoReferencia.ELECCION:
            if respuesta.clasificacion_inicial is None:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
            else:
                item = definiciones.obtener(ItemRegistro, referencia.item_registro_id)
                resueltas[referencia.codigo] = ReferenciaResuelta(
                    **base, estado=EstadoReferencia.DISPONIBLE,
                    opciones=_opciones(sesion, item, respuesta.opciones_elegidas))
        else:
            clasificacion = vigentes.get(respuesta.id)
            if clasificacion is None or respuesta.sensible:
                # Sensible: no se cita en ninguna actividad (ajuste registros).
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.SIN_DATO)
            elif clasificacion == ClasificacionRespuesta.POCO_DESARROLLADA:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.POR_DESARROLLAR)
            elif clasificacion == ClasificacionRespuesta.ABIERTA:
                resueltas[referencia.codigo] = ReferenciaResuelta(**base, estado=EstadoReferencia.ABIERTA)
            else:
                resueltas[referencia.codigo] = ReferenciaResuelta(
                    **base, estado=EstadoReferencia.DISPONIBLE, texto=respuesta.texto_consolidado)
    return resueltas


def validar_cuenta_y_actividad(sesion, codigo_cuenta, codigo_actividad):
    actividad = buscar_por_codigo(sesion, Actividad, codigo_actividad)
    bloque = contexto(sesion).definiciones.obtener(Bloque, actividad.bloque_id)
    if bloque.audiencia.value != Rol.ESTUDIANTE.value:
        raise ErrorAccion("Actividad de estudiante no encontrada", estado_http=404)
    cuenta = buscar_por_codigo(sesion, Cuenta, codigo_cuenta)
    if cuenta.rol != Rol.ESTUDIANTE:
        raise ErrorAccion("Referencias no encontradas para esta cuenta", estado_http=404)
    return cuenta, actividad


@usar_contexto
def consultar_referencias(sesion, codigo_cuenta, codigo_actividad):
    cuenta, actividad = validar_cuenta_y_actividad(sesion, codigo_cuenta, codigo_actividad)
    referencias = contexto(sesion).definiciones.referencias_por_actividad.get(actividad.id, ())
    resueltas = resolver(sesion, cuenta, referencias)
    return ReferenciasConsultadas(referencias=[resueltas[r.codigo] for r in referencias])
