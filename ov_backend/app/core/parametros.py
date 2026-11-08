"""Parámetros de la plataforma; fuentes: especificaciones de instrumentos y registro.

Los umbrales son los criterios de §5.4, no una atribución bibliográfica
adicional. Las opciones persistidas siguen siendo la fuente de sus puntajes.
"""

# Se guardan todas las coincidencias con r ≥ CORRELACION_MINIMA, sin tope (ajuste resultados-intereses).
CORRELACION_MINIMA = 0
# Ocupaciones afines que se muestran: r ≥ UMBRAL_AFIN, de MINIMO a MAXIMO (si menos pasan el umbral, se
# completan hasta el mínimo y el perfil es «poco marcado»). Banda «muy afín» desde UMBRAL_MUY_AFIN de parecido.
UMBRAL_AFIN = 0.5
MAXIMO_OCUPACIONES_AFINES = 30
MINIMO_OCUPACIONES_AFINES = 10
UMBRAL_MUY_AFIN = 70
UMBRAL_AFIN_PARECIDO = 50
# Familias recomendadas: media de las 2 mejores r de sus ocupaciones afines con esa familia principal; si solo
# tiene una, el segundo cupo vale RELLENO_SEGUNDA_OCUPACION.
FAMILIAS_RECOMENDADAS = 5
OCUPACIONES_POR_FAMILIA = 2
RELLENO_SEGUNDA_OCUPACION = 0.5
# Preparación que suele pedir una ocupación afín, según su job_zone O*NET: amplia (grado universitario o
# posgrado) o intermedia (formación técnica, capacitación o experiencia). Fuera de ambas, o sin job_zone: nula.
ZONAS_PREPARACION_AMPLIA = (4, 5)
ZONAS_PREPARACION_INTERMEDIA = (2, 3)

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
VERSION_PROMPT_REGISTRO = "v6.9"
# Respaldo por longitud de un ítem sin `min_caracteres`. Provisional (B02).
MIN_CARACTERES_RESPALDO = 40
# B03: preguntas de seguimiento por intento de un registro; es el valor por defecto de `actividad.maximo_seguimientos`.
MAXIMO_SEGUIMIENTOS_POR_REGISTRO = 2
# Ajuste registros: repreguntas por ítem y por intento, salvo que el ítem declare `max_repreguntas`.
MAXIMO_REPREGUNTAS_POR_ITEM = 1
# Ajuste registros: ítems ABIERTA que un registro admite sin dejar de ser adecuado.
MAXIMO_ABIERTOS_ADECUADO = 1
# Ajuste carga-actividades: 5, lo que pide el registro más largo del contenido (b4-1).
MAXIMO_ITEMS_REGISTRO = 5
# Reinicios del test de intereses por cuenta y aplicación, solo con perfil plano (HU-095).
MAXIMO_REINICIOS_PERFIL_PLANO = 1
# Aviso de velocidad (HU-096), por intento: tope de avisos e ítems contados entre el primero y el segundo.
MAX_AVISOS_VELOCIDAD = 2
ITEMS_ENTRE_AVISOS_VELOCIDAD = 10
TIEMPO_MAXIMO_EVALUACION_SEGUNDOS = 8
MODELO_LLM_REGISTRO = "gemini-3.5-flash-lite"
# Ajuste pruebas llm: 1.0 en el registro (recomendación de Google para Gemini 3); los asistentes (diario, cartas,
# sugerencias de pasos, guion) conservan 0.2. gemini-3.5-flash-lite la ignora; se conserva para los modelos que la usan.
TEMPERATURA_REGISTRO = 1.0
TEMPERATURA_ASISTENTES = 0.2
# Ajuste pruebas llm: entrega y seguimiento van en `low` (config C de tests/llm/resultados/comparativa-razonamiento.md,
# elegida por el usuario); los asistentes conservan el razonamiento mínimo que ya tenían. Si el modelo no admite el
# nivel, `gemini.razonamiento_para` usa su mínimo.
NIVEL_RAZONAMIENTO_REGISTRO = "low"
NIVEL_RAZONAMIENTO_ASISTENTES = "minimal"
# B03: validación de la pregunta redactada por el LLM; se compara en minúsculas y sin tildes.
MAXIMO_CARACTERES_PREGUNTA = 200
PALABRAS_EVALUATIVAS = ("adecuad", "poco desarrollad", "criterio", "incomplet", "insuficient")
# B03: la consolidada no puede superar este factor del largo de lo escrito.
FACTOR_MAXIMO_CONSOLIDADA = 1.5
# Ajuste pruebas llm: margen fijo sobre el factor, en caracteres (las respuestas cortas necesitan conectores).
MARGEN_CONSOLIDADA = 60
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

# F06 · Catálogo: tamaño de página de los listados.
LIMITE_PAGINA_CATALOGO = 20
LIMITE_MAXIMO_CATALOGO = 50
# Ocupaciones que pide de una vez el directorio de un caso (ajuste carga-casos).
MAXIMO_OCUPACIONES_CASO = 30
# Ajuste notificaciones: páginas de la campana, como las del catálogo.
LIMITE_PAGINA_NOTIFICACIONES = 20
LIMITE_MAXIMO_NOTIFICACIONES = 50

# Ajuste catalogo-datos-reales: fuente de los ingresos de egresados, que toda respuesta con ingresos muestra.
FUENTE_INGRESOS = "Ponte en Carrera (MTPE)"
# Escala de los puntajes RIASEC de las ocupaciones (Mi Próximo Paso); el detalle los entrega de 0 a 100 con
# `puntaje_visual` (calculo.py).
PUNTAJE_OCUPACION_MINIMO = 1
PUNTAJE_OCUPACION_MAXIMO = 7

# F08: código del diploma del apoderado, EXP-AP-{año}-{id con ceros}-{dígito verificador}. El prefijo cambia si
# cambia el nombre de la plataforma.
PREFIJO_DIPLOMA = 'EXP-AP'
CIFRAS_CUENTA_DIPLOMA = 5

# B13: favoritos de estudiantes que, con el destacado de la orientadora, vuelven Leyenda una entrevista.
FAVORITOS_LEYENDA = 3
# B13: sugerencias de preguntas para el guion de una entrevista (una llamada al LLM por versión de «lo que pienso»).
MAXIMO_SUGERENCIAS_GUION = 3
MAXIMO_CARACTERES_PREGUNTA_GUION = 160
