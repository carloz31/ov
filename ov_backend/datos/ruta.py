"""Ruta mínima de prueba: lo justo para demostrar cada mecánica.

DATO DE PRUEBA: todo este módulo. Los códigos `t-...` nombran la mecánica que prueban.
Cada lote agrega filas en este formato; el cargador las interpreta sin lógica a medida.
La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import MAXIMO_ITEMS_REGISTRO
from datos import fijos
from datos.ocupaciones import validar_distribucion_items


# (código, nombre)
SALONES = (('5A', 'Quinto A'), ('5B', 'Quinto B'))

# (código, nombre, rol, salón)
CUENTAS = (('est-ana', 'Ana', 'ESTUDIANTE', '5A'), ('est-luis', 'Luis', 'ESTUDIANTE', '5A'),
           ('est-beto', 'Beto', 'ESTUDIANTE', '5B'), ('apo-rosa', 'Rosa', 'APODERADO', None),
           ('ori-carmen', 'Carmen', 'ORIENTADORA', None))

# (orientadora, salón, es principal)
ORIENTADORAS_SALONES = (('ori-carmen', '5A', True),)

# (código, estudiante, apoderado, parentesco)
VINCULOS = (('VIN-ANA', 'est-ana', 'apo-rosa', 'madre'),)

# Configuración del salón (B07; la orientadora la editará en B14). (salón, instrumento, prioritario, visible al
# apoderado): un cuestionario prioritario es requisito de T2. El de partida y llegada (COMPARACION) es obligatorio
# por diseño y no admite la marca de prioritario.
SALON_INSTRUMENTOS = (('5A', 'TEST-RIASEC', True, False),)
# (salón, actividad de registro): registros que la orientadora ve destacados en el perfil.
SALON_ACTIVIDADES_PRIORITARIAS = (('5A', 't-expectativas'),)

# (código, número, nombre, espacio, audiencia)
BLOQUES = (('T0', 1, 'Inicio', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T1', 2, 'Camino', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T2', 3, 'Decisión', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('CIUDAD', 4, 'La ciudad', 'CIUDAD', 'ESTUDIANTE'),
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'))

# (código, bloque, título, tipo, puntaje mínimo, duración estimada en minutos). El orden es el de la
# tupla dentro de cada bloque y el contenido es el código con guiones bajos.
ACTIVIDADES = (('t-inicio', 'T0', 'Inicio de prueba', 'INFORMATIVA', None, 5),
               ('t-partida', 'T0', 'Punto de partida', 'CUESTIONARIO', None, 10),
               ('t-cierre-inicio', 'T0', 'Cierre del inicio', 'INFORMATIVA', None, 5),
               ('t-expectativas', 'T1', 'Registro de expectativas', 'REGISTRO', None, 15),
               ('t-opcional', 'T1', 'Actividad opcional', 'INFORMATIVA', None, 5),
               ('t-valores', 'T1', 'Registro de valores', 'REGISTRO', None, 10),
               ('t-adicional', 'T1', 'Misión adicional', 'INFORMATIVA', None, 5),
               ('t-eco', 'T1', 'Registro que retoma respuestas', 'REGISTRO', None, 10),
               ('t-lee-cuestionario', 'T1', 'Lectura de tu punto de partida', 'INFORMATIVA', None, 5),
               ('t-batalla', 'T1', 'Batalla de prueba', 'BATALLA', None, 10),
               ('t-explorar', 'T1', 'Registro de exploración', 'REGISTRO', None, 10),
               ('t-llegada', 'T2', 'Punto de llegada', 'CUESTIONARIO', None, 10),
               ('t-comparar', 'T2', 'Registro para comparar tus planes', 'REGISTRO', None, 15),
               ('t-proyecto', 'T2', 'Registro de tu proyecto', 'REGISTRO', None, 15),
               ('t-mision-intereses', 'CIUDAD', 'Misión de intereses', 'CUESTIONARIO', None, 10),
               ('t-mision-intereses-2', 'CIUDAD', 'Misión de intereses, segunda parte', 'CUESTIONARIO', None, 10),
               ('t-caso', 'CIUDAD', 'Caso de prueba', 'CASO', 60, 10),
               ('t-contraste', 'CIUDAD', 'Registro de contraste de intereses', 'REGISTRO', None, 10),
               ('t-apo-1', 'FAMILIA', 'Primera actividad del apoderado', 'INFORMATIVA', None, 10),
               ('t-apo-carta', 'FAMILIA', 'Carta del apoderado', 'INFORMATIVA', None, 10))

# Lo que cambia los valores por defecto (requerida, visibilidad SIEMPRE, sin descripción).
PROPIEDADES = {'t-opcional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR',
                              'descripcion': 'Actividad opcional que aparece al desbloquearse.'},
               't-valores': {'requerida': False},
               't-eco': {'requerida': False},
               't-lee-cuestionario': {'requerida': False},
               't-batalla': {'requerida': False},
               't-explorar': {'requerida': False},
               't-adicional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR',
                               'descripcion': 'Misión adicional que aparece si el registro quedó adecuado.'}}

# (actividad, instrumento, primer ítem, último ítem). El RIASEC va en dos misiones para probar que el
# resultado espera a todas las de su aplicación.
ITEMS_ACTIVIDADES = (('t-mision-intereses', 'TEST-RIASEC', 1, 30),
                     ('t-mision-intereses-2', 'TEST-RIASEC', 31, 60),
                     ('t-partida', 'TEST-PARTIDA-LLEGADA', 1, 19),
                     ('t-llegada', 'TEST-PARTIDA-LLEGADA', 1, 19))

# (aplicación, actividad)
APLICACIONES_ACTIVIDADES = (('APL-RIASEC', 't-mision-intereses'), ('APL-RIASEC', 't-mision-intereses-2'),
                            ('APL-PARTIDA', 't-partida'), ('APL-LLEGADA', 't-llegada'))

# (actividad, temáticas). Solo las necesarias para contar actividades completadas por dimensión (B07).
TEMATICAS_ACTIVIDADES = (('t-expectativas', ('A', 'B')), ('t-valores', ('B',)), ('t-eco', ('A',)),
                         ('t-mision-intereses', ('B',)), ('t-caso', ('C',)))

# (caso, dimensiones RIASEC). Solo las actividades CASO llevan dimensiones; un caso puede tener varias (B08).
DIMENSIONES_ACTIVIDADES = (('t-caso', ('R', 'S')),)

# --- Catálogo (B10) ---
# Letras RIASEC por posición, como las traerá la carga real: (ocupación, posición, letra). De 1 a 3 por ocupación
# con `codigo`, en posiciones consecutivas desde 1; la posición 1 es el tipo principal. Ficticias.
HIGH_POINTS = (
    ('sound-technician', 1, 'R'),
    ('electrician', 1, 'R'), ('electrician', 2, 'C'),
    ('event-coordinator', 1, 'E'), ('event-coordinator', 2, 'C'), ('event-coordinator', 3, 'S'),
    ('translator', 1, 'C'),
    ('community-manager', 1, 'E'), ('community-manager', 2, 'A'),
    ('graphic-designer', 1, 'A'), ('graphic-designer', 2, 'C'), ('graphic-designer', 3, 'E'),
    ('event-assistant', 1, 'C'),
    ('security-guard', 1, 'R'), ('security-guard', 2, 'C'),
    ('paramedic', 1, 'S'), ('paramedic', 2, 'R'), ('paramedic', 3, 'I'),
    ('photographer', 1, 'R'),
    ('lawyer', 1, 'E'), ('lawyer', 2, 'C'),
    ('cook', 1, 'R'), ('cook', 2, 'C'), ('cook', 3, 'E'),
    ('illustrator', 1, 'A'),
    ('firefighter', 1, 'R'), ('firefighter', 2, 'C'),
    ('meteorologist', 1, 'I'), ('meteorologist', 2, 'R'), ('meteorologist', 3, 'C'),
    ('municipal-police', 1, 'R'),
    ('medical-specialist', 1, 'I'), ('medical-specialist', 2, 'S'),
    ('veterinarian', 1, 'R'), ('veterinarian', 2, 'I'), ('veterinarian', 3, 'C'),
    ('biologist', 1, 'I'),
    ('environmental-engineer', 1, 'I'), ('environmental-engineer', 2, 'R'),
    ('civil-engineer', 1, 'R'), ('civil-engineer', 2, 'I'), ('civil-engineer', 3, 'C'),
    ('machinery-operator', 1, 'R'),
    ('social-worker', 1, 'S'), ('social-worker', 2, 'C'),
    ('psychologist', 1, 'S'), ('psychologist', 2, 'I'), ('psychologist', 3, 'C'),
    ('logistics-coordinator', 1, 'C'),
    ('journalist', 1, 'A'), ('journalist', 2, 'I'),
    ('teacher', 1, 'S'), ('teacher', 2, 'A'), ('teacher', 3, 'C'),
    ('architect', 1, 'R'),
    ('geologist', 1, 'I'), ('geologist', 2, 'R'),
    ('agricultural-engineer', 1, 'R'), ('agricultural-engineer', 2, 'I'), ('agricultural-engineer', 3, 'C'),
    ('public-administrator', 1, 'E'),
    ('sociologist', 1, 'I'), ('sociologist', 2, 'S'),
    ('data-analyst', 1, 'I'), ('data-analyst', 2, 'C'), ('data-analyst', 3, 'A'),
    ('urban-planner', 1, 'I'),
    ('documentary-filmmaker', 1, 'A'), ('documentary-filmmaker', 2, 'E'),
    ('nurse', 1, 'S'), ('nurse', 2, 'C'), ('nurse', 3, 'I'),
)

# Tipos RIASEC de carrera: (carrera, posición, letra). De 0 a 3 por carrera; veterinary-medicine queda sin tipos.
TIPOS_CARRERA = (
    ('environmental-engineering', 1, 'I'), ('environmental-engineering', 2, 'R'),
    ('journalism', 1, 'A'), ('journalism', 2, 'E'), ('journalism', 3, 'S'),
    ('nursing', 1, 'S'),
    ('civil-engineering', 1, 'R'), ('civil-engineering', 2, 'I'),
    ('psychology', 1, 'S'), ('psychology', 2, 'I'), ('psychology', 3, 'A'),
)

# (código, nombre)
UBICACIONES = (('t-lima', 'Lima de prueba'), ('t-cusco', 'Cusco de prueba'))

# (código, nombre, tipo, gestión o None, ubicación, descripción, página web, carreras que ofrece). B11: una pública
# y una privada ofrecen la misma carrera, para la precarga de la pensión y el total de la carrera.
INSTITUCIONES = (
    ('t-uni', 'Universidad Nacional de Prueba', 'UNIVERSIDAD', 'PUBLICA', 't-lima',
     'Universidad de prueba con varias facultades.', 'https://example.test/universidad',
     ('environmental-engineering', 'journalism', 'psychology')),
    ('t-ffaa', 'Escuela de Oficiales de Prueba', 'FFAA_POLICIA', 'PUBLICA', 't-cusco',
     'Escuela de formación de oficiales de prueba.', 'https://example.test/escuela',
     ('civil-engineering', 'nursing')),
    ('t-privada', 'Escuela Superior Privada de Prueba', 'UNIVERSIDAD', 'PRIVADA', 't-lima',
     'Casa de estudios privada de prueba.', 'https://example.test/privada', ('environmental-engineering',)),
)

# (institución, carrera, ciclos) que duran en esa institución; la de 11 ciclos prueba la duración impar (B11).
DURACIONES_CICLOS = (('t-uni', 'environmental-engineering', 10), ('t-privada', 'environmental-engineering', 11))

# (carrera, promedio mensual, fuente, año, ((mínimo, máximo o None, porcentaje), ...))
INGRESOS = (
    ('psychology', 3200, 'Fuente de prueba', 2025, ((0, 2000, 30), (2000, 4000, 50), (4000, None, 20))),
    ('civil-engineering', 4500, 'Fuente de prueba', 2025, ((0, 3000, 25), (3000, None, 75))),
)

# (ocupación, conocimientos). El front no los tiene.
CONOCIMIENTOS_OCUPACIONES = (
    ('psychologist', ('Psicología', 'Terapia y orientación')),
    ('civil-engineer', ('Ingeniería y tecnología', 'Construcción')),
)

# Listas propias de una actividad: (código, nombre, ((código, texto), ...)).
LISTAS = (('t-lista-apoyos', 'Quién te apoya', (('FAMILIA', 'Mi familia'), ('DOCENTES', 'Mis docentes'),
                                                ('AMIGOS', 'Mis amigos'))),
          ('t-lista-valores', 'Valores', (('SERVIR', 'Servir a otros'), ('CREAR', 'Crear cosas nuevas'),
                                          ('ESTABILIDAD', 'Tener estabilidad'), ('RECONOCIMIENTO', 'Ser reconocido'),
                                          ('LIBERTAD', 'Tener libertad'))))

# (actividad, código, nombre, consigna, elección, criterios). El orden es el de la tupla dentro de cada
# actividad. Elección: None, (lista, mínima, máxima, ordenada, permite «otra») o, por referencia,
# ('ref', referencia ELECCION de la misma actividad, mínima, máxima, ordenada). Criterio: (código, tipo,
# descripción); la repregunta sale de `fijos.REPREGUNTAS_CRITERIO`.
ITEMS_REGISTRO = (
    ('t-expectativas', 't-exp-ruta', 'Ruta', '¿Qué te gustaría hacer al terminar el colegio y por qué?',
     ('RUTAS_DESPUES_COLEGIO', 1, 2, False, True), (('C1', 'RAZON', 'Por qué elige esa ruta'),)),
    ('t-expectativas', 't-exp-apoyo', 'Apoyo', '¿Quién te apoya en esta decisión? Cuenta un ejemplo.',
     ('t-lista-apoyos', 1, 1, False, False), (('C1', 'EJEMPLO', 'Un ejemplo concreto de apoyo'),)),
    ('t-expectativas', 't-exp-espera', 'Expectativas', '¿Qué esperan de ti las personas cercanas?', None,
     (('C1', 'EJEMPLO', 'Una expectativa concreta'), ('C2', 'RAZON', 'Por qué cree que la tienen'))),
    ('t-valores', 't-val-orden', 'Valores', 'Ordena los tres valores más importantes para ti y explica el primero.',
     ('t-lista-valores', 3, 3, True, False), (('C1', 'RAZON', 'Por qué el primero es el más importante'),)),
    ('t-valores', 't-val-libre', 'Libre', 'Escribe lo que quieras sobre tus valores.', None, ()),
    ('t-valores', 't-val-breve', 'Breve', 'Describe un momento en que actuaste según tus valores.', None, ()),
    ('t-eco', 't-eco-ruta', 'Ruta elegida', 'De las rutas que elegiste, ¿cuál te atrae más y por qué?',
     ('ref', 't-ref-rutas', 1, 1, False), (('C1', 'RAZON', 'Por qué esa ruta le atrae más'),)),
    ('t-eco', 't-eco-espera', 'Lo que esperan', 'Antes escribiste lo que esperan de ti. ¿Sigues pensando lo mismo?',
     None, ()),
    ('t-contraste', 't-con-contraste', 'Contraste',
     '¿En qué se parece tu resultado a lo que pensabas de ti? ¿En qué se diferencia?', None,
     (('C1', 'CONTRASTE', 'Compara el resultado con lo que pensaba antes'),)),
    ('t-explorar', 't-explorar-sorpresa', 'Lo inesperado', '¿Qué opción fuera de tu perfil te llamó la atención y por qué?',
     None, (('C1', 'RAZON', 'Por qué le llamó la atención'),)),
    ('t-comparar', 't-comparar-eleccion', 'Comparación', 'Compara tus planes: ¿cuál te convence más y por qué?',
     None, (('C1', 'RAZON', 'Por qué ese plan le convence más'),)),
    ('t-proyecto', 't-proyecto-paso', 'Mi proyecto', '¿Cuál de tus pasos vas a dar primero y qué esperas averiguar?',
     None, (('C1', 'ACCION', 'Qué paso dará primero'),)),
)

# Referencias: (código, (tipo de dueño, dueño), tipo, fuente). Dueño: ('ACTIVIDAD', código) o
# ('PREGUNTA_DIARIO', código). El tipo es uno de `TipoReferencia`; ELECCION y TEXTO leen un ítem de registro
# de otra actividad; RESULTADO y COINCIDENCIAS, el resultado revelado de una aplicación, y RESPUESTA_CUESTIONARIO,
# la respuesta a un ítem de instrumento en una aplicación: (aplicación, ítem).
REFERENCIAS = (('t-ref-espera', ('ACTIVIDAD', 't-eco'), 'TEXTO', 't-exp-espera'),
               ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-ruta'),
               ('t-ref-resultado', ('ACTIVIDAD', 't-contraste'), 'RESULTADO', 'APL-RIASEC'),
               ('t-ref-coincidencias', ('ACTIVIDAD', 't-contraste'), 'COINCIDENCIAS', 'APL-RIASEC'),
               ('t-ref-cuestionario', ('ACTIVIDAD', 't-lee-cuestionario'), 'RESPUESTA_CUESTIONARIO',
                ('APL-PARTIDA', 'AUTO-01')),
               ('t-ref-diario-espera', ('PREGUNTA_DIARIO', 't-diario-personal'), 'TEXTO', 't-exp-espera'),
               ('t-ref-diario-favoritos', ('PREGUNTA_DIARIO', 't-dia-favoritos'), 'FAVORITOS', None),
               ('t-ref-planes', ('ACTIVIDAD', 't-comparar'), 'PLANES', None),
               ('t-ref-plan-a', ('ACTIVIDAD', 't-proyecto'), 'PLAN', None),
               ('t-ref-pasos-plan-a', ('ACTIVIDAD', 't-proyecto'), 'PASOS_PLAN_A', None),
               ('t-ref-opcion-inicial', ('ACTIVIDAD', 't-proyecto'), 'OPCION_INICIAL', None))
FUENTE_APLICACION = ('RESULTADO', 'COINCIDENCIAS')
SIN_FUENTE = ('FAVORITOS', 'PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL')

# Lo que cambia los valores por defecto de un ítem (obligatorio, sin longitud mínima).
PROPIEDADES_ITEMS = {'t-val-breve': {'min_caracteres': 40}}
REPREGUNTA_GENERICA = '¿Podrías contarme un poco más?'

# (código, título, contenido, audiencia)
FICHAS = (('t-ficha', 'Ficha de prueba', 'Ficha que otorga t-inicio.', 'ESTUDIANTE'),
          ('t-ficha-apo', 'Ficha del apoderado', 'Ficha que otorga t-apo-1.', 'APODERADO'))

# (código, título, descripción, enlace, pista). La pista se muestra mientras el testimonio está bloqueado (B08).
TESTIMONIOS = (('t-testimonio-1', 'Testimonio de prueba 1', 'Trayectoria de prueba 1.', 'https://example.test/t1',
                'Resuelve el caso de prueba para conocer este testimonio.'),
               ('t-testimonio-2', 'Testimonio de prueba 2', 'Trayectoria de prueba 2.', 'https://example.test/t2', None))

# (código, título, tema)
CONVERSACIONES = (('t-conv-1', 'Primera conversación', 'Tema de prueba 1.'),
                  ('t-conv-2', 'Segunda conversación', 'Tema de prueba 2.'))

# (código, nombre, descripción, requisito, oculta)
INSIGNIAS = (('t-ins-1', 'Insignia de prueba', 'Completaste t-inicio.', 'Completa t-inicio.', False),
             ('t-ins-oculta', 'Insignia oculta', 'Venciste sin perder destellos.',
              'Vence al enemigo sin perder destellos.', True),
             # B10: logros ocultos por vistas diversas del catálogo.
             ('t-ins-familias', 'Exploradora de familias', 'Viste carreras de dos familias distintas.',
              'Mira carreras de familias distintas.', True),
             ('t-ins-letras', 'Exploradora de intereses', 'Viste ocupaciones de dos tipos principales distintos.',
              'Mira ocupaciones de tipos distintos.', True),
             ('t-ins-instituciones', 'Exploradora de instituciones', 'Viste instituciones de todos los tipos.',
              'Mira instituciones de todos los tipos.', True))

# (número, título)
NIVELES = ((1, 'Nivel 1 de prueba'), (2, 'Nivel 2 de prueba'))

# Preguntas del diario: (código, nombre, pregunta base, uso, personalizada, dimensión). Las DESBLOQUEABLE las
# abre una regla; las DIARIA entran al sorteo de la pregunta del día por la dimensión del cuestionario de
# partida y llegada (o sin dimensión). Las personalizadas declaran sus referencias en `REFERENCIAS`.
PREGUNTAS_DIARIO = (
    ('t-diario-fija', 'Mi primer paso', '¿Qué te gustaría descubrir de ti en este camino?', 'DESBLOQUEABLE', False, None),
    ('t-diario-personal', 'Lo que espero', '¿Cómo te sientes con lo que esperas de este camino?', 'DESBLOQUEABLE',
     True, None),
    ('t-dia-claridad-1', 'Lo que tengo claro', '¿Qué tienes hoy un poco más claro que ayer?', 'DIARIA', False, 'AUTO-A'),
    ('t-dia-claridad-2', 'Una duda', '¿Qué duda te gustaría resolver esta semana?', 'DIARIA', False, 'AUTO-A'),
    ('t-dia-mi-1', 'Algo de mí', '¿Qué hiciste hoy que disfrutaste de verdad?', 'DIARIA', False, 'AUTO-B'),
    ('t-dia-favoritos', 'Mis favoritos', '¿Qué te atrae de lo que marcaste como favorito?', 'DIARIA', True, 'AUTO-B'),
    ('t-dia-libre', 'Un momento', '¿Qué momento de hoy quieres recordar?', 'DIARIA', False, None),
)

# (código, tipo de objetivo, objetivo, mensaje de bloqueo, condiciones); cada condición:
# (evento, referencia, conteo, mínimo).
REGLAS = (
    ('R-t-cierre-inicio', 'ACTIVIDAD', 't-cierre-inicio', 'Completa el inicio para continuar.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-T1', 'BLOQUE', 'T1', 'Termina el bloque de inicio para abrir el camino.',
     (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-T2', 'BLOQUE', 'T2',
     'Termina el camino y revela tu punto de partida y los cuestionarios prioritarios de tu salón para abrir la decisión.',
     (('COMPLETA_BLOQUE', 'T1', 'EVENTOS', 1), ('REVELA_RESULTADO', None, 'EVENTOS', 1))),
    ('R-t-adicional', 'ACTIVIDAD', 't-adicional', 'Desarrolla todas tus respuestas del registro de expectativas.',
     (('REGISTRO_ADECUADO', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-eco', 'ACTIVIDAD', 't-eco', 'Completa el registro de expectativas para retomarlo.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-opcional', 'ACTIVIDAD', 't-opcional', 'Completa el registro de expectativas.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-CIUDAD', 'BLOQUE', 'CIUDAD', 'Completa el registro de expectativas para llegar a la ciudad.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-mision-intereses-2', 'ACTIVIDAD', 't-mision-intereses-2', 'Completa la primera misión de intereses.',
     (('COMPLETA_ACTIVIDAD', 't-mision-intereses', 'EVENTOS', 1),)),
    ('R-t-caso', 'ACTIVIDAD', 't-caso', 'Completa las dos misiones de intereses.',
     (('COMPLETA_ACTIVIDAD', 't-mision-intereses-2', 'EVENTOS', 1),)),
    ('R-t-contraste', 'ACTIVIDAD', 't-contraste', 'Revela tu resultado de intereses para contrastarlo.',
     (('REVELA_RESULTADO', 'APL-RIASEC', 'EVENTOS', 1),)),
    ('R-t-batalla', 'ACTIVIDAD', 't-batalla', 'Completa el inicio y repasa su ficha para enfrentar la batalla.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-explorar-carrera', 'ACTIVIDAD', 't-explorar',
     'Vence la batalla y mira una carrera u ocupación distinta de tu perfil para explorar.',
     (('SUPERA_BATALLA', 't-batalla', 'EVENTOS', 1), ('VISTA_CARRERA', None, 'EVENTOS', 1))),
    ('R-t-explorar-ocupacion', 'ACTIVIDAD', 't-explorar',
     'Vence la batalla y mira una carrera u ocupación distinta de tu perfil para explorar.',
     (('SUPERA_BATALLA', 't-batalla', 'EVENTOS', 1), ('VISTA_OCUPACION', None, 'EVENTOS', 1))),
    ('R-t-testimonio-1', 'TESTIMONIO', 't-testimonio-1', 'Supera el caso de prueba para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso', 'EVENTOS', 1),)),
    ('R-t-testimonio-2', 'TESTIMONIO', 't-testimonio-2', 'Supera el caso de prueba para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso', 'EVENTOS', 1),)),
    ('R-t-ficha', 'FICHA', 't-ficha', 'Completa el inicio para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ficha-apo', 'FICHA', 't-ficha-apo', 'Completa tu primera actividad para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-t-ins-1', 'INSIGNIA', 't-ins-1', 'Completa el inicio.', (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ins-familias', 'INSIGNIA', 't-ins-familias', 'Logro oculto.', (('VISTA_CARRERA', None, 'EVENTOS', 1),)),
    ('R-t-ins-letras', 'INSIGNIA', 't-ins-letras', 'Logro oculto.', (('VISTA_OCUPACION', None, 'EVENTOS', 1),)),
    ('R-t-ins-instituciones', 'INSIGNIA', 't-ins-instituciones', 'Logro oculto.',
     (('VISTA_INSTITUCION', None, 'EVENTOS', 1),)),
    ('R-t-ins-oculta', 'INSIGNIA', 't-ins-oculta', 'Logro oculto.',
     (('VENCE_DESAFIO_INTACTO', None, 'EVENTOS', 1),)),
    ('R-NIV-2', 'NIVEL', 2, 'Termina el bloque de inicio para subir de nivel.',
     (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-t-apo-carta', 'ACTIVIDAD', 't-apo-carta', 'Completa la primera actividad.',
     (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-SEC-DIARIO', 'SECCION', 'DIARIO', 'Completa el inicio para abrir tu diario.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CATALOGO', 'SECCION', 'CATALOGO', 'Completa el inicio para abrir el catálogo.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-PLANES', 'SECCION', 'PLANES', 'Completa el inicio para abrir tus planes.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CHECK_IN', 'SECCION', 'CHECK_IN', 'Completa el cierre del inicio para hacer tu check-in.',
     (('COMPLETA_ACTIVIDAD', 't-cierre-inicio', 'EVENTOS', 1),)),
    ('R-SEC-FAMILIA', 'SECCION', 'FAMILIA', 'Completa el registro de expectativas para abrir la sección Familia.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-diario-fija', 'PREGUNTA_DIARIO', 't-diario-fija', 'Completa el inicio para recibir esta pregunta.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-diario-personal', 'PREGUNTA_DIARIO', 't-diario-personal',
     'Completa el registro de expectativas para recibir esta pregunta.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-SEC-CONVERSACIONES', 'SECCION', 'CONVERSACIONES', 'Completa tus actividades para conversar en familia.',
     (('COMPLETA_BLOQUE', 'FAMILIA', 'EVENTOS', 1),)),
    # B11: las secciones de la tarjeta de carrera se abren a medida que avanza el camino.
    ('R-PLAN-POR_QUE', 'SECCION_PLAN', 'POR_QUE', 'Completa el inicio para contar por qué elegiste esta carrera.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-PLAN-CONOCIMIENTO', 'SECCION_PLAN', 'CONOCIMIENTO',
     'Completa el registro de valores para revisar qué tanto conoces esta carrera.',
     (('COMPLETA_ACTIVIDAD', 't-valores', 'EVENTOS', 1),)),
    ('R-PLAN-REALIDAD', 'SECCION_PLAN', 'REALIDAD',
     'Completa el registro de exploración para ver qué tan real es esta opción.',
     (('COMPLETA_ACTIVIDAD', 't-explorar', 'EVENTOS', 1),)),
    ('R-PLAN-PASOS', 'SECCION_PLAN', 'PASOS', 'Completa la comparación de tus planes para definir tus pasos.',
     (('COMPLETA_ACTIVIDAD', 't-comparar', 'EVENTOS', 1),)),
    # B11: comparar pide dos planes con «por qué» y «qué tan real es» listos; el proyecto, pasos en el plan A.
    ('R-t-comparar', 'ACTIVIDAD', 't-comparar',
     'Completa por qué y qué tan real es en al menos dos planes para compararlos.',
     (('ACTUALIZA_PLAN', None, 'EVENTOS', 1),)),
    ('R-t-proyecto', 'ACTIVIDAD', 't-proyecto', 'Registra al menos un paso en tu plan A para armar tu proyecto.',
     (('ACTUALIZA_PLAN', None, 'EVENTOS', 1),)),
)


# Reglas con evaluador especial (`app/services/motor/evaluadores.py`): {regla: (evaluador, parámetro)}.
# El parámetro es el umbral del evaluador; en `vistas_diversas`, nulo exige todos los grupos del catálogo.
EVALUADORES_REGLAS = {'R-T2': ('instrumentos_prioritarios', None),
                      'R-t-explorar-carrera': ('vista_fuera_del_perfil', None),
                      'R-t-explorar-ocupacion': ('vista_fuera_del_perfil', None),
                      'R-t-ins-familias': ('carreras_familias_distintas', 2),
                      'R-t-ins-letras': ('ocupaciones_high_point_distinto', 2),
                      'R-t-ins-instituciones': ('instituciones_tipos_distintos', None),
                      'R-t-comparar': ('planes_listos_para_comparar', 2),
                      'R-t-proyecto': ('pasos_plan_a', 1)}


def contenido(codigo: str) -> str:
    return codigo.replace('-', '_')


def _cargar_estructura(sesion):
    salones = {c: modelos.Salon(codigo=c, nombre=n) for c, n in SALONES}
    sesion.add_all(salones.values())
    sesion.flush()
    cuentas = {c: modelos.Cuenta(codigo=c, nombre=n, rol=modelos.Rol(r),
                                 salon_id=None if salon is None else salones[salon].id)
               for c, n, r, salon in CUENTAS}
    bloques = {c: modelos.Bloque(codigo=c, numero=num, nombre=n, espacio=modelos.Espacio(e),
                                audiencia=modelos.Audiencia(a)) for c, num, n, e, a in BLOQUES}
    fichas = {c: modelos.Ficha(codigo=c, titulo=t, contenido=texto, audiencia=modelos.Audiencia(a))
              for c, t, texto, a in FICHAS}
    testimonios = {c: modelos.Testimonio(codigo=c, titulo=t, descripcion=d, enlace=e, pista=p)
                   for c, t, d, e, p in TESTIMONIOS}
    conversaciones = [modelos.Conversacion(codigo=c, titulo=t, tema=tema) for c, t, tema in CONVERSACIONES]
    insignias = {c: modelos.Insignia(codigo=c, nombre=n, descripcion=d, requisito=r, es_oculta=o,
                                   audiencia=modelos.Audiencia.ESTUDIANTE) for c, n, d, r, o in INSIGNIAS}
    niveles = {num: modelos.Nivel(numero=num, titulo=t) for num, t in NIVELES}
    preguntas = _preguntas_diario(sesion)
    sesion.add_all([*cuentas.values(), *bloques.values(), *fichas.values(), *testimonios.values(), *conversaciones,
                    *insignias.values(), *niveles.values(), *preguntas.values()])
    sesion.flush()
    sesion.add_all(modelos.VinculoFamiliar(codigo=c, estudiante_id=cuentas[e].id, apoderado_id=cuentas[a].id,
                                           parentesco=p) for c, e, a, p in VINCULOS)
    sesion.add_all(modelos.OrientadoraSalon(orientadora_id=cuentas[o].id, salon_id=salones[salon].id,
                                            es_principal=p) for o, salon, p in ORIENTADORAS_SALONES)
    ordenes = {}
    actividades = {}
    for codigo, bloque, titulo, tipo, puntaje, duracion in ACTIVIDADES:
        ordenes[bloque] = ordenes.get(bloque, 0) + 1
        propiedades = PROPIEDADES.get(codigo, {})
        actividades[codigo] = modelos.Actividad(
            codigo=codigo, titulo=titulo, tipo=modelos.TipoActividad(tipo), contenido=contenido(codigo),
            orden=ordenes[bloque], bloque_id=bloques[bloque].id, puntaje_minimo=puntaje,
            duracion_estimada_min=duracion, requerida=propiedades.get('requerida', True),
            visibilidad=modelos.Visibilidad(propiedades.get('visibilidad', 'SIEMPRE')),
            descripcion=propiedades.get('descripcion'))
    sesion.add_all(actividades.values())
    sesion.flush()
    return {'BLOQUE': bloques, 'ACTIVIDAD': actividades, 'FICHA': fichas, 'TESTIMONIO': testimonios,
            'INSIGNIA': insignias, 'NIVEL': niveles, 'PREGUNTA_DIARIO': preguntas, 'SALON': salones}


def _preguntas_diario(sesion):
    dimensiones = {d.codigo: d for d in sesion.scalars(select(modelos.Dimension))}
    preguntas = {}
    for codigo, nombre, pregunta, uso, personalizada, dimension in PREGUNTAS_DIARIO:
        if not nombre.strip():
            raise ValueError(f'La pregunta de diario {codigo} no tiene nombre')
        if dimension is not None and (uso != 'DIARIA' or dimension not in dimensiones):
            raise ValueError(f'La pregunta de diario {codigo} tiene una dimensión que no corresponde: {dimension}')
        preguntas[codigo] = modelos.PreguntaDiario(
            codigo=codigo, nombre=nombre, pregunta=pregunta, uso=modelos.UsoPreguntaDiario(uso),
            personalizada=personalizada, dimension_id=None if dimension is None else dimensiones[dimension].id)
    return preguntas


def _unir_instrumentos(sesion, actividades, base: fijos.Fijos):
    sesion.add_all(modelos.AplicacionActividad(aplicacion_id=base.aplicaciones[a].id,
                                               actividad_id=actividades[c].id)
                   for a, c in APLICACIONES_ACTIVIDADES)
    sesion.add_all(modelos.ActividadItem(actividad_id=actividades[c].id, item_id=base.items[i][numero].id,
                                         orden=orden)
                   for c, i, inicio, fin in ITEMS_ACTIVIDADES
                   for orden, numero in enumerate(range(inicio, fin + 1), start=1))


def _unir_tematicas(sesion, actividades, base: fijos.Fijos):
    for actividad, tematicas in TEMATICAS_ACTIVIDADES:
        if actividad not in actividades or any(t not in base.tematicas for t in tematicas):
            raise ValueError(f'Las temáticas de {actividad} apuntan a una actividad o temática inexistente')
    sesion.add_all(modelos.ActividadTematica(actividad_id=actividades[a].id, tematica_id=base.tematicas[t].id)
                   for a, tematicas in TEMATICAS_ACTIVIDADES for t in tematicas)


def _unir_dimensiones(sesion, actividades):
    dimensiones = {d.codigo: d for d in sesion.scalars(select(modelos.Dimension))}
    for actividad, codigos in DIMENSIONES_ACTIVIDADES:
        if actividad not in actividades or any(d not in dimensiones for d in codigos):
            raise ValueError(f'Las dimensiones de {actividad} apuntan a una actividad o dimensión inexistente')
        if actividades[actividad].tipo != modelos.TipoActividad.CASO:
            raise ValueError(f'{actividad} no es un caso y no admite dimensiones')
    sesion.add_all(modelos.ActividadDimension(actividad_id=actividades[a].id, dimension_id=dimensiones[d].id)
                   for a, codigos in DIMENSIONES_ACTIVIDADES for d in codigos)


def _validar_eleccion(codigo, eleccion, listas):
    if eleccion is None or eleccion[0] == POR_REFERENCIA:
        return
    lista, minima, maxima, _, permite_otra = eleccion
    if lista not in listas:
        raise ValueError(f'El ítem {codigo} usa la lista inexistente {lista}')
    disponibles = len(listas[lista][2]) + (1 if permite_otra else 0)
    if not 0 <= minima <= maxima or not 1 <= maxima <= disponibles:
        raise ValueError(f'El ítem {codigo} tiene una elección mínima o máxima incoherente')


POR_REFERENCIA = 'ref'


def _cargar_registros(sesion, actividades, base: fijos.Fijos):
    listas = {codigo: (codigo, nombre, opciones) for codigo, nombre, opciones in (*fijos.LISTAS_COMUNES, *LISTAS)}
    cargadas = {**base.listas, **fijos.cargar_listas(sesion, LISTAS, comun=False)}
    ordenes, vistos = {}, set()
    items = {}
    for actividad, codigo, nombre, consigna, eleccion, criterios in ITEMS_REGISTRO:
        if codigo in vistos:
            raise ValueError(f'El ítem {codigo} aparece en dos actividades')
        vistos.add(codigo)
        if actividades[actividad].tipo != modelos.TipoActividad.REGISTRO:
            raise ValueError(f'El ítem {codigo} está en {actividad}, que no es de registro')
        ordenes[actividad] = ordenes.get(actividad, 0) + 1
        if ordenes[actividad] > MAXIMO_ITEMS_REGISTRO:
            raise ValueError(f'El registro {actividad} tiene más de {MAXIMO_ITEMS_REGISTRO} ítems')
        _validar_eleccion(codigo, eleccion, listas)
        referencia = None
        if eleccion is not None and eleccion[0] == POR_REFERENCIA:
            lista, otra = None, False
            _, referencia, minima, maxima, ordenada = eleccion
        else:
            lista, minima, maxima, ordenada, otra = eleccion or (None, None, None, False, False)
        propiedades = PROPIEDADES_ITEMS.get(codigo, {})
        item = modelos.ItemRegistro(
            codigo=codigo, actividad_id=actividades[actividad].id, orden=ordenes[actividad], nombre=nombre,
            consigna=consigna, min_caracteres=propiedades.get('min_caracteres'),
            obligatorio=propiedades.get('obligatorio', True),
            repregunta_generica=REPREGUNTA_GENERICA, lista_id=None if lista is None else cargadas[lista].id,
            eleccion_minima=minima, eleccion_maxima=maxima, eleccion_ordenada=ordenada, permite_otra=otra)
        items[codigo] = (item, criterios, referencia)
    referencias = _validar_referencias(sesion, actividades, items, base)
    _insertar_en_orden(sesion, items, referencias)
    sesion.add_all(modelos.CriterioCompletitud(item_registro_id=item.id, codigo=c, tipo=modelos.TipoCriterio(tipo),
                                               descripcion=d, repregunta=fijos.REPREGUNTAS_CRITERIO[tipo], orden=orden)
                   for item, criterios, _ in items.values()
                   for orden, (c, tipo, d) in enumerate(criterios, start=1))


def _validar_referencias(sesion, actividades, items, base: fijos.Fijos):
    """Valida `REFERENCIAS` y las elecciones por referencia; devuelve {código: (referencia, ítem fuente)}.

    Las referencias que leen una aplicación llevan ya su `aplicacion_id` y no tienen ítem fuente (None)."""
    instrumentos = {i.id: i for i in sesion.scalars(select(modelos.Instrumento))}
    items_instrumento = {i.codigo: i for i in sesion.scalars(select(modelos.ItemInstrumento))}
    presentados = set(sesion.execute(select(modelos.AplicacionActividad.aplicacion_id, modelos.ActividadItem.item_id).join(
        modelos.ActividadItem, modelos.ActividadItem.actividad_id == modelos.AplicacionActividad.actividad_id)))
    preguntas = {p.codigo: p for p in sesion.scalars(select(modelos.PreguntaDiario))}
    referencias = {}
    for codigo, (tipo_dueno, dueno), tipo, fuente in REFERENCIAS:
        if tipo not in modelos.TipoReferencia.__members__:
            raise ValueError(f'La referencia {codigo} tiene el tipo {tipo}, fuera del catálogo')
        if tipo_dueno == 'ACTIVIDAD' and dueno in actividades:
            dueno_id = dict(actividad_id=actividades[dueno].id)
        elif tipo_dueno == 'PREGUNTA_DIARIO' and dueno in preguntas:
            dueno_id = dict(pregunta_diario_id=preguntas[dueno].id)
        else:
            raise ValueError(f'La referencia {codigo} tiene un dueño inexistente: {tipo_dueno} {dueno}')
        if tipo_dueno == 'PREGUNTA_DIARIO' and not preguntas[dueno].personalizada:
            raise ValueError(f'La referencia {codigo} pertenece a {dueno}, que no es personalizada')
        if tipo in SIN_FUENTE:
            if fuente is not None:
                raise ValueError(f'La referencia {codigo} es {tipo} y no lleva fuente')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo), **dueno_id),
                                   None)
            continue
        if tipo == 'RESPUESTA_CUESTIONARIO':
            codigo_aplicacion, codigo_item = fuente
            aplicacion, item = base.aplicaciones.get(codigo_aplicacion), items_instrumento.get(codigo_item)
            if aplicacion is None or item is None or (aplicacion.id, item.id) not in presentados:
                raise ValueError(f'La referencia {codigo} lee un ítem que la aplicación {codigo_aplicacion} no presenta')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo),
                                                      aplicacion_id=aplicacion.id, item_instrumento_id=item.id,
                                                      **dueno_id), None)
            continue
        if tipo in FUENTE_APLICACION:
            aplicacion = base.aplicaciones.get(fuente)
            if aplicacion is None:
                raise ValueError(f'La referencia {codigo} lee la aplicación inexistente {fuente}')
            if instrumentos[aplicacion.instrumento_id].tipo_resultado == modelos.TipoResultado.COMPARACION:
                raise ValueError(f'La referencia {codigo} lee {fuente}, que no genera resultado')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo),
                                                      aplicacion_id=aplicacion.id, **dueno_id), None)
            continue
        if fuente not in items:
            raise ValueError(f'La referencia {codigo} lee el ítem inexistente {fuente}')
        item_fuente = items[fuente][0]
        if item_fuente.actividad_id == dueno_id.get('actividad_id'):
            raise ValueError(f'La referencia {codigo} lee un ítem de su propia actividad')
        if tipo == 'ELECCION' and item_fuente.lista_id is None:
            raise ValueError(f'La referencia {codigo} lee la elección de {fuente}, que no tiene lista')
        referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo), **dueno_id),
                               fuente)
    for codigo, (item, _, referencia) in items.items():
        if referencia is None:
            continue
        if (referencia not in referencias or referencias[referencia][0].tipo != modelos.TipoReferencia.ELECCION
                or referencias[referencia][0].actividad_id != item.actividad_id):
            raise ValueError(f'El ítem {codigo} elige por {referencia}, que no es una ELECCION de su actividad')
        fuente = items[referencias[referencia][1]][0]
        if item.eleccion_minima > fuente.eleccion_minima or item.eleccion_maxima > fuente.eleccion_maxima:
            raise ValueError(f'El ítem {codigo} pide una elección mínima o máxima mayor que la de su fuente')
    return referencias


def _insertar_en_orden(sesion, items, referencias):
    """Ítems y referencias se leen entre sí: cada ronda inserta lo que ya tiene a quién apuntar."""
    items_pendientes = dict(items)
    referencias_pendientes = dict(referencias)
    while items_pendientes or referencias_pendientes:
        listos = [codigo for codigo, (_, _, referencia) in items_pendientes.items()
                  if referencia is None or referencia not in referencias_pendientes]
        for codigo in listos:
            item, _, referencia = items_pendientes.pop(codigo)
            if referencia is not None:
                item.referencia_id = referencias[referencia][0].id
            sesion.add(item)
        sesion.flush()
        listas = [codigo for codigo, (_, fuente) in referencias_pendientes.items() if fuente not in items_pendientes]
        for codigo in listas:
            referencia, fuente = referencias_pendientes.pop(codigo)
            if fuente is not None:
                referencia.item_registro_id = items[fuente][0].id
            sesion.add(referencia)
        sesion.flush()
        if not listos and not listas:
            raise ValueError('Las referencias y las elecciones por referencia forman un ciclo')


def _cargar_salones(sesion, salones, actividades):
    instrumentos = {i.codigo: i for i in sesion.scalars(select(modelos.Instrumento))}
    for salon, instrumento, prioritario, _ in SALON_INSTRUMENTOS:
        if salon not in salones or instrumento not in instrumentos:
            raise ValueError(f'La configuración de {salon} apunta a un salón o instrumento inexistente: {instrumento}')
        if prioritario and instrumentos[instrumento].tipo_resultado == modelos.TipoResultado.COMPARACION:
            raise ValueError(f'{instrumento} es obligatorio por diseño y no admite la marca de prioritario')
    for salon, actividad in SALON_ACTIVIDADES_PRIORITARIAS:
        if salon not in salones or actividad not in actividades:
            raise ValueError(f'El prioritario de {salon} apunta a un salón o actividad inexistente: {actividad}')
        if actividades[actividad].tipo != modelos.TipoActividad.REGISTRO:
            raise ValueError(f'El prioritario {actividad} de {salon} no es una actividad de registro')
    sesion.add_all(modelos.SalonInstrumento(salon_id=salones[s].id, instrumento_id=instrumentos[i].id,
                                            es_prioritario=p, visible_apoderado=v) for s, i, p, v in SALON_INSTRUMENTOS)
    sesion.add_all(modelos.SalonActividadPrioritaria(salon_id=salones[s].id, actividad_id=actividades[a].id)
                   for s, a in SALON_ACTIVIDADES_PRIORITARIAS)


def _cargar_reglas(sesion, objetivos):
    referencias = {'COMPLETA_ACTIVIDAD': objetivos['ACTIVIDAD'], 'COMPLETA_BLOQUE': objetivos['BLOQUE'],
                   'REGISTRO_ADECUADO': objetivos['ACTIVIDAD'], 'REVELA_RESULTADO': objetivos['APLICACION'],
                   'SUPERA_CASO': objetivos['ACTIVIDAD'], 'SUPERA_BATALLA': objetivos['ACTIVIDAD']}
    reglas = []
    for codigo, tipo, objetivo, mensaje, condiciones in REGLAS:
        if not mensaje.strip():
            raise ValueError(f'La regla {codigo} no tiene mensaje de bloqueo')
        regla = modelos.ReglaDesbloqueo(codigo=codigo, nombre=f'Desbloquear {objetivo}', mensaje_bloqueo=mensaje,
            tipo_objetivo=modelos.TipoObjetivo(tipo), id_objetivo=objetivos[tipo][objetivo].id,
            evaluador_especial=EVALUADORES_REGLAS.get(codigo, (None, None))[0],
            parametro_evaluador=EVALUADORES_REGLAS.get(codigo, (None, None))[1])
        regla.condiciones = [modelos.CondicionDesbloqueo(tipo_evento=modelos.TipoEventoUso(evento),
            id_referencia=None if referencia is None else referencias[evento][referencia].id,
            tipo_conteo=modelos.TipoConteo(conteo), cantidad_minima=cantidad)
            for evento, referencia, conteo, cantidad in condiciones]
        reglas.append(regla)
    sesion.add_all(reglas)


def _letras(filas, duenos, dimensiones, modelo, columna):
    """Valida filas (dueño, posición, letra) y devuelve las filas del modelo y el código de cada dueño («RIS»)."""
    por_dueno = {}
    for dueno, posicion, letra in filas:
        if dueno not in duenos:
            raise ValueError(f'Letras RIASEC de {dueno}, que no existe o no tiene código')
        if letra not in dimensiones:
            raise ValueError(f'Letra RIASEC inválida en {dueno}: {letra}')
        if posicion in por_dueno.setdefault(dueno, {}):
            raise ValueError(f'Posición repetida en las letras de {dueno}: {posicion}')
        por_dueno[dueno][posicion] = letra
    codigos = {}
    for dueno, posiciones in por_dueno.items():
        if sorted(posiciones) != list(range(1, len(posiciones) + 1)) or len(posiciones) > 3:
            raise ValueError(f'Las letras de {dueno} deben ocupar posiciones consecutivas desde 1, hasta 3')
        letras = [posiciones[p] for p in sorted(posiciones)]
        if len(set(letras)) != len(letras):
            raise ValueError(f'Letra repetida en {dueno}')
        codigos[dueno] = ''.join(letras)
    return [modelo(**{columna: duenos[d].id}, posicion=p, dimension_id=dimensiones[letra].id)
            for d, p, letra in filas], codigos


def _cargar_catalogo(sesion):
    dimensiones = {d.codigo: d for d in sesion.scalars(select(modelos.Dimension).join(modelos.Instrumento).where(
        modelos.Instrumento.codigo == 'TEST-RIASEC'))}
    ocupaciones = {o.codigo: o for o in sesion.scalars(select(modelos.Ocupacion).where(
        modelos.Ocupacion.codigo.is_not(None)))}
    carreras = {c.codigo: c for c in sesion.scalars(select(modelos.Carrera))}
    high_points, codigos = _letras(HIGH_POINTS, ocupaciones, dimensiones, modelos.HighPoint, 'ocupacion_id')
    faltantes = sorted(set(ocupaciones) - set(codigos))
    if faltantes:
        raise ValueError(f'Ocupaciones con código sin high points: {", ".join(faltantes)}')
    for codigo, letras in codigos.items():
        ocupaciones[codigo].codigo_riasec = letras
    tipos, codigos = _letras(TIPOS_CARRERA, carreras, dimensiones, modelos.TipoCarrera, 'carrera_id')
    for codigo, letras in codigos.items():
        carreras[codigo].codigo_riasec = letras
    for codigo, conocimientos in CONOCIMIENTOS_OCUPACIONES:
        ocupaciones[codigo].conocimientos = list(conocimientos)
    ubicaciones = {c: modelos.Ubicacion(codigo=c, nombre=n) for c, n in UBICACIONES}
    sesion.add_all([*high_points, *tipos, *ubicaciones.values()])
    sesion.flush()
    instituciones = {c: modelos.Institucion(codigo=c, nombre=n, tipo=modelos.TipoInstitucion(t),
                                            gestion=None if g is None else modelos.GestionInstitucion(g),
                                            ubicacion_id=ubicaciones[u].id, descripcion=d, pagina_web=w)
                     for c, n, t, g, u, d, w, _ in INSTITUCIONES}
    ingresos = {c: modelos.IngresoCarrera(carrera_id=carreras[c].id, promedio_mensual=p, fuente=f, anio=a)
                for c, p, f, a, _ in INGRESOS}
    sesion.add_all([*instituciones.values(), *ingresos.values()])
    sesion.flush()
    ofrecidas = {(i, c) for i, *_, carreras_institucion in INSTITUCIONES for c in carreras_institucion}
    duraciones = {(i, c): ciclos for i, c, ciclos in DURACIONES_CICLOS}
    for (i, c), ciclos in duraciones.items():
        if (i, c) not in ofrecidas:
            raise ValueError(f'Duración de {c} en {i}, que no la ofrece')
        if ciclos < 1:
            raise ValueError(f'Duración inválida de {c} en {i}: {ciclos}')
    sesion.add_all(modelos.InstitucionCarrera(institucion_id=instituciones[i].id, carrera_id=carreras[c].id,
                                              duracion_ciclos=duraciones.get((i, c)))
                   for i, c in sorted(ofrecidas))
    sesion.add_all(modelos.RangoIngreso(ingreso_carrera_id=ingresos[c].id, posicion=posicion, minimo=minimo,
                                        maximo=maximo, porcentaje=porcentaje)
                   for c, *_, rangos in INGRESOS
                   for posicion, (minimo, maximo, porcentaje) in enumerate(rangos, start=1))


def cargar(sesion: Session) -> None:
    base = fijos.cargar(sesion)
    objetivos = {**_cargar_estructura(sesion), 'SECCION': base.secciones, 'APLICACION': base.aplicaciones,
                 'SECCION_PLAN': base.secciones_tarjeta}
    _unir_instrumentos(sesion, objetivos['ACTIVIDAD'], base)
    _unir_tematicas(sesion, objetivos['ACTIVIDAD'], base)
    _unir_dimensiones(sesion, objetivos['ACTIVIDAD'])
    _cargar_catalogo(sesion)
    _cargar_registros(sesion, objetivos['ACTIVIDAD'], base)
    _cargar_salones(sesion, objetivos.pop('SALON'), objetivos['ACTIVIDAD'])
    _cargar_reglas(sesion, objetivos)
    sesion.flush()
    validar_distribucion_items(sesion)
