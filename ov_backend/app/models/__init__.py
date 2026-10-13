"""Enumerados puros y reexportación diferida de todos los modelos ORM."""

from importlib import import_module

from app.models.enums import (
    Rol, Espacio, Audiencia, TipoActividad, Visibilidad, EstadoProgreso, TipoEventoUso, NivelAjuste,
    TipoResultado, MomentoAplicacion, TipoObjetivo, TipoConteo, OrigenEntrada,
    ClasificacionRespuesta, EstadoRespuestaRegistro, OrigenEvaluacion, TipoCriterio,
)


_MODELOS_POR_MODULO = {
    'app.models.base': (
        'Base',
    ),
    'app.models.cuentas': (
        'Salon', 'Cuenta', 'OrientadoraSalon', 'VinculoFamiliar',
    ),
    'app.models.contenido': (
        'Bloque', 'Actividad', 'Seccion', 'Ficha', 'Testimonio', 'PreguntaDiario', 'Conversacion',
        'Insignia',
        'Nivel', 'FamiliaCarrera', 'Carrera',
    ),
    'app.models.progreso': (
        'ProgresoActividad', 'ResultadoCaso', 'EntradaDiario', 'CheckIn', 'Entrevista',
        'EntrevistaAutor', 'ConversacionVinculo',
    ),
    'app.models.motor': (
        'EventoUso', 'ReglaDesbloqueo', 'CondicionDesbloqueo', 'Desbloqueo',
    ),
    'app.models.instrumentos': (
        'Instrumento', 'Dimension', 'EscalaRespuesta', 'OpcionEscala', 'ItemInstrumento',
        'ActividadItem', 'Aplicacion', 'AplicacionActividad', 'Ocupacion', 'PuntajeOcupacion',
        'CarreraOcupacion', 'RespuestaItem', 'ResultadoInstrumento', 'ResultadoDimension',
        'Coincidencia',
    ),
    'app.models.registro': (
        'ListaOpciones', 'OpcionLista', 'ItemRegistro', 'CriterioCompletitud', 'RespuestaRegistro',
        'TurnoSeguimiento', 'EvaluacionRespuesta',
    ),
}


def __getattr__(nombre):
    # Los enumerados no cargan SQLAlchemy; pedir un modelo registra todas las tablas.
    if not any(nombre in nombres for nombres in _MODELOS_POR_MODULO.values()):
        raise AttributeError(f"El módulo {__name__} no tiene el atributo {nombre}")
    for ruta, nombres in _MODELOS_POR_MODULO.items():
        modulo = import_module(ruta)
        globals().update({nombre_modelo: getattr(modulo, nombre_modelo)
                          for nombre_modelo in nombres})
    return globals()[nombre]


__all__ = [
    'Base', 'Rol', 'Espacio', 'Audiencia', 'TipoActividad', 'Visibilidad', 'EstadoProgreso',
    'TipoEventoUso', 'NivelAjuste', 'TipoResultado', 'MomentoAplicacion', 'TipoObjetivo',
    'TipoConteo', 'OrigenEntrada', 'ClasificacionRespuesta', 'EstadoRespuestaRegistro',
    'OrigenEvaluacion', 'TipoCriterio', 'Salon', 'Cuenta', 'OrientadoraSalon', 'VinculoFamiliar', 'Bloque',
    'Actividad', 'Seccion', 'Ficha', 'Testimonio',
    'PreguntaDiario', 'Conversacion', 'Insignia', 'Nivel', 'FamiliaCarrera', 'Carrera',
    'ProgresoActividad', 'ResultadoCaso', 'EntradaDiario', 'CheckIn', 'Entrevista',
    'EntrevistaAutor', 'ConversacionVinculo', 'EventoUso', 'ReglaDesbloqueo',
    'CondicionDesbloqueo', 'Desbloqueo', 'Instrumento', 'Dimension', 'EscalaRespuesta',
    'OpcionEscala', 'ItemInstrumento', 'ActividadItem', 'Aplicacion', 'AplicacionActividad',
    'Ocupacion', 'PuntajeOcupacion', 'CarreraOcupacion', 'RespuestaItem', 'ResultadoInstrumento',
    'ResultadoDimension', 'Coincidencia', 'ListaOpciones', 'OpcionLista', 'ItemRegistro',
    'CriterioCompletitud', 'RespuestaRegistro', 'TurnoSeguimiento', 'EvaluacionRespuesta',
]
