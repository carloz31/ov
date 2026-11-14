"""Enumerados puros y reexportación diferida de todos los modelos ORM."""

from importlib import import_module

from app.models.enums import (
    Rol, Espacio, Audiencia, TipoActividad, Visibilidad, EstadoProgreso, TipoEventoUso,
    TipoResultado, MomentoAplicacion, TipoObjetivo, TipoConteo, OrigenEntrada,
    EstadoRespuestaRegistro,
    TipoReferencia, EstadoReferencia, ZonaDimension, TipoInstitucion, TipoFavorito,
    UsoPreguntaDiario, TipoRecomendacion, GestionInstitucion, FrecuenciaGasto, OrigenIdea,
    PreguntaConocimiento, RespuestaConocimiento, OrigenDuda, EstadoDuda, EstadoSugerencia, OrigenSugerencia,
    EstadoPaso, OrigenSesion, EstadoInvestigacion, OrigenPreguntaGuion, EstadoSugerenciaGuion, EstadoEntrevista,
    MotivoReporte, EstadoReporte, TipoNotificacion, FuenteOpciones, CampoLoQuePienso,
    ClaseNovedadPlan,
)


_MODELOS_POR_MODULO = {
    'app.models.base': (
        'Base',
    ),
    'app.models.cuentas': (
        'Colegio', 'Salon', 'Cuenta', 'OrientadoraSalon', 'VinculoFamiliar', 'SalonActividadPrioritaria', 'SalonInstrumento',
    ),
    'app.models.contenido': (
        'Bloque', 'Actividad', 'Tematica', 'ActividadTematica', 'PreguntaBatalla', 'Seccion', 'Presentacion', 'Ficha', 'Testimonio', 'PreguntaDiario', 'Conversacion',
        'GrupoInsignia', 'Insignia',
        'Nivel', 'FamiliaCarrera', 'Carrera',
    ),
    'app.models.progreso': (
        'ProgresoActividad', 'ResultadoCaso', 'ResultadoBatalla', 'RespuestaBatalla', 'ColeccionOcupacion', 'Recomendacion', 'EntradaDiario', 'ContadorDiario',
        'CheckIn', 'ConversacionVinculo', 'Favorito', 'InsigniaVitrina', 'PresentacionVista',
    ),
    'app.models.investigaciones': (
        'PreguntaBaseGuion', 'TipoReaccion', 'Investigacion', 'PreguntaGuion', 'SugerenciaGuion', 'Entrevista',
        'EntrevistaAutor', 'Reaccion', 'Reporte',
    ),
    'app.models.motor': (
        'EventoUso', 'ReglaDesbloqueo', 'CondicionDesbloqueo', 'Desbloqueo', 'Notificacion',
    ),
    'app.models.instrumentos': (
        'Instrumento', 'Dimension', 'EscalaRespuesta', 'OpcionEscala', 'ItemInstrumento',
        'ActividadItem', 'Aplicacion', 'AplicacionActividad', 'Ocupacion', 'PuntajeOcupacion',
        'RespuestaItem', 'RitmoAplicacion', 'ResultadoInstrumento', 'ResultadoDimension',
        'Coincidencia',
    ),
    'app.models.registro': (
        'ListaOpciones', 'OpcionLista', 'ItemRegistro', 'RespuestaRegistro', 'TextoFijo',
    ),
    'app.models.referencias': (
        'Referencia',
    ),
    'app.models.catalogo': (
        'HighPoint', 'TipoCarrera', 'OcupacionFamilia', 'GrupoOcupacional', 'EstiloTrabajo', 'Ubicacion', 'Institucion',
        'InstitucionCarrera', 'IngresoFamilia', 'IngresoInstitucion',
    ),
    'app.models.planes': (
        'SeccionTarjeta', 'ReferenciaRubro', 'ReferenciaCamino', 'RespaldoPaso', 'TarjetaCarrera', 'MotivoTarjeta',
        'ConocimientoTarjeta', 'DudaTarjeta', 'GastoTarjeta', 'FinanciamientoTarjeta', 'ComplicacionTarjeta',
        'SugerenciaTarjeta', 'PasoTarjeta',
    ),
    'app.models.panel': (
        'GrupoAlerta', 'Alerta', 'Parametro',
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
    'TipoEventoUso', 'TipoResultado', 'MomentoAplicacion', 'TipoObjetivo',
    'TipoConteo', 'OrigenEntrada', 'EstadoRespuestaRegistro',
    'Colegio', 'Salon', 'Cuenta', 'OrientadoraSalon', 'VinculoFamiliar', 'SalonActividadPrioritaria',
    'SalonInstrumento', 'Bloque',
    'Actividad', 'Tematica', 'ActividadTematica', 'PreguntaBatalla', 'Seccion', 'Presentacion', 'Ficha', 'Testimonio',
    'PreguntaDiario', 'Conversacion', 'GrupoInsignia', 'Insignia', 'Nivel', 'FamiliaCarrera', 'Carrera',
    'ProgresoActividad', 'ResultadoCaso', 'ResultadoBatalla', 'RespuestaBatalla', 'ColeccionOcupacion', 'EntradaDiario', 'CheckIn', 'Entrevista',
    'EntrevistaAutor', 'ConversacionVinculo', 'EventoUso', 'ReglaDesbloqueo',
    'CondicionDesbloqueo', 'Desbloqueo', 'Instrumento', 'Dimension', 'EscalaRespuesta',
    'OpcionEscala', 'ItemInstrumento', 'ActividadItem', 'Aplicacion', 'AplicacionActividad',
    'Ocupacion', 'PuntajeOcupacion', 'RespuestaItem', 'RitmoAplicacion', 'ResultadoInstrumento',
    'ResultadoDimension', 'Coincidencia', 'ListaOpciones', 'OpcionLista', 'ItemRegistro',
    'RespuestaRegistro', 'TextoFijo', 'FuenteOpciones',
    'TipoReferencia', 'EstadoReferencia', 'Referencia', 'ZonaDimension', 'TipoInstitucion', 'HighPoint',
    'TipoCarrera', 'OcupacionFamilia', 'GrupoOcupacional', 'EstiloTrabajo', 'Ubicacion', 'Institucion', 'InstitucionCarrera',
    'IngresoFamilia', 'IngresoInstitucion',
    'TipoFavorito', 'Favorito', 'InsigniaVitrina', 'PresentacionVista', 'UsoPreguntaDiario', 'TipoRecomendacion', 'Recomendacion',
    'ContadorDiario', 'GestionInstitucion', 'FrecuenciaGasto', 'OrigenIdea', 'PreguntaConocimiento',
    'RespuestaConocimiento', 'OrigenDuda', 'EstadoDuda', 'EstadoSugerencia', 'OrigenSugerencia', 'ClaseNovedadPlan', 'EstadoPaso',
    'SeccionTarjeta', 'ReferenciaRubro', 'ReferenciaCamino', 'RespaldoPaso', 'TarjetaCarrera', 'MotivoTarjeta', 'ConocimientoTarjeta',
    'DudaTarjeta', 'GastoTarjeta', 'FinanciamientoTarjeta', 'ComplicacionTarjeta', 'SugerenciaTarjeta', 'PasoTarjeta',
    'GrupoAlerta', 'Alerta', 'Parametro',
    'OrigenSesion', 'EstadoInvestigacion', 'OrigenPreguntaGuion', 'CampoLoQuePienso', 'EstadoSugerenciaGuion', 'EstadoEntrevista',
    'MotivoReporte', 'EstadoReporte', 'PreguntaBaseGuion', 'TipoReaccion', 'Investigacion', 'PreguntaGuion',
    'SugerenciaGuion', 'Reaccion', 'Reporte',
]
