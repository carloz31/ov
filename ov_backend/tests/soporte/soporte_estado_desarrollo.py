"""Filas sintéticas para comprobar el reinicio de las tablas de estado; DATO DE PRUEBA."""

from datetime import datetime
from sqlalchemy import select
from app import models as modelos
from app.models import Base


def llenar_estado(aplicacion):
    # DATO DE PRUEBA: una fila válida en cada tabla de estado, con sus dependencias.
    fecha = datetime(2026, 10, 8, 10)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        cuenta = sesion.scalar(select(modelos.Cuenta).where(modelos.Cuenta.codigo == 'est-ana'))
        actividad = sesion.scalar(select(modelos.Actividad).where(modelos.Actividad.codigo == 't-inicio'))
        vinculo = sesion.scalar(select(modelos.VinculoFamiliar))
        conversacion = modelos.Conversacion(codigo='conv-prueba', orden=99, titulo='DATO DE PRUEBA',
                                            pregunta_estudiante='DATO DE PRUEBA', preguntas_guia=[],
                                            mensaje_diferencias='DATO DE PRUEBA')
        sesion.add(conversacion)
        sesion.flush()
        regla = sesion.scalar(select(modelos.ReglaDesbloqueo))
        aplicacion_instrumento = sesion.scalar(select(modelos.Aplicacion))
        dimension = sesion.scalar(select(modelos.Dimension).where(
            modelos.Dimension.instrumento_id == aplicacion_instrumento.instrumento_id))
        item = sesion.scalar(select(modelos.ItemInstrumento))
        opcion = sesion.scalar(select(modelos.OpcionEscala).where(modelos.OpcionEscala.escala_id == item.escala_id))
        item_registro = sesion.scalar(select(modelos.ItemRegistro).limit(1))
        pregunta = sesion.scalar(select(modelos.PreguntaDiario))
        ocupacion = sesion.scalar(select(modelos.Ocupacion))
        if ocupacion is None:
            ocupacion = modelos.Ocupacion(codigo='prueba-reinicio', codigo_onet='PRUEBA-REINICIO',
                                          titulo='DATO DE PRUEBA', grupo='15')
            sesion.add(ocupacion)
        progreso = modelos.ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id, estado='EN_CURSO')
        entrevista = modelos.Entrevista(codigo='ENT-REINICIO', resumen='DATO DE PRUEBA', fecha_hora=fecha)
        resultado = modelos.ResultadoInstrumento(cuenta_id=cuenta.id, aplicacion_id=aplicacion_instrumento.id, calculado_en=fecha)
        sesion.add_all([progreso, entrevista, resultado])
        sesion.flush()
        respuesta = modelos.RespuestaRegistro(progreso_id=progreso.id, item_registro_id=item_registro.id,
            texto_inicial='DATO DE PRUEBA', estado='PENDIENTE_SEGUIMIENTO', creada_en=fecha, actualizada_en=fecha)
        sesion.add(respuesta)
        sesion.flush()
        sesion.add_all([
            modelos.ResultadoCaso(progreso_id=progreso.id, puntaje=85, fecha_hora=fecha),
            batalla := modelos.ResultadoBatalla(progreso_id=progreso.id, victoria=False, aciertos=1, preguntas=3,
                                                fecha_hora=fecha),
            modelos.ColeccionOcupacion(cuenta_id=cuenta.id, ocupacion_id=ocupacion.id, actividad_id=actividad.id,
                                       obtenida_en=fecha),
            modelos.EntradaDiario(cuenta_id=cuenta.id, origen='LIBRE', numero=1, numero_libre=1, texto='DATO DE PRUEBA',
                                  fecha_hora=fecha),
            modelos.ContadorDiario(cuenta_id=cuenta.id, ultimo_numero=1, ultimo_libre=1),
            modelos.Recomendacion(cuenta_id=cuenta.id, pregunta_diario_id=pregunta.id, tipo='DIARIA', texto='DATO DE PRUEBA',
                                  origen='FIJA', fecha=fecha.date(), creada_en=fecha),
            modelos.CheckIn(cuenta_id=cuenta.id, fecha=fecha.date(), nivel_seguridad=3),
            modelos.EntrevistaAutor(entrevista_id=entrevista.id, cuenta_id=cuenta.id),
            modelos.ConversacionVinculo(vinculo_id=vinculo.id, conversacion_id=conversacion.id, conversada_en=fecha),
            modelos.EventoUso(cuenta_id=cuenta.id, tipo='INGRESO', fecha_hora=fecha),
            modelos.Desbloqueo(cuenta_id=cuenta.id, regla_id=regla.id, fecha_hora=fecha),
            modelos.RespuestaItem(progreso_id=progreso.id, item_id=item.id, opcion_id=opcion.id, creada_en=fecha, actualizada_en=fecha),
            modelos.ResultadoDimension(resultado_id=resultado.id, dimension_id=dimension.id, puntaje=1, puntaje_maximo=5, porcentaje=20),
            modelos.Coincidencia(resultado_id=resultado.id, ocupacion_id=ocupacion.id, posicion=1, correlacion=0.9, ajuste='BEST_FIT'),
            modelos.TurnoSeguimiento(respuesta_id=respuesta.id, orden=1, pregunta='DATO DE PRUEBA', criterios_objetivo=['C1'], creado_en=fecha),
            modelos.EvaluacionRespuesta(respuesta_id=respuesta.id, numero=1, origen='EXTENSION_MINIMA', clasificacion='POCO_DESARROLLADA',
                criterios_faltantes=['C1'], texto_evaluado='DATO DE PRUEBA', fecha_hora=fecha),
            modelos.Favorito(cuenta_id=cuenta.id, tipo='OCUPACION', id_referencia=ocupacion.id, fecha_hora=fecha),
        ])
        sesion.flush()
        # F04b: el intento guarda sus respuestas.
        pregunta = sesion.scalar(select(modelos.PreguntaBatalla).order_by(modelos.PreguntaBatalla.codigo))
        sesion.add(modelos.RespuestaBatalla(resultado_batalla_id=batalla.id, pregunta_batalla_id=pregunta.id,
                                            opcion=pregunta.correcta, correcta=True))
        _llenar_planes(sesion, cuenta, fecha)


