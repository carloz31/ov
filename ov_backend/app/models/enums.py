from enum import StrEnum


class Rol(StrEnum):
    ESTUDIANTE = "ESTUDIANTE"
    APODERADO = "APODERADO"
    ORIENTADORA = "ORIENTADORA"


class OrigenSesion(StrEnum):
    """Cómo se emitió un token (B17). Solo viaja en el token; GOOGLE se agregará con su ingreso."""
    CONTRASENA = "CONTRASENA"


class Espacio(StrEnum):
    MISIONES_CAMPO = "MISIONES_CAMPO"
    CIUDAD = "CIUDAD"
    PORTAL_FAMILIA = "PORTAL_FAMILIA"
    # Ajuste del diario (F05): los recuerdos de Lumi; el mapa no lo pinta y no cuenta en ningún avance.
    LUMI = "LUMI"


class Audiencia(StrEnum):
    ESTUDIANTE = "ESTUDIANTE"
    APODERADO = "APODERADO"


class TipoActividad(StrEnum):
    INFORMATIVA = "INFORMATIVA"
    REGISTRO = "REGISTRO"
    CUESTIONARIO = "CUESTIONARIO"
    CASO = "CASO"
    BATALLA = "BATALLA"


class Visibilidad(StrEnum):
    SIEMPRE = "SIEMPRE"
    AL_DESBLOQUEAR = "AL_DESBLOQUEAR"


class EstadoProgreso(StrEnum):
    EN_CURSO = "EN_CURSO"
    COMPLETADA = "COMPLETADA"


class TipoEventoUso(StrEnum):
    INGRESO = "INGRESO"
    COMPLETA_ACTIVIDAD = "COMPLETA_ACTIVIDAD"
    COMPLETA_BLOQUE = "COMPLETA_BLOQUE"
    RESPUESTA_REFLEXIVA = "RESPUESTA_REFLEXIVA"
    ESCRIBE_ENTRADA_DIARIO = "ESCRIBE_ENTRADA_DIARIO"
    ESCRIBE_ENTRADA_LIBRE = "ESCRIBE_ENTRADA_LIBRE"
    REGISTRA_CHECK_IN = "REGISTRA_CHECK_IN"
    VISTA_CARRERA = "VISTA_CARRERA"
    SUPERA_CASO = "SUPERA_CASO"
    PUBLICA_ENTREVISTA = "PUBLICA_ENTREVISTA"
    ESCRIBE_CARTA = "ESCRIBE_CARTA"
    COMPLETA_CONVERSACION = "COMPLETA_CONVERSACION"
    REINICIA_INSTRUMENTO = "REINICIA_INSTRUMENTO"
    INVITA_A_CREW = "INVITA_A_CREW"
    FORMA_CREW = "FORMA_CREW"
    VENCE_DESAFIO_INTACTO = "VENCE_DESAFIO_INTACTO"
    REGISTRO_ADECUADO = "REGISTRO_ADECUADO"
    REVELA_RESULTADO = "REVELA_RESULTADO"
    SUPERA_BATALLA = "SUPERA_BATALLA"
    VISTA_TESTIMONIO = "VISTA_TESTIMONIO"
    VISTA_OCUPACION = "VISTA_OCUPACION"
    VISTA_INSTITUCION = "VISTA_INSTITUCION"
    MARCA_FAVORITO = "MARCA_FAVORITO"
    CREA_PLAN = "CREA_PLAN"
    ACTUALIZA_PLAN = "ACTUALIZA_PLAN"
    ELIMINA_PLAN = "ELIMINA_PLAN"
    VISTA_FICHA = "VISTA_FICHA"
    MARCA_FAVORITO_FICHA = "MARCA_FAVORITO_FICHA"
    MARCA_FAVORITO_TESTIMONIO = "MARCA_FAVORITO_TESTIMONIO"
    # B13: investigaciones y entrevistas. ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA se registran en cada autor.
    INICIA_INVESTIGACION = "INICIA_INVESTIGACION"
    TERMINA_GUION = "TERMINA_GUION"
    EDITA_ENTREVISTA = "EDITA_ENTREVISTA"
    VISTA_ENTREVISTA = "VISTA_ENTREVISTA"
    MARCA_FAVORITO_ENTREVISTA = "MARCA_FAVORITO_ENTREVISTA"
    REACCIONA_ENTREVISTA = "REACCIONA_ENTREVISTA"
    ENTREVISTA_DESTACADA = "ENTREVISTA_DESTACADA"
    ENTREVISTA_LEYENDA = "ENTREVISTA_LEYENDA"


class TipoInstitucion(StrEnum):
    UNIVERSIDAD = "UNIVERSIDAD"
    INSTITUTO = "INSTITUTO"
    FFAA_POLICIA = "FFAA_POLICIA"


