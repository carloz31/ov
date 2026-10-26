from datetime import date, datetime

import pytest
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import IntegrityError

from app import models as modelos


FECHA = datetime(2026, 10, 1, 10)
TABLAS_ESTADO = {
    "progreso_actividad", "resultado_caso", "resultado_batalla", "respuesta_batalla", "coleccion_ocupacion", "recomendacion", "entrada_diario",
    "contador_diario", "check_in", "insignia_vitrina", "presentacion_vista",
    "entrevista", "entrevista_autor", "conversacion_vinculo", "evento_uso", "desbloqueo",
    "respuesta_item", "resultado_instrumento", "resultado_dimension", "coincidencia",
    "respuesta_registro", "turno_seguimiento", "evaluacion_respuesta", "favorito",
    "tarjeta_carrera", "motivo_tarjeta", "conocimiento_tarjeta", "duda_tarjeta", "gasto_tarjeta",
    "financiamiento_tarjeta", "complicacion_tarjeta", "sugerencia_tarjeta", "paso_tarjeta",
}


def test_tablas_indices_y_claves_foraneas(aplicacion, cliente):
    inspector = inspect(aplicacion.state.motor_bd)
    esperadas = {
        "salon", "salon_instrumento", "salon_actividad_prioritaria", "cuenta", "orientadora_salon", "vinculo_familiar", "bloque", "actividad", "tematica", "actividad_tematica", "actividad_dimension", "pregunta_batalla", "seccion", "presentacion", "ficha",
        "testimonio",
        "pregunta_diario", "conversacion", "grupo_insignia", "insignia", "nivel", "familia_carrera",
        "carrera", "regla_desbloqueo", "condicion_desbloqueo",
    } | TABLAS_ESTADO
    esperadas |= {
        "instrumento", "dimension", "escala_respuesta", "opcion_escala", "item_instrumento",
        "actividad_item", "aplicacion", "aplicacion_actividad", "ocupacion", "puntaje_ocupacion",
        "carrera_ocupacion",
        "lista_opciones", "opcion_lista", "item_registro", "criterio_completitud", "referencia",
        "high_point", "tipo_carrera", "ubicacion", "institucion", "institucion_carrera", "ingreso_carrera",
        "rango_ingreso", "seccion_tarjeta", "referencia_rubro", "referencia_camino",
    }
    assert set(inspector.get_table_names()) == esperadas
    assert len(esperadas) == 84
    assert inspector.get_pk_constraint("entrevista_autor")["constrained_columns"] == [
        "entrevista_id", "cuenta_id",
    ]
    assert any(indice["column_names"] == ["cuenta_id", "tipo"]
               for indice in inspector.get_indexes("evento_uso"))
    with aplicacion.state.motor_bd.connect() as conexion:
        assert conexion.scalar(text("PRAGMA foreign_keys")) == 1
        assert conexion.execute(text("PRAGMA foreign_key_check")).all() == []
        assert conexion.scalar(text("SELECT rol FROM cuenta WHERE codigo='est-ana'")) == "ESTUDIANTE"


@pytest.mark.parametrize("modelo,datos", [
    (modelos.ProgresoActividad, {"cuenta_id": 1, "actividad_id": 1, "estado": modelos.EstadoProgreso.COMPLETADA}),
    (modelos.CheckIn, {"cuenta_id": 1, "fecha": date(2026, 10, 1), "nivel_seguridad": 3}),
    (modelos.Desbloqueo, {"cuenta_id": 1, "regla_id": 1, "fecha_hora": FECHA}),
])
def test_estado_no_admite_duplicados(sesion, modelo, datos):
    sesion.add(modelo(**datos))
    sesion.flush()
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.add(modelo(**datos))
            sesion.flush()


def test_entradas_libres_intentos_y_eventos_pueden_repetirse(sesion):
    for _ in range(2):
        numero = sesion.scalar(select(func.count()).select_from(modelos.EntradaDiario)) + 1
        sesion.add(modelos.EntradaDiario(cuenta_id=1, origen=modelos.OrigenEntrada.LIBRE, numero=numero,
                                       numero_libre=numero, texto="Libre", fecha_hora=FECHA))
        sesion.add(modelos.EventoUso(cuenta_id=1, tipo=modelos.TipoEventoUso.COMPLETA_ACTIVIDAD,
                                     id_referencia=1, fecha_hora=FECHA))
    progreso = modelos.ProgresoActividad(cuenta_id=1, actividad_id=sesion.scalar(select(modelos.Actividad.id).where(modelos.Actividad.codigo == 't-caso')), estado=modelos.EstadoProgreso.COMPLETADA)
    sesion.add(progreso)
    sesion.flush()
    for puntaje in (50, 85, 95):
        sesion.add(modelos.ResultadoCaso(progreso_id=progreso.id, puntaje=puntaje, fecha_hora=FECHA))
    sesion.flush()
    assert sesion.scalar(select(func.count()).select_from(modelos.EntradaDiario)) == 2
    assert sesion.scalar(select(func.count()).select_from(modelos.EventoUso)) == 2
    assert sesion.scalar(select(func.count()).select_from(modelos.ResultadoCaso)) == 3


@pytest.mark.parametrize("modelo,datos", [
    (modelos.CheckIn, {"cuenta_id": 999, "fecha": date(2026, 10, 1), "nivel_seguridad": 3}),
    (modelos.CheckIn, {"cuenta_id": 1, "fecha": date(2026, 10, 1), "nivel_seguridad": 0}),
    (modelos.CheckIn, {"cuenta_id": 1, "fecha": date(2026, 10, 1), "nivel_seguridad": 6}),
    (modelos.EntradaDiario, {"cuenta_id": 1, "origen": modelos.OrigenEntrada.GUIADA, "numero": 1,
                           "texto": "Sin pregunta", "fecha_hora": FECHA}),
    (modelos.EntradaDiario, {"cuenta_id": 1, "origen": modelos.OrigenEntrada.LIBRE, "numero": 1,
                           "texto": "Libre sin número libre", "fecha_hora": FECHA}),
    (modelos.Recomendacion, {"cuenta_id": 1, "pregunta_diario_id": 1, "tipo": modelos.TipoRecomendacion.DIARIA,
                           "texto": "Sin fecha", "origen": modelos.OrigenRedaccion.FIJA, "creada_en": FECHA}),
    (modelos.Recomendacion, {"cuenta_id": 1, "pregunta_diario_id": 1, "tipo": modelos.TipoRecomendacion.DESBLOQUEADA,
                           "texto": "Sin origen", "creada_en": FECHA}),
    (modelos.ReglaDesbloqueo, {"codigo": "R-INVALIDA", "nombre": "Inválida", "mensaje_bloqueo": "Falta.",
                             "tipo_objetivo": modelos.TipoObjetivo.ACTIVIDAD}),
    (modelos.ReglaDesbloqueo, {"codigo": "R-INVALIDA", "nombre": "Inválida",
                             "tipo_objetivo": modelos.TipoObjetivo.SECCION, "id_objetivo": 1}),
])
def test_restricciones_rechazan_datos_invalidos(sesion, modelo, datos):
    with pytest.raises(IntegrityError):
        with sesion.begin_nested():
            sesion.add(modelo(**datos))
            sesion.flush()