def _llenar_planes(sesion, cuenta, fecha):
    """B11: una tarjeta con una fila en cada tabla de planes y la opción inicial de la cuenta."""
    carrera = sesion.scalar(select(modelos.Carrera))
    opcion = sesion.scalar(select(modelos.OpcionLista))
    cuenta.opcion_inicial_id = carrera.id
    tarjeta = modelos.TarjetaCarrera(cuenta_id=cuenta.id, carrera_id=carrera.id, prioridad=1, creada_en=fecha,
                                     actualizada_en=fecha)
    sesion.add(tarjeta)
    sesion.flush()
    duda = modelos.DudaTarjeta(tarjeta_id=tarjeta.id, numero=1, origen='PROPIA', texto='DATO DE PRUEBA', estado='ABIERTA',
                               creada_en=fecha)
    complicacion = modelos.ComplicacionTarjeta(tarjeta_id=tarjeta.id, numero=1, texto_otro='DATO DE PRUEBA', creada_en=fecha)
    sesion.add_all([duda, complicacion])
    sesion.flush()
    sugerencia = modelos.SugerenciaTarjeta(tarjeta_id=tarjeta.id, numero=1, duda_id=duda.id, tipo_opcion_id=opcion.id,
                                           texto='DATO DE PRUEBA', estado='ACEPTADA', generada_por='RESPALDO',
                                           creada_en=fecha)
    sesion.add(sugerencia)
    sesion.flush()
    paso = modelos.PasoTarjeta(tarjeta_id=tarjeta.id, numero=1, posicion=1, tipo_opcion_id=opcion.id, texto='DATO DE PRUEBA',
                               duda_id=duda.id, sugerencia_id=sugerencia.id, estado='HECHO', hallazgo='DATO DE PRUEBA',
                               hecho_en=fecha)
    sesion.add(paso)
    sesion.flush()
    duda.estado, duda.cerrada_por_paso_id = 'CERRADA', paso.id
    sesion.add_all([
        modelos.MotivoTarjeta(tarjeta_id=tarjeta.id, posicion=1, opcion_id=opcion.id),
        modelos.ConocimientoTarjeta(tarjeta_id=tarjeta.id, pregunta='CURSOS', respuesta='NO'),
        modelos.GastoTarjeta(tarjeta_id=tarjeta.id, posicion=1, rubro_otro='DATO DE PRUEBA', monto=10,
                             frecuencia='UNICA'),
        modelos.FinanciamientoTarjeta(tarjeta_id=tarjeta.id, posicion=1, texto_otro='DATO DE PRUEBA'),
    ])


def filas(motor):
    with motor.connect() as conexion:
        return {tabla.name: conexion.execute(select(tabla).order_by(*tabla.primary_key.columns)).all()
                for tabla in Base.metadata.sorted_tables}
