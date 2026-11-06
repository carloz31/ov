from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.models import Base, Cuenta


TABLAS_DE_ESTADO = (
    'progreso_actividad', 'resultado_caso', 'resultado_batalla', 'respuesta_batalla', 'coleccion_ocupacion', 'recomendacion', 'entrada_diario',
    'contador_diario', 'check_in', 'insignia_vitrina', 'presentacion_vista',
    'entrevista', 'entrevista_autor', 'conversacion_vinculo', 'evento_uso',
    'desbloqueo', 'respuesta_item', 'resultado_instrumento', 'resultado_dimension',
    'coincidencia', 'respuesta_registro', 'turno_seguimiento', 'evaluacion_respuesta', 'favorito',
    'tarjeta_carrera', 'motivo_tarjeta', 'conocimiento_tarjeta', 'duda_tarjeta', 'gasto_tarjeta',
    'financiamiento_tarjeta', 'complicacion_tarjeta', 'sugerencia_tarjeta', 'paso_tarjeta',
    'investigacion', 'pregunta_guion', 'sugerencia_guion', 'reaccion', 'reporte', 'notificacion',
)


def reiniciar_estado(sesion: Session) -> None:
    """El llamador delimita la transacción; el catálogo permanece intacto."""
    for tabla in reversed(Base.metadata.sorted_tables):
        if tabla.name in TABLAS_DE_ESTADO:
            sesion.execute(delete(tabla))
    # La opción inicial es estado de la cuenta en una tabla de catálogo (B11).
    sesion.execute(update(Cuenta).where(Cuenta.opcion_inicial_id.is_not(None)).values(opcion_inicial_id=None))
