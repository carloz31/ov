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

# Respaldo por longitud de los asistentes (guion) y del relato de un plan. Provisional (B02). Ajuste registros llm
# (lote 3): el registro ya no tiene mínimo de caracteres.
MIN_CARACTERES_RESPALDO = 40
# Ajuste registros llm (lote 3): intentos guardados por ítem de registro; con este número, la edición se rechaza.
MAXIMO_INTENTOS_ITEM_REGISTRO = 10
# Ajuste carga-actividades: 5, lo que pide el registro más largo del contenido (b4-1).
MAXIMO_ITEMS_REGISTRO = 5
# Reinicios del test de intereses por cuenta y aplicación, solo con perfil plano (HU-095).
MAXIMO_REINICIOS_PERFIL_PLANO = 1
# Aviso de velocidad (HU-096), por intento: tope de avisos e ítems contados entre el primero y el segundo.
MAX_AVISOS_VELOCIDAD = 2
ITEMS_ENTRE_AVISOS_VELOCIDAD = 10
TIEMPO_MAXIMO_EVALUACION_SEGUNDOS = 8
MODELO_LLM_REGISTRO = "gemini-3.5-flash-lite"
# Los asistentes con Gemini (diario, cartas, sugerencias de pasos, guion). gemini-3.5-flash-lite la ignora; se
# conserva para los modelos que la usan.
TEMPERATURA_ASISTENTES = 0.2
# Razonamiento mínimo de los asistentes; si el modelo no admite el nivel, `gemini.razonamiento_para` usa su mínimo.
NIVEL_RAZONAMIENTO_ASISTENTES = "minimal"
# B03: validación de la pregunta redactada por el LLM; se compara en minúsculas y sin tildes.
MAXIMO_CARACTERES_PREGUNTA = 200
PALABRAS_EVALUATIVAS = ("adecuad", "poco desarrollad", "criterio", "incomplet", "insuficient")
PAUSA_CASOS_GEMINI_SEGUNDOS = 5
# Ajuste registros llm (lote 1): capa del LLM v7 (`app/services/registro/llm/`), aún sin conectar al flujo.
MODELO_LLM_REGISTRO_V7 = "claude-haiku-5-5"
ESFUERZO_LLM_REGISTRO_V7 = "low"
# Topes por llamada: el máximo medido en los pilotos fue 1164 tokens de salida (razonamiento incluido) y 8,3 s
# (mediana 2,1 s, p95 5,5 s).
MAXIMO_TOKENS_SALIDA_LLM = 2048
TIEMPO_MAXIMO_LLM_SEGUNDOS = 12
# Largo máximo de la respuesta y de lo escrito en «¿Cuál?» (no había uno para los registros).
MAXIMO_CARACTERES_TEXTO_LLM = 1000
MAXIMO_PALABRAS_REPREGUNTA_LLM = 30
MAXIMO_PALABRAS_ARRANQUE = 12
# El arranque cae si trae estas palabras de contenido (o más) de las respuestas que no están en la repregunta ni en la opción.
MINIMO_PALABRAS_AJENAS_ARRANQUE = 2
# Ajuste registros llm (lote 2), §2 y §4: los ítems de los que salen los marcadores y las piezas, con la forma que
# `contexto.py` espera de cada uno; la carga de `contenido` lo valida (`datos/contenido.validar_piezas`). Las
# exclusivas no dan pieza. Los textos de las piezas (grupos, orígenes y frases) están en `texto_fijo` (`PIEZA_*`).
ITEMS_PIEZAS = {
    # código: (fuente de opciones, mínima, máxima, ordenada, exclusiva que no da pieza o None)
    'b2-4-bien': ('LISTA', 3, 3, True, None),
    'b2-3-valores': ('LISTA', 3, 3, True, None),
    'b1-1-logro': ('LISTA', 1, 2, False, 'NINGUNO'),
    'b1-1-gustos': (None, None, None, False, None),
    'b2-4-cuesta': ('LISTA', 1, 2, False, 'NADA'),
    'b1-3-mia': ('LISTA', 1, 1, False, None),
    'b1-7-dia': ('PROPIAS', 1, 1, False, None),
    'b1-7-freno': (None, None, None, False, None),
    'b1-6-mito': ('LISTA', 1, 1, False, 'NINGUNO'),
    'h1-reto': ('PROPIAS', 1, 1, False, None),
}
ITEM_BIEN, ITEM_VALORES, ITEM_LOGRO, ITEM_GUSTOS = 'b2-4-bien', 'b2-3-valores', 'b1-1-logro', 'b1-1-gustos'
ITEM_CUESTA, ITEM_MIA, ITEM_DIA, ITEM_FRENO, ITEM_MITO = 'b2-4-cuesta', 'b1-3-mia', 'b1-7-dia', 'b1-7-freno', 'b1-6-mito'
ITEM_RETO = 'h1-reto'
# Los tres tests de las piezas del perfil: cada dimensión debe tener su frase (`PIEZA_FRASE_<dimensión>`).
INSTRUMENTO_INTERESES = 'TEST-RIASEC'
INSTRUMENTO_INTELIGENCIAS = 'TEST-INTELIGENCIAS'
INSTRUMENTO_HABILIDADES = 'TEST-HABILIDADES'
# Piezas con origen que se muestra y origen al LLM (`PIEZA_ORIGEN_<pieza>_MOSTRAR` / `_LLM`). Las de intereses
# muestran el nombre de su dimensión; las «Otra» muestran la etiqueta del ítem: solo llevan `_LLM`.
PIEZAS_CON_ORIGEN = ('INTEL', 'HAB', 'BIEN-1', 'VAL-1', 'LOGRO-HAB', 'GUSTO', 'CUESTA', 'INI-OPCION', 'INI-RUTA',
                     'INI-DIA', 'INI-FRENO', 'INI-MITO')
PIEZAS_SOLO_ORIGEN_LLM = ('INT', 'OTRA-PERFIL', 'OTRA-INICIO')
GRUPOS_PIEZAS = ('INTERESES', 'TESTS', 'ANTES', 'CUESTA')

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
# Ajuste llm-sugerencias: a lo más una por campo de «lo que pienso»; el prompt pide 160 caracteres y el filtro
# acepta hasta 200.
MAXIMO_CARACTERES_PROMPT_GUION = 160
MAXIMO_CARACTERES_PREGUNTA_GUION = 200
