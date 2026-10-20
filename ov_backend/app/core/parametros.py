"""Parámetros de la plataforma; fuentes: especificaciones de instrumentos y registro.

Los umbrales son los criterios de §5.4, no una atribución bibliográfica
adicional. Las opciones persistidas siguen siendo la fuente de sus puntajes.
"""

# §5.4: ajuste inclusivo y cantidad máxima de coincidencias guardadas.
UMBRAL_BEST_FIT = 0.729
UMBRAL_GREAT_FIT = 0.608
CORRELACION_MINIMA = 0
LIMITE_COINCIDENCIAS = 10

# B07: zona de una dimensión de partida o llegada según su promedio (inclusivo). Provisional.
UMBRAL_ZONA_FUERTE = 3.5
UMBRAL_ZONA_EN_CAMINO = 2.5

# §5.6: longitud del código de interés y corte para detectar empates.
LONGITUD_CODIGO_INTERES = 3

# §5.3 y §6.2: representación; Pearson se persiste sin redondear.
FACTOR_PORCENTAJE = 100
DECIMALES_PORCENTAJE = 2
DECIMALES_CORRELACION = 6

# §4.2: opción O*NET 1..5 -> puntaje 0..4, aplicada solo al sembrar.
OPCION_ONET_MINIMA = 1
OPCION_ONET_MAXIMA = 5
PUNTAJE_ONET_MINIMO = 0

# Registro §3 y §6: valores iniciales; el adaptador leerá el timeout del entorno.
VERSION_PROMPT_REGISTRO = "v4"
# Respaldo por longitud de un ítem sin `min_caracteres`. Provisional (B02).
MIN_CARACTERES_RESPALDO = 40
# B03: preguntas de seguimiento por registro, no por ítem.
MAXIMO_SEGUIMIENTOS_POR_REGISTRO = 2
MAXIMO_ITEMS_REGISTRO = 3
# Reinicios del test de intereses por cuenta y aplicación, solo con perfil plano (HU-095).
MAXIMO_REINICIOS_PERFIL_PLANO = 1
TIEMPO_MAXIMO_EVALUACION_SEGUNDOS = 8
MODELO_LLM_REGISTRO = "gemini-3.8-flash"
TEMPERATURA_REGISTRO = 0.2
# B03: validación de la pregunta redactada por el LLM; se compara en minúsculas y sin tildes.
MAXIMO_CARACTERES_PREGUNTA = 200
PALABRAS_EVALUATIVAS = ("adecuad", "poco desarrollad", "criterio", "incomplet", "insuficient")
# B03: la consolidada no puede superar este factor del largo de lo escrito.
FACTOR_MAXIMO_CONSOLIDADA = 1.5
PAUSA_CASOS_GEMINI_SEGUNDOS = 5

# B09 · Diario. Cambiar el prompt de personalización exige subir `VERSION_PROMPT_DIARIO`.
VERSION_PROMPT_DIARIO = "v1"
# Días que una pregunta del día sigue vigente desde su fecha (provisional).
VIGENCIA_PREGUNTA_DIA_DIAS = 1
# Sorteo de la pregunta del día: peso = (máximo de la escala − promedio) + base; las DIARIA sin dimensión pesan la base.
PESO_BASE_DIMENSION = 0.5
# Preguntas del día recientes que no se repiten (provisional).
N_SIN_REPETIR_DIARIA = 3
# Amistad con el asistente: escrituras que cuentan por día y puntos para alcanzar cada nivel (provisionales).
TOPE_ENTRADAS_AMISTAD_DIA = 3
UMBRALES_AMISTAD = (1, 5, 12, 25, 45)

# B17 · Acceso.
DURACION_TOKEN_HORAS = 24
MAXIMO_INTENTOS_INGRESO = 5
MINUTOS_BLOQUEO_INGRESO = 15


def transformar_opcion_onet(orden):
    return orden - OPCION_ONET_MINIMA + PUNTAJE_ONET_MINIMO


DIMENSIONES_RIASEC = (
    ("R", "Realista"), ("I", "Investigativa"), ("A", "Artística"),
    ("S", "Social"), ("E", "Emprendedora"), ("C", "Convencional"),
)

# Iteración 1, anexo de cierre, perfil y resultados · F2.
DESCRIPCIONES_RIASEC: dict[str, str] = {
    "R": "Te atraen las actividades prácticas: trabajar con las manos, usar herramientas o máquinas y estar al aire libre.",
    "I": "Te atrae observar, preguntar y analizar para entender cómo y por qué funcionan las cosas.",
    "A": "Te atrae crear, imaginar y expresarte con libertad, sin reglas rígidas.",
    "S": "Te atrae ayudar, enseñar, cuidar o acompañar a otras personas.",
    "E": "Te atrae liderar, convencer, organizar proyectos y tomar decisiones.",
    "C": "Te atrae ordenar información, seguir procedimientos claros y trabajar con datos de forma precisa.",
}

# B11 · Planes de carrera.
MAXIMO_PLANES = 3
CICLOS_POR_ANIO = 2
# Bloque MISIONES_CAMPO del estudiante con este número: la opción inicial se fija antes de completarlo.
NUMERO_BLOQUE_OPCION_INICIAL = 2
# Mínimo del relato para que POR_QUE quede lista; no se muestra al estudiante.
MINIMO_CARACTERES_RELATO = MIN_CARACTERES_RESPALDO
MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN = 6
MAXIMO_PASOS_POR_DUDA = 2
MAXIMO_CARACTERES_PASO = 140
