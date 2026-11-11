"""Lo fijo de la plataforma, sea cual sea la ruta: secciones, listas comunes, repreguntas por tipo
de criterio, temáticas, los instrumentos (RIASEC, inteligencias, habilidades sociales y el cuestionario de partida
y llegada) y el catálogo real (`datos/catalogo.py`).

Se carga en todo conjunto. La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from collections import Counter
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import (
    DIMENSIONES_RIASEC, GRUPOS_PIEZAS, INSTRUMENTO_HABILIDADES, INSTRUMENTO_INTELIGENCIAS, INSTRUMENTO_INTERESES,
    PIEZAS_CON_ORIGEN, PIEZAS_SOLO_ORIGEN_LLM, transformar_opcion_onet,
)
from datos import catalogo


# (código, nombre, audiencia). Cada ruta decide con sus reglas cuándo se abre cada sección.
SECCIONES = (('CATALOGO', 'Catálogo', 'ESTUDIANTE'), ('CHECK_IN', 'Check-in', 'ESTUDIANTE'),
             ('DIARIO', 'Diario', 'ESTUDIANTE'), ('FAMILIA', 'Familia', 'ESTUDIANTE'),
             ('PLANES', 'Planes', 'ESTUDIANTE'), ('CONVERSACIONES', 'Conversaciones', 'APODERADO'),
             ('INVESTIGACIONES', 'Investigaciones', 'ESTUDIANTE'),
             ('LIBRO_HELENA', 'El libro de Helena', 'ESTUDIANTE'))

# (código, texto). Preguntas que siempre van en el guion de una entrevista (B13); ajuste llm-sugerencias: cuatro.
PREGUNTAS_BASE_GUION = (('BASE-1', '¿Cómo es un día normal en tu trabajo?'),
                        ('BASE-2', '¿Qué estudiaste o aprendiste para llegar a donde estás?'),
                        ('BASE-3', '¿Qué es lo que más te gusta de tu trabajo y qué lo que menos?'),
                        ('BASE-4', '¿Qué consejo le darías a alguien de mi edad que quiere dedicarse a esto?'))

# (código, nombre, descripción, pregunta, comentario obligatorio, ícono). Reacciones a una entrevista (B13); el ícono
# es un nombre que el front traduce.
TIPOS_REACCION = (
    ('APRENDI', 'Aprendí algo', 'Me llevo una idea nueva sobre este trabajo.', '¿Qué aprendiste?', True, 'bombilla'),
    ('ME_GUSTO', 'Me gustó cómo se realizó', 'Las preguntas, la conversación, la edición.',
     '¿Qué te gustó de cómo la hicieron?', False, 'estrella'),
    ('CURIOSIDAD', 'Me dio curiosidad', 'Me quedé con una pregunta para esa persona.', '¿Qué le preguntarías tú?', True,
     'pregunta'),
    ('MI_CAMINO', 'Me hizo pensar en mi camino', 'Me movió algo sobre lo que yo quiero.',
     '¿En qué te hizo pensar?', True, 'caminos'),
)

# (código, audiencia). Presentaciones de primera visita: los ids de las vistas del estudiante en el front
# (`ov_frontend/src/lib/studentViews.ts`); el texto está en el front.
PRESENTACIONES = tuple((codigo, 'ESTUDIANTE') for codigo in (
    'activities', 'catalog-careers', 'catalog-detail', 'catalog-institutions', 'catalog-professions', 'central',
    'community', 'conversations', 'investigations', 'journal', 'journal-signals', 'missions', 'profile-decisions',
    'profile-general', 'profile-helena', 'research', 'research-guide', 'resources',
))

# Ajuste registros: textos de la plataforma iguales en todas las actividades (tabla `texto_fijo`).
TEXTOS_FIJOS = (
    ('LUMI_SENSIBLE', 'Gracias por contarme esto. No tienes que escribir más sobre eso aquí. Si quieres hablarlo '
                      'con alguien, tu orientadora o tu tutor están para eso.'),
    # Ajuste registros llm (lote 3): los mensajes de Lumi tras una respuesta `emocional` o que no se pudo evaluar.
    ('LUMI_EMOCIONAL', 'Gracias por contármelo. Se nota que esto te importa, y está bien que sea así. No hace falta '
                       'que escribas más ahora.'),
    ('LUMI_SIN_EVALUAR', 'Esta vez no llegué a escucharte bien. Tu respuesta quedó guardada; más adelante puedes '
                         'volver a enviarla, por si tengo algo que decirte.'),
    # Ajuste registros llm (lote 2), §4: las piezas que arma `app/services/registro/contexto.py`. Los grupos; el
    # origen que se muestra (`_MOSTRAR`) y el que va al LLM (`_LLM`, el que validó el runner en v7.8 y v7.12); y la
    # frase de cada dimensión de los tres tests (`PIEZA_FRASE_<dimensión>`), que es el texto de su pieza.
    ('PIEZA_GRUPO_INTERESES', 'Tu test de intereses'),
    ('PIEZA_GRUPO_TESTS', 'Tus otros tests'),
    ('PIEZA_GRUPO_ANTES', 'Lo que escribiste y elegiste antes'),
    ('PIEZA_GRUPO_CUESTA', 'Lo que te cuesta'),
    # El origen que se muestra de una pieza de intereses es el nombre de su dimensión (§4).
    ('PIEZA_ORIGEN_INT_LLM', 'tu test de intereses'),
    ('PIEZA_ORIGEN_INTEL_MOSTRAR', 'tu test de inteligencias'),
    ('PIEZA_ORIGEN_INTEL_LLM', 'tu test de inteligencias'),
    ('PIEZA_ORIGEN_HAB_MOSTRAR', 'tu test de habilidades'),
    ('PIEZA_ORIGEN_HAB_LLM', 'tu test de habilidades sociales'),
    ('PIEZA_ORIGEN_BIEN-1_MOSTRAR', '¿En qué te va mejor? (1.º)'),
    ('PIEZA_ORIGEN_BIEN-1_LLM', '¿En qué te va mejor? 1.º'),
    ('PIEZA_ORIGEN_VAL-1_MOSTRAR', '¿Qué valoras en un trabajo? (1.º)'),
    ('PIEZA_ORIGEN_VAL-1_LLM', 'lo que más valoras, 1.º'),
    ('PIEZA_ORIGEN_LOGRO-HAB_MOSTRAR', '¿Qué habilidades tuyas se notaron ahí?'),
    ('PIEZA_ORIGEN_LOGRO-HAB_LLM', 'la habilidad que usaste en tu logro'),
    ('PIEZA_ORIGEN_GUSTO_MOSTRAR', '¿Qué te encantaba hacer de niño o niña?'),
    ('PIEZA_ORIGEN_GUSTO_LLM', 'lo que te encantaba de niño'),
    ('PIEZA_ORIGEN_CUESTA_MOSTRAR', '¿Qué te cuesta?'),
    ('PIEZA_ORIGEN_CUESTA_LLM', 'lo que te cuesta'),
    ('PIEZA_ORIGEN_OTRA-PERFIL_LLM', 'otra cosa tuya'),
    ('PIEZA_ORIGEN_INI-OPCION_MOSTRAR', 'tu primera opción'),
    ('PIEZA_ORIGEN_INI-OPCION_LLM', 'tu primera opción'),
    ('PIEZA_ORIGEN_INI-RUTA_MOSTRAR', 'la ruta que querías al terminar el colegio'),
    ('PIEZA_ORIGEN_INI-RUTA_LLM', 'la ruta que querías al terminar el colegio'),
    ('PIEZA_ORIGEN_INI-DIA_MOSTRAR', 'tu día a los 23'),
    ('PIEZA_ORIGEN_INI-DIA_LLM', 'tu día a los 23'),
    ('PIEZA_ORIGEN_INI-FRENO_MOSTRAR', 'lo que dijiste que podía frenarte'),
    ('PIEZA_ORIGEN_INI-FRENO_LLM', 'lo que dijiste que podía frenarte'),
    ('PIEZA_ORIGEN_INI-MITO_MOSTRAR', 'una idea que habías escuchado o creído'),
    ('PIEZA_ORIGEN_INI-MITO_LLM', 'una idea que habías escuchado o creído'),
    ('PIEZA_ORIGEN_OTRA-INICIO_LLM', 'otra cosa que cambió'),
    # Frases de los tests: las que validó el runner (v7.8) y, las que no tenía, las del usuario (lote 2).
    ('PIEZA_FRASE_R', 'Trabajar con las manos, usar herramientas o máquinas'),
    ('PIEZA_FRASE_I', 'Observar, preguntar y analizar para entender cómo funcionan las cosas'),
    ('PIEZA_FRASE_A', 'Crear, imaginar y expresarte con libertad, sin reglas rígidas'),
    ('PIEZA_FRASE_S', 'Ayudar, enseñar, cuidar o acompañar a otras personas'),
    ('PIEZA_FRASE_E', 'Liderar, convencer, organizar proyectos y tomar decisiones'),
    ('PIEZA_FRASE_C', 'Ordenar información y seguir procedimientos claros'),
    ('PIEZA_FRASE_INT-LIN', 'Usas las palabras con eficacia, al hablar y al escribir'),
    ('PIEZA_FRASE_INT-LOG', 'Usas los números con eficacia y razonas con lógica'),
    ('PIEZA_FRASE_INT-ESP', 'Ver formas, planos y estructuras en tu cabeza'),
    ('PIEZA_FRASE_INT-CIN', 'Usas el cuerpo para expresar ideas y para resolver problemas o crear cosas'),
    ('PIEZA_FRASE_INT-MUS', 'Percibes, distingues y expresas formas musicales'),
    ('PIEZA_FRASE_INT-INTRA', 'Entiendes lo que te pasa y decides a partir de eso'),
    ('PIEZA_FRASE_INT-INTER', 'Captas los estados de ánimo y los sentimientos de los demás'),
    ('PIEZA_FRASE_HS-ASE', 'Defiendes tus derechos y dices lo que piensas sin ofender'),
    ('PIEZA_FRASE_HS-EMP', 'Te pones en el lugar del otro y comprendes lo que siente'),
    ('PIEZA_FRASE_HS-EXP', 'Reconoces lo que sientes y eliges el momento para decirlo'),
    ('PIEZA_FRASE_HS-RES', 'No quedarte tranquilo hasta resolver un problema'),
    ('PIEZA_FRASE_HS-LID', 'Organizas a un grupo y hablas en su nombre'),
)

# Código reservado para la opción «otra»; ninguna lista puede usarlo.
CODIGO_OTRA = 'OTRA'

# (código, nombre, ((código, texto), ...)). Listas comunes: se comparan entre actividades y tarjetas.
# Textos provisionales hasta la carga real (B02).
LISTAS_COMUNES = (
    ('RUTAS_DESPUES_COLEGIO', 'Rutas después del colegio',
     (('UNIVERSIDAD', 'Estudiar en una universidad'), ('INSTITUTO', 'Estudiar en un instituto'),
      ('TRABAJAR', 'Trabajar'), ('EMPRENDER', 'Emprender un negocio'), ('AUN_NO_SE', 'Aún no lo sé'))),
    # Ajuste registros: también la de `b1-7-freno`; se le agregan cuatro opciones al final, sin quitar ninguna.
    ('DIFICULTADES', 'Dificultades',
     (('ECONOMICAS', 'Económicas'), ('ACADEMICAS', 'Académicas'), ('FAMILIARES', 'Familiares'),
      ('INFORMACION', 'Falta de información'), ('DISTANCIA', 'Distancia'), ('NO_INGRESAR', 'No ingresar'),
      ('CAMBIAR_OPINION', 'Cambiar de opinión'), ('TIEMPO', 'El tiempo'),
      ('SALUD', 'Mi salud o la de alguien cercano'))),
    # B11 · Tarjeta de carrera. VALORES es también la lista del registro 2.3.
    ('VALORES', 'Valores',
     (('ESTABILIDAD', 'Estabilidad'), ('INGRESOS', 'Ingresos'), ('AYUDAR', 'Ayudar a otros'), ('CREAR', 'Crear'),
      ('AUTONOMIA', 'Autonomía'), ('RECONOCIMIENTO', 'Reconocimiento'), ('TIEMPO_FAMILIA', 'Tiempo para la familia'),
      ('APRENDER', 'Aprender'), ('COMUNIDAD', 'Aportar a mi comunidad'))),
    ('CAMINOS', 'Cómo llegaría a la carrera',
     (('POSTULAR_DIRECTO', 'Postular directamente'), ('PREPARARME', 'Prepararme primero'),
      ('ESTUDIAR_Y_TRABAJAR', 'Estudiar y trabajar'), ('TRABAJAR_PRIMERO', 'Trabajar primero y luego estudiar'),
      ('TECNICA_PRIMERO', 'Empezar con una técnica y continuar'), ('TOMARME_TIEMPO', 'Tomarme un tiempo'))),
    ('RUBROS_GASTO', 'Rubros de gasto',
     (('PREPARACION', 'Preparación'), ('ADMISION', 'Admisión'), ('MATRICULA', 'Matrícula'), ('PENSION', 'Pensión'),
      ('MATERIALES', 'Materiales'), ('TRANSPORTE', 'Transporte'), ('ALIMENTACION', 'Alimentación'),
      ('VIVIENDA', 'Vivienda'))),
    ('FINANCIAMIENTO', 'Cómo lo financiaría',
     (('FAMILIA', 'Apoyo de mi familia'), ('TRABAJO', 'Mi propio trabajo'), ('BECA', 'Beca (Beca 18 u otra)'),
      ('CREDITO', 'Crédito educativo'), ('AHORROS', 'Ahorros'), ('INSTITUCION', 'Apoyos de la institución'))),
    # El código del tipo de paso es el que recibe y devuelve el LLM de sugerencias.
    ('PASOS', 'Tipos de paso',
     (('investigar', 'Investigar'), ('conversar', 'Conversar con alguien'), ('visitar', 'Visitar'),
      ('curso', 'Llevar un curso'), ('practicar', 'Practicar'), ('otra', 'Otro'))),
    ('DUDAS_SUGERIDAS', 'Dudas sugeridas',
     (('POSTULANTES', '¿Cuántos postulan y cuántos ingresan?'),
      ('CURSOS_DIFICILES', '¿Qué cursos son los más difíciles?'),
      ('SUELDO_INICIAL', '¿Cuánto gana alguien que recién termina?'))),
    # Las cinco preguntas de conocimiento (códigos de `PreguntaConocimiento`) y la duda que crea cada una al
    # responder «más o menos» o «no»; `{carrera}` se reemplaza por el nombre. Textos de las preguntas provisionales.
    ('PREGUNTAS_CONOCIMIENTO', 'Qué tanto conozco la carrera',
     (('DIA_NORMAL', '¿Sabes cómo es un día normal de alguien de {carrera}?'),
      ('DONDE_TRABAJAR', '¿Sabes dónde podrías trabajar si estudias {carrera}?'),
      ('CURSOS', '¿Sabes qué cursos se llevan en {carrera}?'),
      ('INGRESO', '¿Sabes cómo se ingresa a {carrera}?'),
      ('CONOCE_ALGUIEN', '¿Conoces a alguien que estudie o trabaje en {carrera}?'))),
    # Ajuste registros: listas comunes de los registros definitivos (la «otra» la decide cada ítem).
    ('HABILIDADES', 'Habilidades',
     (('ORGANIZAR', 'Organizar'), ('EXPLICAR', 'Explicar o enseñar'), ('CREAR', 'Crear o diseñar'),
      ('RESOLVER', 'Resolver problemas'), ('PERSISTIR', 'Persistir'), ('LIDERAR', 'Liderar'),
      ('ESCUCHAR', 'Escuchar y acompañar'), ('NEGOCIAR', 'Negociar o convencer'), ('CONSTRUIR', 'Construir o armar'),
      ('INVESTIGAR', 'Investigar'))),
    ('PERSONAS', 'Personas',
     (('MAMA', 'Mamá'), ('PAPA', 'Papá'), ('HERMANO', 'Hermano/a'), ('ABUELO', 'Abuelo/a'),
      ('OTRO_FAMILIAR', 'Otro familiar'), ('PROFESOR', 'Profesor/a'), ('AMIGO', 'Amigo/a'), ('PAREJA', 'Pareja'))),
    # Un mito por cada uno de la ficha F05 y la batalla `b1-5`.
    ('MITOS', 'Mitos',
     (('PADRES_SABEN', 'Mis padres saben qué me conviene estudiar'),
      ('TEST_DECIDE', 'El test me dirá qué estudiar'),
      ('SOLO_UNIVERSIDAD', 'Solo la universidad da futuro'),
      ('GUSTO_GANA_POCO', 'Si estudio lo que me gusta voy a ganar poco'),
      ('CARRERA_DECIDE', 'La carrera decide toda mi vida'),
      ('TRABAJOS_GENERO', 'Hay trabajos de hombres y trabajos de mujeres'))),
    ('RUTAS', 'Rutas',
     (('UNIVERSIDAD', 'Universidad'), ('INSTITUTO', 'Instituto técnico'), ('TRABAJAR', 'Trabajar'),
      ('TRABAJAR_ESTUDIAR', 'Trabajar y estudiar'), ('PREPARARME', 'Prepararme un año'),
      ('FFAA_POLICIA', 'Fuerzas Armadas o Policía'), ('EMPRENDER', 'Emprender'))),
    ('CURSOS_ACTIVIDADES', 'Cursos y actividades',
     (('MATEMATICA', 'Matemática'), ('COMUNICACION', 'Comunicación'), ('CIENCIAS', 'Ciencias'),
      ('HISTORIA', 'Historia y sociales'), ('INGLES', 'Inglés'), ('ARTE', 'Arte'),
      ('DEPORTE', 'Educación física o deporte'), ('COMPUTACION', 'Computación'),
      ('TRABAJOS_GRUPO', 'Trabajos en grupo'), ('EXPONER', 'Exponer'), ('ORGANIZAR', 'Organizar actividades'))),
    # Ajuste registros llm (lote 2): la de b4-2-estilo, en el orden del texto; las que no cambian conservan su código.
    ('ESTILOS', 'Cómo decido',
     (('CALMA', 'Lo pienso con calma y comparo'), ('ULTIMO_MOMENTO', 'Lo dejo para el último momento'),
      ('LO_QUE_SIENTO', 'Me guío por lo que siento'), ('PREGUNTO', 'Pregunto a varias personas'),
      ('LO_QUE_ESPERAN', 'Termino haciendo lo que otros esperan'), ('BUSCO_INFO', 'Busco información antes'),
      ('RAPIDO_DUDO', 'Decido rápido y después dudo'), ('CUESTA_DESCARTAR', 'Me cuesta descartar opciones'),
      ('MIEDO', 'Me da miedo equivocarme'))),
    ('DUDAS_CONOCIMIENTO', 'Dudas de las preguntas de conocimiento',
     (('DIA_NORMAL', '¿Cómo es un día normal de alguien de {carrera}?'),
      ('DONDE_TRABAJAR', '¿Dónde podría trabajar si estudio {carrera}?'),
      ('CURSOS', '¿Qué cursos se llevan en {carrera}?'),
      ('INGRESO', '¿Cómo se ingresa a {carrera}?'),
      ('CONOCE_ALGUIEN', '¿A quién podría preguntarle sobre {carrera}?'))),
)

# B11 · Secciones de la tarjeta de carrera: (código, nombre, ¿cuenta para «listo para comparar»?). Cada ruta
# decide con reglas SECCION_PLAN cuándo se abre cada una.
SECCIONES_TARJETA = (('POR_QUE', 'Por qué', True), ('CONOCIMIENTO', 'Qué tanto la conozco', False),
                     ('REALIDAD', 'Qué tan real es', True), ('PASOS', 'Mis pasos', False))

# Rubros que el front propone en REALIDAD: (rubro, frecuencia recomendada, monto de referencia en soles o None si
# se consulta en la institución, en cero si la institución es pública, solo si el camino incluye prepararse).
# Alimentación y Vivienda no se proponen: el estudiante los agrega a mano.
REFERENCIAS_RUBROS = (('PREPARACION', 'UNICA', 1300, False, True), ('ADMISION', 'UNICA', 350, False, False),
                      ('MATRICULA', 'POR_CICLO', None, False, False), ('PENSION', 'MENSUAL', None, True, False),
                      ('MATERIALES', 'POR_CICLO', 300, False, False), ('TRANSPORTE', 'MENSUAL', 150, False, False))

# Caminos que incluyen prepararse antes de postular (precargan el rubro Preparación).
CAMINOS_CON_PREPARACION = ('PREPARARME',)

# (código, nombre, descripción). Las cinco dimensiones del cuestionario de partida y llegada (B07).
TEMATICAS = (
    ('A', 'Claridad', 'Qué tan claro tienes lo que quieres hacer después del colegio.'),
    ('B', 'Conocimiento de mí', 'Qué tanto reconoces tus intereses, habilidades y valores.'),
    ('C', 'Conocimiento de las opciones', 'Qué tanto conoces las carreras, los caminos y lo que piden.'),
    ('D', 'Decisión propia', 'Qué tanto sientes que la decisión es tuya y no de otros.'),
    ('E', 'Confianza', 'Qué tan seguro te sientes de poder tomar y sostener tu decisión.'),
)

# Cuestionario de punto de partida (ENTRADA) y de llegada (SALIDA): las mismas afirmaciones en cinco
# dimensiones, una por temática. Provisional hasta la carga real (B07): (temática, enunciado, inverso).
OPCIONES_ACUERDO = ('Nada de acuerdo', 'Poco de acuerdo', 'Bastante de acuerdo', 'Muy de acuerdo')
ENUNCIADOS_PARTIDA_LLEGADA = (
    ('A', 'Sé qué quiero hacer cuando termine el colegio.', False),
    ('A', 'Puedo explicar con mis palabras qué camino me atrae.', False),
    ('A', 'Tengo una o dos opciones que me interesan más que las demás.', False),
    ('A', 'Me siento perdido cuando pienso en lo que viene después del colegio.', True),
    ('B', 'Conozco las actividades que más disfruto.', False),
    ('B', 'Sé en qué soy bueno.', False),
    ('B', 'Sé qué es importante para mí en un trabajo.', False),
    ('B', 'Reconozco qué cosas no me gustaría hacer.', False),
    ('C', 'Conozco varias carreras o caminos que podría seguir.', False),
    ('C', 'Sé qué se estudia en las carreras que me interesan.', False),
    ('C', 'Sé dónde puedo estudiar lo que me interesa.', False),
    ('C', 'Conozco cuánto cuesta y cuánto dura lo que me interesa estudiar.', False),
    ('D', 'La decisión sobre mi futuro la tomo yo.', False),
    ('D', 'Puedo conversar con mi familia sobre lo que quiero.', False),
    ('D', 'Elijo pensando en lo que quiero y no solo en lo que otros esperan.', False),
    ('D', 'Busco información por mi cuenta antes de decidir.', False),
    ('E', 'Me siento capaz de tomar una buena decisión.', False),
    ('E', 'Si algo no sale como espero, sé que puedo buscar otro camino.', False),
    ('E', 'Confío en que podré lograr lo que me proponga.', False),
)

# Ajuste carga-instrumentos: instrumentos reales. Un instrumento nuevo es datos (ítems, escala, dimensiones y
# textos) y se carga con `_cargar_instrumento`; RIASEC y partida/llegada conservan sus funciones.

# Ajuste resultados-intereses: cómo leer el resultado y una línea de encuadre, por audiencia. Dicen cómo leerlo y
# qué cuidar, no cómo es el test (eso es `descripcion`). En el apoderado, `{nombre}` es el nombre del hijo y lo
# resuelve la consulta; Partida y llegada no se muestra al apoderado y deja sus textos vacíos.
# (mensaje_estudiante, lectura_estudiante, mensaje_apoderado, lectura_apoderado, mensaje_orientadora,
#  lectura_orientadora, guia_abierta)
TEXTOS_INSTRUMENTOS = {
    'TEST-RIASEC': (
        'Es una pista para explorar, no un veredicto.',
        'Tu código son los tres tipos de actividad que más te atrajeron, y las barras muestran cuánto resonó cada '
        'uno, de 0 a 100. Habla de gusto, no de talento: un tipo bajo no es algo que hagas mal. Las ocupaciones '
        'afines tienen un perfil de intereses parecido al tuyo y las familias de carreras son las que llevan a '
        'ellas. Explora también lo que no salió arriba: tus gustos cambian con lo que vas conociendo.',
        'Úselo para conversar con {nombre}, no para decidir por su hijo o hija.',
        'El código resume los tres tipos de actividad que más le atraen hoy a {nombre}, y las barras, cuánto le '
        'atrajo cada uno, de 0 a 100. Muestra gusto, no capacidad ni rendimiento: un puntaje bajo no cierra ninguna '
        'puerta y uno alto no obliga a nada. Las ocupaciones y familias de carreras son puntos de partida para '
        'explorar juntos, no una indicación de qué estudiar. Antes de opinar, pregúntele qué le sorprendió y qué no '
        'le representa, y evite descartar opciones solo por ingreso o prestigio sin conversarlas.',
        'Resultado exploratorio: insumo para la tutoría, no diagnóstico.',
        'Perfil de intereses RIASEC (Holland) en seis tipos, de 0 a 100. Las ocupaciones afines salen de comparar '
        'el perfil del estudiante con el de cada ocupación (porcentaje de parecido) y las familias de carreras, de '
        'las ocupaciones más afines. Es preferencia, no aptitud. Un perfil poco marcado o plano es información '
        '(intereses aún en formación), no un resultado fallido: conviene proponer experiencias antes que '
        'recomendar. Contrástelo con sus registros y con el cuestionario de partida y llegada.',
        False),
    'TEST-INTELIGENCIAS': (
        'Es una foto de hoy: todas se desarrollan.',
        'Las inteligencias que salen arriba son las formas de pensar y aprender en las que hoy te sientes más '
        'cómodo; las de abajo son las que usas menos, no las que te faltan. Ninguna vale más que otra. Úsalo para '
        'estudiar a tu manera y para saber qué te costará más en lo que elijas. Cada inteligencia trae ideas para '
        'practicarla.',
        'No mide la inteligencia de {nombre}: muestra cómo prefiere aprender.',
        'Muestra en qué formas de pensar y aprender se siente más cómodo hoy {nombre}, según cómo se ve. No es una '
        'medida de coeficiente intelectual ni de rendimiento escolar, y no conviene compararlo con las notas ni con '
        'hermanos o compañeros. Un puntaje bajo no es un defecto: todas se desarrollan con práctica. Sirve para '
        'entender cómo estudia mejor y acompañarle en casa; evite usarlo como etiqueta («no es de números»).',
        'Autopercepción de preferencias de aprendizaje; sin valor diagnóstico.',
        'Autopercepción basada en las inteligencias múltiples de Gardner. Las destacadas indican formas de aprender '
        'preferidas, no aptitudes medidas. Útil para sugerir estrategias de estudio y para contrastar con el test '
        'de intereses, que mide gusto. Cada dimensión trae actividades de desarrollo que pueden proponerse en '
        'tutoría.',
        True),
    'TEST-HABILIDADES': (
        'Se entrenan, como cualquier otra habilidad.',
        'Las habilidades que salen arriba son tus recursos de hoy para relacionarte con los demás; las de abajo, lo '
        'que puedes practicar. Es cómo te ves tú, no una nota sobre tu forma de ser, y cambia con las experiencias. '
        'Fíjate sobre todo en las de abajo: cada una trae por dónde empezar.',
        'Es cómo se ve {nombre} con los demás, no una evaluación de su conducta.',
        # `{habilidades}`: los nombres de las cinco dimensiones cargadas, para que el texto no se desalinee.
        'Muestra cómo se percibe {nombre} al relacionarse con otras personas en cinco habilidades: {habilidades}. '
        'Es su propia mirada, no un juicio sobre su carácter ni sobre cómo se porta en casa o en el colegio. Un '
        'puntaje bajo señala algo que puede practicar, no un problema. Lo más útil es preguntarle en qué '
        'situaciones se reconoce y acompañar sin corregir el resultado.',
        'Autoinforme: interprételo con el contexto del estudiante.',
        'Autopercepción del desempeño social en cinco habilidades. Es sensible a la deseabilidad social y al '
        'momento que vive el estudiante, y no reemplaza la conducta observada. No es tamizaje clínico: un puntaje '
        'bajo señala un área de trabajo en tutoría, no un problema. Cada dimensión trae actividades de desarrollo.',
        True),
    'TEST-PARTIDA-LLEGADA': (
        'Lo que cambió entre las dos páginas es tuyo.',
        'Cada dimensión te muestra en qué zona estabas al empezar la ruta y en cuál estás al terminarla, en '
        'palabras y sin puntajes. No dice si decides bien o mal: muestra cómo cambió tu forma de verlo. Lo que '
        'sigue por trabajar no es una falla; es lo que viene después del colegio.',
        '', '',
        'Medida antes y después: su valor está en el cambio.',
        'Mismas afirmaciones al inicio y al cierre de la ruta sobre claridad, conocimiento de sí, de las opciones, '
        'decisión propia y confianza. Lea el cambio entre las dos aplicaciones más que la zona aislada. Incluye la '
        'presión percibida del entorno, también de la familia: úselo en tutoría con criterio y sin exponer al '
        'estudiante frente a su familia.',
        False),
}
CAMPOS_TEXTOS = ('mensaje_estudiante', 'lectura_estudiante', 'mensaje_apoderado', 'lectura_apoderado',
                 'mensaje_orientadora', 'lectura_orientadora', 'guia_abierta')


def textos_instrumento(codigo: str, dimensiones=()) -> dict:
    """Columnas de textos por audiencia del instrumento; `{habilidades}` se arma con los nombres de sus
    dimensiones en orden («a, b y c»)."""
    nombres = [n[0].lower() + n[1:] for n in dimensiones]
    habilidades = ', '.join(nombres[:-1]) + ' y ' + nombres[-1] if len(nombres) > 1 else ''.join(nombres)
    return {campo: valor.replace('{habilidades}', habilidades) if isinstance(valor, str) else valor
            for campo, valor in zip(CAMPOS_TEXTOS, TEXTOS_INSTRUMENTOS[codigo])}


# (descripción, ejemplos, fortalezas). Un interés no se «desarrolla»: RIASEC no lleva `desarrollo`.
TEXTOS_RIASEC = {
    'R': ('Te atraen las actividades prácticas: trabajar con las manos, usar herramientas o máquinas y estar al aire '
          'libre.',
          'reparar o armar objetos, cultivar, construir, manejar equipos o trabajar al aire libre.',
          ('ser práctico y persistente: resolver con hechos, no con palabras',
           'preferir trabajar por tu cuenta, sin tener que dirigir ni destacar',
           'manejar herramientas, máquinas, materiales o animales',
           'sentirte a gusto en el campo, el taller, la obra o la cancha más que en una oficina')),
    'I': ('Te atrae observar, preguntar y analizar para entender cómo y por qué funcionan las cosas.',
          'hacer experimentos, resolver acertijos, investigar un tema o entender cómo funciona algo.',
          ('preferir pensar antes que actuar: observar, analizar, comprobar',
           'trabajar con ideas, datos y símbolos',
           'ser curioso y creativo para resolver problemas',
           'rendir mejor en un laboratorio, una biblioteca o un centro de investigación que dirigiendo gente')),
    'A': ('Te atrae crear, imaginar y expresarte con libertad, sin reglas rígidas.',
          'dibujar, escribir, actuar, componer, diseñar o crear contenido.',
          ('expresar sentimientos, emociones e imaginación en lo que haces',
           'usar muchos medios: la palabra, la imagen, el sonido, el cuerpo',
           'relacionarte con los demás a través de tus creaciones',
           'preferir el tiempo de crear y reflexionar antes que las rutinas y las reglas fijas')),
    'S': ('Te atrae ayudar, enseñar, cuidar o acompañar a otras personas.',
          'enseñar a alguien, cuidar, escuchar, hacer voluntariado o trabajar en equipo.',
          ('disfrutar el trabajo con personas',
           'enseñar, orientar y acompañar',
           'manejar grupos: conversar, debatir, escuchar',
           'sentirte a gusto en colegios, consultorios y servicios a la comunidad')),
    'E': ('Te atrae liderar, convencer, organizar proyectos y tomar decisiones.',
          'dirigir un grupo, convencer, vender una idea u organizar un evento.',
          ('expresar tus ideas con facilidad y convencer',
           'organizar y dirigir grupos, y sobresalir',
           'preferir la acción y los resultados antes que la teoría',
           'interesarte por los negocios, lo económico y las metas ambiciosas')),
    'C': ('Te atrae ordenar información, seguir procedimientos claros y trabajar con datos de forma precisa.',
          'ordenar información, llevar registros, planificar con detalle o trabajar con números.',
          ('ser ordenado, eficiente y responsable',
           'cumplir normas y procedimientos con precisión',
           'trabajar con datos, registros y números',
           'sentirte a gusto en oficinas, administración y comercio, donde se valora la exactitud')),
}

# O*NET Interest Profiler Short Form: los 10 ítems de cada tipo en el orden del formulario en papel (k = 1…10).
# `_cargar_riasec` los reparte con PATRON_RIASEC: el k-ésimo ocupa el número 12·⌊(k−1)/2⌋ + 2·pos + (k−1) mod 2 + 1.
ENUNCIADOS_RIASEC = {
    'R': ('Construir gabinetes de cocina', 'Conducir un camión para entregar paquetes a oficinas y casas',
          'Colocar ladrillos o baldosas', 'Probar la calidad de piezas antes del envío',
          'Reparar electrodomésticos del hogar', 'Reparar e instalar cerraduras', 'Criar peces en un criadero',
          'Instalar y operar máquinas para fabricar productos', 'Ensamblar piezas electrónicas',
          'Apagar incendios forestales'),
    'I': ('Desarrollar un nuevo medicamento', 'Investigar la causa de un incendio',
          'Estudiar formas de reducir la contaminación del agua', 'Desarrollar un método para predecir mejor el clima',
          'Realizar experimentos químicos', 'Trabajar en un laboratorio de biología',
          'Estudiar el movimiento de los planetas', 'Inventar un reemplazo para el azúcar',
          'Examinar muestras de sangre con un microscopio', 'Hacer pruebas de laboratorio para identificar enfermedades'),
    'A': ('Escribir libros u obras de teatro', 'Pintar la escenografía de una obra de teatro',
          'Tocar un instrumento musical', 'Escribir guiones para películas o programas de televisión',
          'Componer o arreglar música', 'Bailar jazz o tap', 'Dibujar', 'Cantar en una banda',
          'Crear efectos especiales para películas', 'Editar películas'),
    'S': ('Enseñar a una persona una rutina de ejercicios', 'Enseñar a los niños a practicar deportes',
          'Ayudar a personas con problemas personales o emocionales', 'Enseñar lengua de señas a personas sordas',
          'Dar orientación vocacional a las personas', 'Ayudar a conducir una sesión de terapia grupal',
          'Realizar terapia de rehabilitación', 'Cuidar niños en una guardería',
          'Hacer trabajo voluntario en una organización sin fines de lucro', 'Enseñar en una clase de secundaria'),
    'E': ('Comprar y vender acciones y bonos', 'Negociar contratos comerciales', 'Administrar una tienda minorista',
          'Representar a un cliente en un juicio', 'Dirigir un salón de belleza o barbería',
          'Comercializar una nueva línea de ropa', 'Administrar un departamento dentro de una empresa grande',
          'Vender productos en una tienda por departamentos', 'Iniciar tu propio negocio',
          'Administrar una tienda de ropa'),
    'C': ('Desarrollar una hoja de cálculo usando software de computadora', 'Calcular los salarios de los empleados',
          'Revisar registros o formularios', 'Hacer inventario con un dispositivo portátil',
          'Instalar software en una red de computadoras', 'Registrar pagos de alquiler', 'Usar una calculadora',
          'Mantener registros de inventario', 'Llevar registros de envíos y recepciones',
          'Clasificar, ordenar y distribuir correspondencia en una organización'),
}


@dataclass(frozen=True)
class DefinicionInstrumento:
    """Un instrumento como datos. `dimensiones`: (código, nombre, descripción, ejemplos, fortalezas, desarrollo), en
    orden. `items`: (dimensión, enunciado, inverso), con `numero` = posición. `opciones`: (etiqueta, puntaje) por
    `orden`."""
    codigo: str
    nombre: str
    descripcion: str
    tipo_resultado: modelos.TipoResultado
    escala: tuple[str, str]
    opciones: tuple[tuple[str, float], ...]
    dimensiones: tuple[tuple[str, str, str, str | None, tuple[str, ...], tuple[str, ...]], ...]
    prefijo_item: str
    items: tuple[tuple[str, str, bool], ...]
    aplicacion: tuple[str, str]


# Test de las inteligencias múltiples (H. Gardner), 35 afirmaciones. «No estoy seguro» vale medio punto
# (adaptación aprobada: la duda es una respuesta legítima).
INTELIGENCIAS = DefinicionInstrumento(
    codigo='TEST-INTELIGENCIAS', nombre='Test de las inteligencias múltiples',
    descripcion='Descubre cuáles de las siete inteligencias usas más hoy y cómo aprendes y resuelves mejor.',
    tipo_resultado=modelos.TipoResultado.DESTACADAS,
    escala=('ESC-VERDAD3', 'Verdadero, falso o no estoy seguro'),
    opciones=(('Falso', 0), ('No estoy seguro', 0.5), ('Verdadero', 1)),
    dimensiones=(
        ('INT-LIN', 'Verbal-lingüística',
         'Usas las palabras con eficacia, al hablar y al escribir: traduces lo que piensas en palabras precisas, '
         'sea en una conversación, un debate o una carta.',
         'te fijas en cómo están dichas las cosas y no solo en qué dicen, te sale fácil redactar un trabajo o un '
         'mensaje delicado, recuerdas frases exactas de lo que leíste o escuchaste o prefieres explicar algo con '
         'palabras antes que mostrarlo.',
         ('expresar con precisión lo que piensas', 'entender rápido lo que lees y escuchas',
          'argumentar y convencer con palabras', 'disfrutar escribir y contar'),
         ('elige una palabra del diccionario al azar y úsala en situaciones normales',
          'propicia un debate amistoso sobre un tema: pregunta, discute, escucha',
          'prepara una presentación oral sobre algo que te interese: un hobby, un libro, alguien que conoces')),
        ('INT-LOG', 'Lógico-matemática',
         'Usas los números con eficacia y razonas con lógica: encuentras patrones y conexiones entre datos, como en '
         'el pensamiento científico.',
         'detectas cuando un argumento no cierra, resuelves un problema por pasos antes de pedir ayuda, sabes al '
         'toque si el vuelto está bien o te gusta ordenar las cosas con un criterio.',
         ('calcular y estimar con rapidez', 'detectar patrones y relaciones', 'razonar paso a paso y comprobar',
          'encontrar conexiones entre datos sueltos'),
         ('toma doce objetos al azar y crea un criterio para clasificarlos (color, forma, tamaño, uso)',
          'prepara un argumento lógico y convincente para algo ridículo',
          'inventa una secuencia de números con un patrón escondido y ve si otro lo descubre')),
        ('INT-ESP', 'Visual-espacial',
         'Percibes el mundo visual y espacial con precisión y te formas un modelo mental de él: imaginas, dibujas, '
         'decoras y te mueves en el espacio con ese mapa en la cabeza.',
         'recuerdas lugares y caras mejor que nombres, notas cuando algo está desalineado o mal combinado, armas un '
         'rompecabezas o un mueble con facilidad o imaginas cómo quedaría un cuarto antes de mover nada.',
         ('imaginar objetos y lugares en tres dimensiones', 'captar color, forma y proporción',
          'orientarte y leer mapas y planos', 'expresar ideas con dibujos y esquemas'),
         ('mira las nubes con amigos y busca animales o caras escondidas',
          'imagina con detalle que vives en otra época o conversas con un personaje histórico',
          'organiza una búsqueda del tesoro y dibuja el mapa para que otros lo sigan')),
        ('INT-CIN', 'Corporal-cinestésica',
         'Usas el cuerpo para expresar ideas y sentimientos y para resolver problemas o crear cosas: equilibrio, '
         'coordinación y destreza con las manos.',
         'aprendes un movimiento con verlo una vez, pruebas las cosas con las manos antes de leer cómo se hacen, te '
         'cuesta quedarte quieto cuando piensas o imitas gestos y posturas sin esfuerzo.',
         ('coordinación, equilibrio y velocidad', 'aprender haciendo más que escuchando',
          'habilidad manual para armar, reparar o crear', 'expresar emociones con el cuerpo'),
         ('camina, baila o trota según tu estado de ánimo, y prueba a cambiarlo con el movimiento',
          'usa la mano que no sueles usar para lavarte los dientes o abotonarte',
          'representa con mímica una idea, una opinión o un sentimiento')),
        ('INT-MUS', 'Musical-rítmica',
         'Percibes, distingues y expresas formas musicales: la música te calma o te activa, se te queda en la '
         'cabeza y la usas para expresarte.',
         'reconoces una canción con los primeros segundos, te molesta cuando alguien desafina, te concentras mejor '
         'con música o inventas ritmos con lo que tengas a mano.',
         ('captar ritmo, melodía y tono con facilidad', 'memorizar mejor lo que tiene sonido o ritmo',
          'distinguir matices de voz y sonido', 'expresarte a través de la música'),
         ('escucha unos minutos de cada tipo de música que tengas y anota qué sentimientos, imágenes o recuerdos '
          'te trae',
          'expresa un sentimiento (miedo, alegría, rabia) solo con la voz, cambiando volumen, tono y timbre',
          'lee una historia y ponle efectos de sonido, como en los antiguos programas de radio')),
        ('INT-INTRA', 'Intrapersonal',
         'Te comprendes a ti mismo y actúas a partir de eso: reconoces tus sentimientos y tu forma de pensar, y '
         'sabes cuáles son tus lados brillantes y cuáles los opacos.',
         'te das cuenta de cuándo necesitas parar, decides sin dejarte arrastrar por el grupo, tienes claro qué es '
         'importante para ti aunque otros no lo compartan o prefieres entender un error tuyo antes que taparlo.',
         ('saber cómo te sientes y por qué', 'conocer tus virtudes y tus límites',
          'ponerte metas propias y sostenerlas', 'aprender de lo que te pasa'),
         ('dibuja la curva de tu ánimo durante un día, con sus puntos altos, bajos y medios, y anota qué pasó en '
          'cada uno',
          'anota los hechos importantes del día y expresa lo que sentiste con pintura, música o un poema',
          'obsérvate como si fueras otra persona: qué patrón aparece cuando te enojas, te distraes o te pones '
          'nervioso')),
        ('INT-INTER', 'Interpersonal',
         'Captas con rapidez los estados de ánimo, intenciones y sentimientos de los demás y respondes a ellos: '
         'empatía y trabajo en equipo, sin perder lo tuyo.',
         'calmas una discusión entre amigos, sabes a quién pedirle qué en un trabajo en grupo, la gente nueva se te '
         'acerca con facilidad o te buscan para contarte sus cosas.',
         ('leer el ánimo y las intenciones de los demás', 'escuchar y responder con empatía',
          'trabajar en equipo y llegar a acuerdos', 'convencer e influir en positivo'),
         ('pregunta y escucha antes de opinar',
          'súmate a un equipo, un voluntariado o la organización de algo',
          'fíjate en gestos y tono de voz, no solo en palabras')),
    ),
    prefijo_item='INTEL',
    items=(
        ('INT-ESP', 'Prefiero hacer un mapa que explicarle a alguien cómo tiene que llegar a un lugar determinado.', False),
        ('INT-INTRA', 'Si estoy enojado o contento, generalmente sé la razón exacta de por qué es así.', False),
        ('INT-MUS', 'Sé tocar, o antes sabía, un instrumento musical.', False),
        ('INT-MUS', 'Asocio la música con mis estados de ánimo.', False),
        ('INT-LOG', 'Puedo sumar o multiplicar mentalmente con mucha rapidez.', False),
        ('INT-INTRA', 'Puedo ayudar a un amigo/a a manejar y controlar sus sentimientos, porque yo lo pude hacer '
                      'antes con sentimientos parecidos.', False),
        ('INT-LOG', 'Me gusta trabajar con calculadora y computadoras.', False),
        ('INT-CIN', 'Aprendo rápidamente a bailar un baile nuevo.', False),
        ('INT-LIN', 'No me es difícil decir lo que pienso durante una discusión o debate.', False),
        ('INT-LIN', 'Disfruto de una buena charla o exposición.', False),
        ('INT-ESP', 'Siempre distingo el norte del sur, esté donde esté.', False),
        ('INT-INTER', 'Me gusta reunir grupos de personas en una fiesta o evento especial.', False),
        ('INT-MUS', 'Realmente la vida me parece vacía sin música.', False),
        ('INT-ESP', 'Siempre entiendo los gráficos que vienen en las instrucciones de equipos o instrumentos.', False),
        ('INT-LOG', 'Me gusta resolver puzzles y entretenerme con juegos electrónicos.', False),
        ('INT-CIN', 'Me fue fácil aprender a andar en bicicleta o patines.', False),
        ('INT-LIN', 'Me enojo cuando escucho una discusión o una afirmación que me parece ilógica o absurda.', False),
        ('INT-INTER', 'Soy capaz de convencer a otros de que sigan mis planes o ideas.', False),
        ('INT-CIN', 'Tengo buen sentido del equilibrio y de la coordinación.', False),
        ('INT-LOG', 'A menudo puedo captar relaciones entre números con mayor rapidez y facilidad que algunos de '
                    'mis compañeros.', False),
        ('INT-CIN', 'Me gusta construir modelos, maquetas o hacer esculturas.', False),
        ('INT-LIN', 'Soy bueno para encontrar el significado preciso de las palabras.', False),
        ('INT-ESP', 'Puedo mirar un objeto de una manera y con la misma facilidad verlo dado vuelta o al revés.', False),
        ('INT-MUS', 'Con frecuencia establezco la relación que puede haber entre una música o canción y algo que '
                    'haya ocurrido en mi vida.', False),
        ('INT-LOG', 'Me gusta trabajar con números y figuras.', False),
        ('INT-INTRA', 'Me gusta sentarme muy callado y pensar, reflexionar sobre mis sentimientos más íntimos.', False),
        ('INT-ESP', 'Solo con mirar las formas de las construcciones y estructuras me siento a gusto.', False),
        ('INT-MUS', 'Cuando estoy en la ducha, o cuando estoy solo, me gusta tararear, cantar o silbar.', False),
        ('INT-CIN', 'Soy bueno para el atletismo.', False),
        ('INT-LIN', 'Me gusta escribir cartas largas a mis amigos.', False),
        ('INT-INTRA', 'Generalmente me doy cuenta de la expresión o los gestos que tengo en la cara.', False),
        ('INT-INTER', 'Muchas veces me doy cuenta de las expresiones o gestos en la cara de las otras personas.', False),
        ('INT-INTRA', 'Reconozco mis estados de ánimo, no me cuesta identificarlos.', False),
        ('INT-INTER', 'Me doy cuenta de los estados de ánimo de las personas con quienes me encuentro.', False),
        ('INT-INTER', 'Me doy cuenta bastante bien de lo que los otros piensan de mí.', False),
    ),
    aplicacion=('APL-INTELIGENCIAS', 'Inteligencias'),
)

# Inventario «Mi comportamiento con los demás» (Burga, 2000), 24 afirmaciones. Los ítems 3 y 8 (esconder los
# sentimientos) y 5 y 20 (no sentirse líder) están redactados al revés de su habilidad: van inversos.
HABILIDADES = DefinicionInstrumento(
    codigo='TEST-HABILIDADES', nombre='Mi comportamiento con los demás',
    descripcion='Descubre cómo te relacionas con los demás y qué habilidades sociales tienes más a mano hoy.',
    tipo_resultado=modelos.TipoResultado.DESTACADAS,
    escala=('ESC-CASI2', 'Casi siempre o casi nunca'),
    opciones=(('Casi nunca', 0), ('Casi siempre', 1)),
    dimensiones=(
        ('HS-ASE', 'Asertividad',
         'Defiendes tus derechos y dices lo que piensas sin ofender: puedes decir «no», expresar una queja con calma '
         'y escuchar cuando toca.',
         'pides que te expliquen una nota que te parece injusta, dices que no a un plan sin inventar excusas, pones '
         'un límite cuando alguien se pasa contigo o escuchas una crítica sin ponerte a la defensiva.',
         ('decir lo que piensas sin ofender', 'decir «no» cuando no estás de acuerdo',
          'reclamar con calma cuando algo es injusto', 'hacerte respetar sin pasar sobre nadie'),
         ('practica decir «no» en cosas pequeñas', 'habla en primera persona: «yo pienso», «a mí me molesta»',
          'antes de reclamar, respira y di solo el hecho y lo que pides')),
        ('HS-EMP', 'Empatía',
         'Te pones en el lugar del otro y comprendes lo que siente, tanto con la emoción como con la cabeza.',
         'te das cuenta de que un compañero anda mal aunque no lo diga, entiendes por qué alguien reaccionó así '
         'aunque no estés de acuerdo, te afecta lo que les pasa a otros o te quedas a acompañar a quien lo necesita.',
         ('notar cuando alguien está triste o preocupado', 'comprender antes de juzgar',
          'inspirar confianza: la gente te cuenta sus cosas', 'ayudar sin que te lo pidan'),
         ('pregunta «¿cómo te sientes?» y escucha sin interrumpir',
          'intenta explicar la postura del otro con tus palabras', 'fíjate en lo no verbal: gestos, silencios')),
        ('HS-EXP', 'Expresión de sentimientos',
         'Reconoces lo que sientes, identificas de dónde viene y eliges el momento para decirlo a la persona indicada.',
         'puedes decir «estoy molesto» sin estallar, sabes explicar qué te puso así, eliges el momento para hablar en '
         'vez de soltarlo en caliente o la gente sabe cómo estás sin tener que adivinarlo.',
         ('reconocer qué emoción sientes', 'identificar de dónde viene', 'elegir el momento y la persona para decirlo',
          'ser honesto con lo que sientes'),
         ('ponle nombre a lo que sientes: alegría, fastidio, miedo', 'escríbelo antes de decirlo',
          'dilo a tiempo, con calma y a quien corresponde')),
        ('HS-RES', 'Resolución de problemas',
         'Analizas una situación difícil, identificas sus causas y buscas con creatividad la mejor salida.',
         'cuando algo sale mal buscas qué pasó en vez de a quién culpar, propones una salida cuando el grupo se '
         'traba, piensas en qué podría fallar antes de empezar o sigues probando alternativas hasta que funciona.',
         ('analizar el problema antes de actuar', 'identificar causas y consecuencias',
          'buscar alternativas con creatividad', 'no soltar hasta resolverlo'),
         ('escribe el problema en una frase y sus posibles causas', 'lista tres salidas antes de elegir una',
          'revisa después qué funcionó y qué no')),
        ('HS-LID', 'Liderazgo',
         'Actúas en representación de otros y diriges grupos: planificas, orientas y guías con creatividad ante lo '
         'nuevo.',
         'te eligen para hablar por el grupo, organizas quién hace qué en un trabajo, mantienes al grupo animado '
         'cuando algo se complica o pones orden cuando una discusión se desvía.',
         ('tomar la iniciativa', 'planificar y orientar al grupo', 'convencer con ideas, no con imposición',
          'manejar las fricciones del grupo'),
         ('ofrécete a coordinar algo pequeño: un trabajo, una actividad',
          'reparte tareas y pregunta cómo va cada uno', 'ante un desacuerdo, busca lo que une al grupo')),
    ),
    prefijo_item='HSOC',
    items=(
        ('HS-ASE', 'Digo siempre lo que pienso en la mayoría de situaciones.', False),
        ('HS-EMP', 'Por ningún motivo está bien causarle daño a otra persona.', False),
        ('HS-EXP', 'La mayoría de personas no se da cuenta cuando me hiere, porque escondo mis verdaderos '
                   'sentimientos.', True),
        ('HS-EXP', 'Me gusta ayudar a mis amigos/as para que tomen decisiones.', False),
        ('HS-LID', 'No estoy seguro/a de que pueda ser un buen líder.', True),
        ('HS-RES', 'Participo en actividades que involucran la resolución de problemas.', False),
        ('HS-EMP', 'Si un amigo/a es incapaz de cumplir con lo que me promete, seguramente lo comprendería en vez de '
                   'enojarme.', False),
        ('HS-EXP', 'Cuando alguien cercano y respetado me molesta, generalmente escondo mis sentimientos.', True),
        ('HS-LID', 'Disfruto participando en una buena discusión.', False),
        ('HS-ASE', 'Me aseguro de que la gente sepa cuál es mi posición frente a una injusticia.', False),
        ('HS-EMP', 'Creo que uno puede salir adelante en la vida sin tener que pasar sobre los demás.', False),
        ('HS-EXP', 'Le digo a una persona cuando me parece que ha sido injusta.', False),
        ('HS-RES', 'Me adelanto a las consecuencias cuando surgen problemas.', False),
        ('HS-LID', 'Puedo convencer a otros/as de que mis ideas son correctas.', False),
        ('HS-ASE', 'Es muy importante para mí ser capaz de decir lo que pienso.', False),
        ('HS-EMP', 'Mis amigos/as me buscan para contarme sus cosas.', False),
        ('HS-RES', 'No me quedo tranquilo/a hasta resolver un problema.', False),
        ('HS-LID', 'En la mayoría de las situaciones, prefiero participar antes que escuchar solamente.', False),
        ('HS-ASE', 'Si después de salir de una tienda me doy cuenta de que me han dado menos vuelto, vuelvo y pido '
                   'el dinero que falta.', False),
        ('HS-LID', 'Rara vez tomo el liderazgo en la organización de un proyecto.', True),
        ('HS-ASE', 'Doy a conocer mi punto de vista, aun si alguien a quien respeto dijera algo distinto.', False),
        ('HS-EMP', 'Me resulta fácil ayudar a mis amigos/as.', False),
        ('HS-EXP', 'Trato de ser honesto/a acerca de mis verdaderos sentimientos.', False),
        ('HS-RES', 'Identifico las causas de algún problema.', False),
    ),
    aplicacion=('APL-HABILIDADES', 'Habilidades sociales'),
)
INSTRUMENTOS = (INTELIGENCIAS, HABILIDADES)

PATRON_RIASEC = 'RRIIAASSEECC'
OPCIONES_LIKERT = ('Me disgusta mucho', 'Me disgusta', 'No estoy seguro', 'Me gusta', 'Me gusta mucho')


@dataclass(frozen=True)
class Fijos:
    """Lo que la ruta necesita de lo fijo para unir actividades, instrumentos y reglas."""
    aplicaciones: dict[str, modelos.Aplicacion]
    items: dict[str, dict[int, modelos.ItemInstrumento]]
    secciones: dict[str, modelos.Seccion]
    listas: dict[str, modelos.ListaOpciones]
    tematicas: dict[str, modelos.Tematica]
    secciones_tarjeta: dict[str, modelos.SeccionTarjeta]


def _ms_respuesta(opciones) -> int:
    """Aviso de velocidad: decidir y los dos toques (la opción y «Continuar»), según las opciones de la escala."""
    return 800 if len(opciones) == 2 else 1200


def _cargar_riasec(sesion):
    instrumento = modelos.Instrumento(codigo='TEST-RIASEC', nombre='Test de intereses',
        descripcion='Descubre qué tipo de actividades te atraen y qué ocupaciones se parecen a ti.',
        tipo_resultado=modelos.TipoResultado.COINCIDENCIAS, ms_respuesta=_ms_respuesta(OPCIONES_LIKERT),
        **textos_instrumento('TEST-RIASEC'))
    escala = modelos.EscalaRespuesta(codigo='ESC-LIKERT5', nombre='Preferencia en cinco opciones')
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta,
                                      puntaje=transformar_opcion_onet(n))
                   for n, etiqueta in enumerate(OPCIONES_LIKERT, start=1))
    dimensiones = {c: modelos.Dimension(codigo=c, nombre=n, instrumento_id=instrumento.id, orden=orden,
                                        descripcion=TEXTOS_RIASEC[c][0], ejemplos=TEXTOS_RIASEC[c][1],
                                        fortalezas=list(TEXTOS_RIASEC[c][2]), desarrollo=[])
                   for orden, (c, n) in enumerate(DIMENSIONES_RIASEC, start=1)}
    aplicacion = modelos.Aplicacion(codigo='APL-RIASEC', nombre='Intereses', instrumento_id=instrumento.id,
                                    momento=modelos.MomentoAplicacion.UNICA)
    sesion.add_all([*dimensiones.values(), aplicacion])
    sesion.flush()
    items = {}
    for numero in range(1, 61):
        dimension = PATRON_RIASEC[(numero - 1) % 12]
        indice = 2 * ((numero - 1) // 12) + ((numero - 1) % 12) % 2
        items[numero] = modelos.ItemInstrumento(codigo=f'RIASEC-{numero:02}', numero=numero,
            enunciado=ENUNCIADOS_RIASEC[dimension][indice], instrumento_id=instrumento.id,
            dimension_id=dimensiones[dimension].id, escala_id=escala.id, inverso=False)
    sesion.add_all(items.values())
    sesion.flush()
    return dimensiones, aplicacion, items


def _cargar_instrumento(sesion, definicion: DefinicionInstrumento):
    """Carga cualquier instrumento definido como datos; devuelve su aplicación y sus ítems por número."""
    instrumento = modelos.Instrumento(codigo=definicion.codigo, nombre=definicion.nombre,
        descripcion=definicion.descripcion, tipo_resultado=definicion.tipo_resultado,
        ms_respuesta=_ms_respuesta(definicion.opciones),
        **textos_instrumento(definicion.codigo, [n for _, n, *_ in definicion.dimensiones]))
    escala = modelos.EscalaRespuesta(codigo=definicion.escala[0], nombre=definicion.escala[1])
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta, puntaje=puntaje)
                   for n, (etiqueta, puntaje) in enumerate(definicion.opciones, start=1))
    dimensiones = {c: modelos.Dimension(codigo=c, nombre=n, descripcion=d, ejemplos=e, fortalezas=list(f),
                                        desarrollo=list(m), instrumento_id=instrumento.id, orden=orden)
                   for orden, (c, n, d, e, f, m) in enumerate(definicion.dimensiones, start=1)}
    aplicacion = modelos.Aplicacion(codigo=definicion.aplicacion[0], nombre=definicion.aplicacion[1],
                                    instrumento_id=instrumento.id, momento=modelos.MomentoAplicacion.UNICA)
    sesion.add_all([*dimensiones.values(), aplicacion])
    sesion.flush()
    items = {numero: modelos.ItemInstrumento(codigo=f'{definicion.prefijo_item}-{numero:02}', numero=numero,
                                             enunciado=enunciado, instrumento_id=instrumento.id,
                                             dimension_id=dimensiones[dimension].id, escala_id=escala.id,
                                             inverso=inverso)
             for numero, (dimension, enunciado, inverso) in enumerate(definicion.items, start=1)}
    sesion.add_all(items.values())
    sesion.flush()
    return aplicacion, items


def _cargar_tematicas(sesion):
    tematicas = {c: modelos.Tematica(codigo=c, nombre=n, descripcion=d, orden=orden)
                 for orden, (c, n, d) in enumerate(TEMATICAS, start=1)}
    sesion.add_all(tematicas.values())
    sesion.flush()
    return tematicas


def _cargar_partida_llegada(sesion, tematicas):
    instrumento = modelos.Instrumento(codigo='TEST-PARTIDA-LLEGADA', nombre='Punto de partida y de llegada',
        descripcion='Las mismas afirmaciones al inicio y al cierre, para ver cuánto cambiaste.',
        tipo_resultado=modelos.TipoResultado.COMPARACION, ms_respuesta=_ms_respuesta(OPCIONES_ACUERDO),
        **textos_instrumento('TEST-PARTIDA-LLEGADA'))
    escala = modelos.EscalaRespuesta(codigo='ESC-ACUERDO4', nombre='Acuerdo en cuatro opciones')
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta, puntaje=n)
                   for n, etiqueta in enumerate(OPCIONES_ACUERDO, start=1))
    dimensiones = {c: modelos.Dimension(codigo=f'AUTO-{c}', nombre=t.nombre, descripcion=t.descripcion,
                                        instrumento_id=instrumento.id, orden=t.orden, tematica_id=t.id)
                   for c, t in tematicas.items()}
    aplicaciones = [modelos.Aplicacion(codigo='APL-PARTIDA', nombre='Punto de partida', instrumento_id=instrumento.id,
                                       momento=modelos.MomentoAplicacion.ENTRADA),
                    modelos.Aplicacion(codigo='APL-LLEGADA', nombre='Punto de llegada', instrumento_id=instrumento.id,
                                       momento=modelos.MomentoAplicacion.SALIDA)]
    sesion.add_all([*dimensiones.values(), *aplicaciones])
    sesion.flush()
    items = {numero: modelos.ItemInstrumento(codigo=f'AUTO-{numero:02}', numero=numero, enunciado=enunciado,
                                             instrumento_id=instrumento.id, dimension_id=dimensiones[tematica].id,
                                             escala_id=escala.id, inverso=inverso)
             for numero, (tematica, enunciado, inverso) in enumerate(ENUNCIADOS_PARTIDA_LLEGADA, start=1)}
    sesion.add_all(items.values())
    sesion.flush()
    return aplicaciones, items


def _cargar_secciones(sesion):
    secciones = {c: modelos.Seccion(codigo=c, nombre=n, audiencia=modelos.Audiencia(a)) for c, n, a in SECCIONES}
    sesion.add_all(secciones.values())
    sesion.flush()
    return secciones


def _cargar_presentaciones(sesion):
    sesion.add_all(modelos.Presentacion(codigo=c, audiencia=modelos.Audiencia(a)) for c, a in PRESENTACIONES)


def _cargar_investigaciones(sesion):
    sesion.add_all(modelos.PreguntaBaseGuion(codigo=c, orden=orden, texto=t)
                   for orden, (c, t) in enumerate(PREGUNTAS_BASE_GUION, start=1))
    sesion.add_all(modelos.TipoReaccion(codigo=c, nombre=n, descripcion=d, pregunta=p, comentario_obligatorio=o,
                                        icono=i, orden=orden)
                   for orden, (c, n, d, p, o, i) in enumerate(TIPOS_REACCION, start=1))


def cargar_listas(sesion, listas, comun):
    """Carga listas de opciones; la ruta usa la misma función para sus listas propias."""
    cargadas = {}
    for codigo, nombre, opciones in listas:
        codigos = [codigo_opcion for codigo_opcion, _ in opciones]
        if CODIGO_OTRA in codigos:
            raise ValueError(f'La lista {codigo} usa el código reservado {CODIGO_OTRA}')
        if not codigos or len(codigos) != len(set(codigos)):
            raise ValueError(f'La lista {codigo} debe tener opciones con códigos distintos')
        cargadas[codigo] = modelos.ListaOpciones(codigo=codigo, nombre=nombre, comun=comun)
    sesion.add_all(cargadas.values())
    sesion.flush()
    sesion.add_all(modelos.OpcionLista(lista_id=cargadas[codigo].id, codigo=c, texto=t, orden=orden)
                   for codigo, _, opciones in listas for orden, (c, t) in enumerate(opciones, start=1))
    return cargadas


def _cargar_tarjeta(sesion, listas):
    """Secciones de la tarjeta y los datos de precarga de rubros y caminos (B11)."""
    secciones = {c: modelos.SeccionTarjeta(codigo=c, nombre=n, orden=orden, para_comparar=p)
                 for orden, (c, n, p) in enumerate(SECCIONES_TARJETA, start=1)}
    sesion.add_all(secciones.values())
    opciones_comunes = {codigo: opciones for codigo, _, opciones in LISTAS_COMUNES}
    preguntas = {codigo for codigo, _ in opciones_comunes['PREGUNTAS_CONOCIMIENTO']}
    dudas = {codigo for codigo, _ in opciones_comunes['DUDAS_CONOCIMIENTO']}
    if preguntas != set(modelos.PreguntaConocimiento) or dudas != preguntas:
        raise ValueError('Las preguntas y dudas de conocimiento deben usar los códigos de PreguntaConocimiento')
    sesion.flush()
    opciones = {(lista, codigo): opcion_id for lista, codigo, opcion_id in sesion.execute(
        select(modelos.ListaOpciones.codigo, modelos.OpcionLista.codigo, modelos.OpcionLista.id).join(
            modelos.OpcionLista, modelos.OpcionLista.lista_id == modelos.ListaOpciones.id).where(
            modelos.ListaOpciones.id.in_([listas['RUBROS_GASTO'].id, listas['CAMINOS'].id])))}
    for rubro, *_ in REFERENCIAS_RUBROS:
        if ('RUBROS_GASTO', rubro) not in opciones:
            raise ValueError(f'El rubro {rubro} no está en RUBROS_GASTO')
    for camino in CAMINOS_CON_PREPARACION:
        if ('CAMINOS', camino) not in opciones:
            raise ValueError(f'El camino {camino} no está en CAMINOS')
    sesion.add_all(modelos.ReferenciaRubro(
        opcion_id=opciones['RUBROS_GASTO', rubro], frecuencia_recomendada=modelos.FrecuenciaGasto(frecuencia),
        monto_referencia=monto, cero_si_publica=cero, solo_si_camino_prepara=prepara)
        for rubro, frecuencia, monto, cero, prepara in REFERENCIAS_RUBROS)
    sesion.add_all(modelos.ReferenciaCamino(opcion_id=opcion_id, incluye_preparacion=codigo in CAMINOS_CON_PREPARACION)
                   for (lista, codigo), opcion_id in sorted(opciones.items()) if lista == 'CAMINOS')
    return secciones


def cargar(sesion: Session) -> Fijos:
    sesion.add_all(modelos.TextoFijo(codigo=c, texto=t) for c, t in TEXTOS_FIJOS)
    secciones = _cargar_secciones(sesion)
    _cargar_presentaciones(sesion)
    _cargar_investigaciones(sesion)
    listas = cargar_listas(sesion, LISTAS_COMUNES, comun=True)
    secciones_tarjeta = _cargar_tarjeta(sesion, listas)
    tematicas = _cargar_tematicas(sesion)
    dimensiones, aplicacion, items = _cargar_riasec(sesion)
    catalogo.cargar(sesion, dimensiones)
    comparacion, items_comparacion = _cargar_partida_llegada(sesion, tematicas)
    otros = {definicion.codigo: _cargar_instrumento(sesion, definicion) for definicion in INSTRUMENTOS}
    sesion.flush()
    validar_textos_piezas(sesion)
    return Fijos(aplicaciones={a.codigo: a for a in (aplicacion, *comparacion, *(a for a, _ in otros.values()))},
                 items={'TEST-RIASEC': items, 'TEST-PARTIDA-LLEGADA': items_comparacion,
                        **{codigo: i for codigo, (_, i) in otros.items()}}, secciones=secciones,
                 listas=listas, tematicas=tematicas, secciones_tarjeta=secciones_tarjeta)


def validar_textos_piezas(sesion: Session) -> None:
    """Ajuste registros llm (lote 2): los textos de las piezas (`PIEZA_*`) están completos: cada grupo, los dos
    orígenes de cada pieza y la frase de cada dimensión de los tres tests del perfil. Si falta uno, la carga falla."""
    textos = {c for c, _ in TEXTOS_FIJOS}
    requeridos = {f'PIEZA_GRUPO_{g}' for g in GRUPOS_PIEZAS}
    requeridos |= {f'PIEZA_ORIGEN_{p}_{d}' for p in PIEZAS_CON_ORIGEN for d in ('MOSTRAR', 'LLM')}
    requeridos |= {f'PIEZA_ORIGEN_{p}_LLM' for p in PIEZAS_SOLO_ORIGEN_LLM}
    instrumentos = {i.id: i.codigo for i in sesion.scalars(select(modelos.Instrumento).where(modelos.Instrumento.codigo.in_(
        (INSTRUMENTO_INTERESES, INSTRUMENTO_INTELIGENCIAS, INSTRUMENTO_HABILIDADES))))}
    if len(instrumentos) != 3:
        raise ValueError('Faltan instrumentos de las piezas del perfil')
    requeridos |= {f'PIEZA_FRASE_{d.codigo}' for d in sesion.scalars(select(modelos.Dimension).where(
        modelos.Dimension.instrumento_id.in_(instrumentos)))}
    faltan = sorted(requeridos - textos)
    if faltan:
        raise ValueError(f'Faltan textos de piezas: {faltan}')


def validar_distribucion_items(sesion: Session) -> None:
    """Cada aplicación presenta todos los ítems de su instrumento exactamente una vez."""
    for aplicacion in sesion.scalars(select(modelos.Aplicacion).order_by(modelos.Aplicacion.codigo)):
        esperados = dict(sesion.execute(select(modelos.ItemInstrumento.id, modelos.ItemInstrumento.codigo).where(
            modelos.ItemInstrumento.instrumento_id == aplicacion.instrumento_id,
        )).all())
        presentados = Counter(sesion.scalars(select(modelos.ActividadItem.item_id).join(
            modelos.AplicacionActividad, modelos.AplicacionActividad.actividad_id == modelos.ActividadItem.actividad_id,
        ).where(modelos.AplicacionActividad.aplicacion_id == aplicacion.id)))
        if not esperados or presentados != Counter({item: 1 for item in esperados}):
            faltantes = [codigo for item, codigo in esperados.items() if presentados[item] == 0]
            repetidos = [codigo for item, codigo in esperados.items() if presentados[item] > 1]
            ajenos = sesion.scalars(select(modelos.ItemInstrumento.codigo).where(
                modelos.ItemInstrumento.id.in_(set(presentados) - set(esperados)),
            )).all()
            raise ValueError(f"Distribución inválida en {aplicacion.codigo}: faltantes={faltantes}, "
                             f"repetidos={repetidos}, ajenos={ajenos}")
