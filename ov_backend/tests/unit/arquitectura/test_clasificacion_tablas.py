"""Clasificacion tablas."""

from app.models import Base
from app.services.desarrollo import TABLAS_DE_ESTADO


CATALOGO = {
    'salon', 'salon_instrumento', 'salon_actividad_prioritaria', 'cuenta', 'orientadora_salon', 'vinculo_familiar', 'bloque', 'actividad', 'tematica', 'actividad_tematica', 'actividad_dimension', 'seccion', 'ficha', 'testimonio',
    'pregunta_diario', 'conversacion', 'insignia', 'nivel', 'familia_carrera', 'carrera',
    'regla_desbloqueo', 'condicion_desbloqueo', 'instrumento', 'dimension',
    'escala_respuesta', 'opcion_escala', 'item_instrumento', 'actividad_item',
    'aplicacion', 'aplicacion_actividad', 'ocupacion', 'puntaje_ocupacion',
    'carrera_ocupacion', 'lista_opciones', 'opcion_lista', 'item_registro', 'criterio_completitud',
    'referencia',
}


ESTADO = {
    'progreso_actividad', 'resultado_caso', 'resultado_batalla', 'coleccion_ocupacion', 'entrada_diario', 'check_in', 'entrevista',
    'entrevista_autor', 'conversacion_vinculo', 'evento_uso', 'desbloqueo',
    'respuesta_item', 'resultado_instrumento', 'resultado_dimension', 'coincidencia',
    'respuesta_registro', 'turno_seguimiento', 'evaluacion_respuesta',
}


def test_todas_las_tablas_clasificadas_sin_solapamientos():
    assert CATALOGO.isdisjoint(ESTADO)
    assert CATALOGO | ESTADO == set(Base.metadata.tables)
    assert set(TABLAS_DE_ESTADO) == ESTADO
    assert len(TABLAS_DE_ESTADO) == len(ESTADO)