class GestionInstitucion(StrEnum):
    PUBLICA = "PUBLICA"
    PRIVADA = "PRIVADA"


class TipoFavorito(StrEnum):
    CARRERA = "CARRERA"
    OCUPACION = "OCUPACION"
    INSTITUCION = "INSTITUCION"
    # Ajuste mochila: recursos de la mochila, ya desbloqueados.
    FICHA = "FICHA"
    TESTIMONIO = "TESTIMONIO"
    # B13: entrevistas publicadas; cuentan para la Leyenda.
    ENTREVISTA = "ENTREVISTA"


class TipoResultado(StrEnum):
    COINCIDENCIAS = "COINCIDENCIAS"
    DESTACADAS = "DESTACADAS"
    COMPARACION = "COMPARACION"


class ZonaDimension(StrEnum):
    """Lectura en palabras del promedio de una dimensión de partida o llegada (B07)."""
    FUERTE = "FUERTE"
    EN_CAMINO = "EN_CAMINO"
    POR_TRABAJAR = "POR_TRABAJAR"


class MomentoAplicacion(StrEnum):
    UNICA = "UNICA"
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"


class TipoObjetivo(StrEnum):
    BLOQUE = "BLOQUE"
    ACTIVIDAD = "ACTIVIDAD"
    FICHA = "FICHA"
    TESTIMONIO = "TESTIMONIO"
    PREGUNTA_DIARIO = "PREGUNTA_DIARIO"
    SECCION = "SECCION"
    INSIGNIA = "INSIGNIA"
    NIVEL = "NIVEL"
    SECCION_PLAN = "SECCION_PLAN"
    CONVERSACION = "CONVERSACION"


class TipoConteo(StrEnum):
    EVENTOS = "EVENTOS"
    REFERENCIAS_DISTINTAS = "REFERENCIAS_DISTINTAS"
    DIAS_DISTINTOS = "DIAS_DISTINTOS"
    # Eventos por día con tope TOPE_ENTRADAS_AMISTAD_DIA: el mismo conteo que la amistad con Lumi (F05).
    EVENTOS_TOPE_DIARIO = "EVENTOS_TOPE_DIARIO"


class OrigenEntrada(StrEnum):
    GUIADA = "GUIADA"
    LIBRE = "LIBRE"
    RECOMENDACION_DIA = "RECOMENDACION_DIA"


class UsoPreguntaDiario(StrEnum):
    DESBLOQUEABLE = "DESBLOQUEABLE"
    DIARIA = "DIARIA"


class TipoRecomendacion(StrEnum):
    DESBLOQUEADA = "DESBLOQUEADA"
    DIARIA = "DIARIA"


class OrigenRedaccion(StrEnum):
    FIJA = "FIJA"
    LLM = "LLM"


class EstadoRespuestaRegistro(StrEnum):
    """Estado de un intento de un ítem (ajuste registros llm, lote 2)."""
    # Ítem u opción sin LLM: solo la elección y el texto.
    COMPLETADO = "COMPLETADO"
    CERRADO = "CERRADO"
    # Terminó en `no_sabe`.
    ABIERTO = "ABIERTO"
    # Falló la primera llamada al LLM.
    SIN_EVALUAR = "SIN_EVALUAR"


class TipoReferencia(StrEnum):
    """Catálogo cerrado de lo que una actividad o una pregunta de diario lee de la cuenta (RNF-20)."""
    ELECCION = "ELECCION"
    TEXTO = "TEXTO"
    RESULTADO = "RESULTADO"
    COINCIDENCIAS = "COINCIDENCIAS"
    RESPUESTA_CUESTIONARIO = "RESPUESTA_CUESTIONARIO"
    FAVORITOS = "FAVORITOS"
    PLAN = "PLAN"
    PLANES = "PLANES"
    PASOS_PLAN_A = "PASOS_PLAN_A"
    OPCION_INICIAL = "OPCION_INICIAL"
    LO_QUE_PIENSO = "LO_QUE_PIENSO"
    FAMILIAS_RECOMENDADAS = "FAMILIAS_RECOMENDADAS"
    TESTIMONIOS = "TESTIMONIOS"
    DATOS_CARRERA_PLAN_A = "DATOS_CARRERA_PLAN_A"
    # Ajuste registros llm (lote 2): el primer check-in de la cuenta, para el eco de b5-1.
    CHECK_IN_PRIMERO = "CHECK_IN_PRIMERO"


class EstadoReferencia(StrEnum):
    DISPONIBLE = "DISPONIBLE"
    POR_DESARROLLAR = "POR_DESARROLLAR"
    SIN_DATO = "SIN_DATO"
    # Ajuste registros: el TEXTO de un ítem que quedó ABIERTA (no se cita; el front dice «esto lo dejaste abierto»).
    ABIERTA = "ABIERTA"


class FuenteOpciones(StrEnum):
    """De dónde salen las opciones de un ítem de elección (ajuste registros)."""
    LISTA = "LISTA"
    REFERENCIA = "REFERENCIA"
    PROPIAS = "PROPIAS"
    # Ajuste registros llm (lote 2): listas armadas de piezas de la cuenta (§4).
    PIEZAS_PERFIL = "PIEZAS_PERFIL"
    # Las del perfil con «Lo que te cuesta» primero (b4-1-menos).
    PIEZAS_PERFIL_MENOS = "PIEZAS_PERFIL_MENOS"
    PIEZAS_INICIO = "PIEZAS_INICIO"


# --- Planes de carrera (B11) ---------------------------------------------------------------------

class FrecuenciaGasto(StrEnum):
    UNICA = "UNICA"
    MENSUAL = "MENSUAL"
    POR_CICLO = "POR_CICLO"
    ANUAL = "ANUAL"


class OrigenIdea(StrEnum):
    MIA = "MIA"
    FAMILIA = "FAMILIA"
    CONOCIDO = "CONOCIDO"
    TEST = "TEST"
    PLATAFORMA = "PLATAFORMA"


class PreguntaConocimiento(StrEnum):
    DIA_NORMAL = "DIA_NORMAL"
    DONDE_TRABAJAR = "DONDE_TRABAJAR"
    CURSOS = "CURSOS"
    INGRESO = "INGRESO"
    CONOCE_ALGUIEN = "CONOCE_ALGUIEN"


class RespuestaConocimiento(StrEnum):
    SI = "SI"
    MAS_O_MENOS = "MAS_O_MENOS"
    NO = "NO"


class OrigenDuda(StrEnum):
    PREGUNTA = "PREGUNTA"
    SUGERIDA = "SUGERIDA"
    PROPIA = "PROPIA"


class EstadoDuda(StrEnum):
    ABIERTA = "ABIERTA"
    CERRADA = "CERRADA"


class EstadoSugerencia(StrEnum):
    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    DESCARTADA = "DESCARTADA"


class OrigenSugerencia(StrEnum):
    LLM = "LLM"
    RESPALDO = "RESPALDO"


class EstadoPaso(StrEnum):
    PENDIENTE = "PENDIENTE"
    HECHO = "HECHO"


class EstadoInvestigacion(StrEnum):
    """B13. Cancelar borra la investigación; no hay estado CANCELADA."""
    EN_CURSO = "EN_CURSO"
    GUIA_LISTA = "GUIA_LISTA"
    PUBLICADA = "PUBLICADA"


class OrigenPreguntaGuion(StrEnum):
    """Las preguntas base son catálogo y no se guardan por investigación. Ajuste llm-sugerencias: sale DUDA (la duda
    ya no entra directo al guion)."""
    SUGERIDA = "SUGERIDA"
    PROPIA = "PROPIA"


class CampoLoQuePienso(StrEnum):
    """Campo de «lo que pienso» del que sale una sugerencia del guion (ajuste llm-sugerencias)."""
    DIA = "DIA"
    NECESITA = "NECESITA"
    DUDA = "DUDA"


class EstadoSugerenciaGuion(StrEnum):
    PENDIENTE = "PENDIENTE"
    AGREGADA = "AGREGADA"
    DESCARTADA = "DESCARTADA"


class EstadoEntrevista(StrEnum):
    PUBLICADA = "PUBLICADA"
    RETIRADA = "RETIRADA"
    ELIMINADA = "ELIMINADA"


class MotivoReporte(StrEnum):
    OFENSIVO = "OFENSIVO"
    VIDEO = "VIDEO"
    DATOS_PRIVADOS = "DATOS_PRIVADOS"
    OTRO = "OTRO"


class EstadoReporte(StrEnum):
    PENDIENTE = "PENDIENTE"
    DESCARTADO = "DESCARTADO"
    RESUELTO = "RESUELTO"


class TipoNotificacion(StrEnum):
    """Ajuste notificaciones: lo que se anuncia en la campana. Los logros (DESBLOQUEO) son de la propia cuenta;
    el resto llega de otra cuenta."""
    DESBLOQUEO = "DESBLOQUEO"
    RESPUESTA_CONVERSACION = "RESPUESTA_CONVERSACION"
    ENTREVISTA_DESTACADA = "ENTREVISTA_DESTACADA"
    ENTREVISTA_LEYENDA = "ENTREVISTA_LEYENDA"
    REACCION_ENTREVISTA = "REACCION_ENTREVISTA"
