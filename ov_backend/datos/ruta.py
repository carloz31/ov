"""Ruta mínima de prueba: lo justo para demostrar cada mecánica.

DATO DE PRUEBA: todo este módulo. Los códigos `t-...` nombran la mecánica que prueban.
Cada lote agrega filas en este formato; el cargador común (`datos/cargador.py`) las interpreta sin lógica a medida.
La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

import sys

from sqlalchemy.orm import Session

from app.core.parametros import UMBRALES_AMISTAD
from datos import cargador
from datos.cargador import contenido  # noqa: F401  (clave de contenido de cada actividad)
from datos.fijos import validar_distribucion_items


# (código, nombre)
SALONES = (('5A', 'Quinto A'), ('5B', 'Quinto B'))

# (código, nombre, rol, salón, correo, contraseña). B17: credenciales de prueba, iguales a las de
# `datos/usuarios_prueba.txt` y a los usuarios del modo local del front. Los correos usan example.com (reservado).
CUENTAS = (('est-ana', 'Ana', 'ESTUDIANTE', '5A', 'ana.estudiante@example.com', 'Ana2026!'),
           ('est-luis', 'Luis', 'ESTUDIANTE', '5A', 'luis.estudiante@example.com', 'Luis2026!'),
           ('est-beto', 'Beto', 'ESTUDIANTE', '5B', 'beto.estudiante@example.com', 'Beto2026!'),
           # DATO DE PRUEBA (Ajuste leyenda): compañeros de 5A que no son autores, para llegar a FAVORITOS_LEYENDA.
           ('est-mia', 'Mía', 'ESTUDIANTE', '5A', 'mia.estudiante@example.com', 'Mia2026!'),
           ('est-teo', 'Teo', 'ESTUDIANTE', '5A', 'teo.estudiante@example.com', 'Teo2026!'),
           ('est-sol', 'Sol', 'ESTUDIANTE', '5A', 'sol.estudiante@example.com', 'Sol2026!'),
           ('apo-rosa', 'Rosa', 'APODERADO', None, 'rosa.apoderada@example.com', 'Rosa2026!'),
           ('ori-carmen', 'Carmen', 'ORIENTADORA', None, 'carmen.orientadora@example.com', 'Carmen2026!'))

# (orientadora, salón, es principal)
ORIENTADORAS_SALONES = (('ori-carmen', '5A', True),)

# (código, estudiante, apoderado, parentesco)
# F08: un segundo hijo para el selector del apoderado; Ana sigue siendo el primer vínculo.
VINCULOS = (('VIN-ANA', 'est-ana', 'apo-rosa', 'madre'), ('VIN-LUIS', 'est-luis', 'apo-rosa', 'madre'))

# Configuración del salón (B07; la orientadora la editará en B14). (salón, instrumento, prioritario, visible al
# apoderado): un cuestionario prioritario es requisito de T2. El de partida y llegada (COMPARACION) es obligatorio
# por diseño y no admite la marca de prioritario.
SALON_INSTRUMENTOS = (('5A', 'TEST-RIASEC', True, True),)
# (salón, actividad de registro): registros que la orientadora ve destacados en el perfil.
SALON_ACTIVIDADES_PRIORITARIAS = (('5A', 't-expectativas'),)

# (código, número, nombre, espacio, audiencia)
BLOQUES = (('T0', 1, 'Inicio', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T1', 2, 'Camino', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T2', 3, 'Decisión', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('CIUDAD', 4, 'La ciudad', 'CIUDAD', 'ESTUDIANTE'),
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'),
           # Ajuste del diario (F05): los recuerdos de Lumi; no se pinta en el mapa.
           ('LUMI', 5, 'La historia de Lumi', 'LUMI', 'ESTUDIANTE'))

# (código, bloque, título, tipo, puntaje mínimo de un CASO en puntos de satisfacción, duración estimada en minutos). El orden es el de la
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
               # Ajuste carga-instrumentos: una misión por instrumento real, para que su aplicación presente todos
               # sus ítems.
               ('t-mision-inteligencias', 'CIUDAD', 'Misión de inteligencias', 'CUESTIONARIO', None, 8),
               ('t-mision-habilidades', 'CIUDAD', 'Misión de habilidades sociales', 'CUESTIONARIO', None, 5),
               ('t-caso', 'CIUDAD', 'Caso de prueba', 'CASO', 6, 10),
               ('t-contraste', 'CIUDAD', 'Registro de contraste de intereses', 'REGISTRO', None, 10),
               # Ajuste mochila: un llamado que el recorrido nunca abre, para las voces que aún no se listan.
               ('t-caso-2', 'CIUDAD', 'La traductora apurada', 'CASO', 6, 10),
               # B13: la misión que abre Investigaciones y la que vuelve tras publicar la primera entrevista.
               ('t-investigador', 'CIUDAD', 'El investigador de oficios', 'INFORMATIVA', None, 5),
               ('t-investigador-cierre', 'CIUDAD', 'Lo que cambió', 'REGISTRO', None, 10),
               ('t-apo-1', 'FAMILIA', 'Primera actividad del apoderado', 'INFORMATIVA', None, 10),
               ('t-apo-2', 'FAMILIA', 'Segunda actividad del apoderado', 'INFORMATIVA', None, 10),
               # DATO DE PRUEBA: un recuerdo de Lumi por nivel de amistad (ajuste del diario de F05).
               ('t-lumi-1', 'LUMI', 'Cómo llegué a este mundo', 'INFORMATIVA', None, 3),
               ('t-lumi-2', 'LUMI', 'Recuerdo de prueba 2', 'INFORMATIVA', None, 3),
               ('t-lumi-3', 'LUMI', 'Recuerdo de prueba 3', 'INFORMATIVA', None, 3),
               ('t-lumi-4', 'LUMI', 'Recuerdo de prueba 4', 'INFORMATIVA', None, 3),
               ('t-lumi-5', 'LUMI', 'Recuerdo de prueba 5', 'INFORMATIVA', None, 3))
# Los recuerdos no cuentan en el avance de la ruta ni del apoderado (opcionales) y se ven bloqueados (SIEMPRE).
RECUERDOS_LUMI = tuple(codigo for codigo, bloque, *_ in ACTIVIDADES if bloque == 'LUMI')

# Lo que cambia los valores por defecto (requerida, visibilidad SIEMPRE).
PROPIEDADES = {'t-opcional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               # Las opcionales aparecen en el mapa cuando se desbloquean (F00).
               't-valores': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-eco': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-lee-cuestionario': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-batalla': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-explorar': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-adicional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-caso-2': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-investigador': {'requerida': False},
               't-mision-inteligencias': {'requerida': False},
               't-mision-habilidades': {'requerida': False},
               't-investigador-cierre': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               **{codigo: {'requerida': False} for codigo in RECUERDOS_LUMI}}

# Texto de presentación de cada actividad (`descripcion`): el front lo muestra tal cual en el mapa y en
# el portal del apoderado. DATO DE PRUEBA, como toda la ruta.
DESCRIPCIONES = {
    't-inicio': 'Conoce cómo se recorre el camino y qué te espera en cada tramo.',
    't-partida': 'Cuéntanos cómo te sientes hoy frente a tu futuro; no hay respuestas correctas.',
    't-cierre-inicio': 'Cierra el inicio y abre el camino.',
    't-expectativas': 'Escribe qué esperas descubrir en este camino.',
    't-opcional': 'Actividad opcional que aparece al desbloquearse.',
    't-valores': 'Elige y ordena lo que más valoras.',
    't-adicional': 'Misión adicional que aparece si el registro quedó adecuado.',
    't-eco': 'Vuelve a tus respuestas y mira cómo han cambiado.',
    't-lee-cuestionario': 'Lee lo que respondiste en tu punto de partida.',
    't-batalla': 'Pon a prueba lo que sabes; puedes reintentar.',
    't-explorar': 'Explora carreras distintas entre tus favoritas.',
    't-llegada': 'Responde de nuevo para ver cuánto avanzaste desde el punto de partida.',
    't-comparar': 'Compara tus planes de carrera.',
    't-proyecto': 'Escribe tu proyecto con tu plan y tus próximos pasos.',
    't-mision-intereses': 'Descubre qué actividades te interesan.',
    't-mision-intereses-2': 'Sigue descubriendo tus intereses.',
    't-mision-inteligencias': 'Descubre qué inteligencias usas más hoy.',
    't-mision-habilidades': 'Descubre cómo te relacionas con los demás.',
    't-caso': 'Ayuda a resolver un caso de la ciudad.',
    't-contraste': 'Contrasta tu resultado de intereses con lo que esperabas.',
    't-caso-2': 'Un llamado que la Central todavía no publica.',
    't-investigador': 'Conoce cómo investigar una ocupación entrevistando a quien la ejerce.',
    't-investigador-cierre': 'Compara lo que pensabas antes de tu entrevista con lo que aprendiste.',
    't-apo-1': 'Conozca cómo acompañar a su hijo en este proceso.',
    't-apo-2': 'Conozca cómo decide un adolescente.',
}

# (actividad, instrumento, primer ítem, último ítem). El RIASEC va en dos misiones para probar que el
# resultado espera a todas las de su aplicación.
ITEMS_ACTIVIDADES = (('t-mision-intereses', 'TEST-RIASEC', 1, 30),
                     ('t-mision-intereses-2', 'TEST-RIASEC', 31, 60),
                     ('t-mision-inteligencias', 'TEST-INTELIGENCIAS', 1, 35),
                     ('t-mision-habilidades', 'TEST-HABILIDADES', 1, 24),
                     ('t-partida', 'TEST-PARTIDA-LLEGADA', 1, 19),
                     ('t-llegada', 'TEST-PARTIDA-LLEGADA', 1, 19))

# (aplicación, actividad)
APLICACIONES_ACTIVIDADES = (('APL-RIASEC', 't-mision-intereses'), ('APL-RIASEC', 't-mision-intereses-2'),
                            ('APL-PARTIDA', 't-partida'), ('APL-LLEGADA', 't-llegada'),
                            ('APL-INTELIGENCIAS', 't-mision-inteligencias'),
                            ('APL-HABILIDADES', 't-mision-habilidades'))

# (actividad, temáticas). Solo las necesarias para contar actividades completadas por dimensión (B07).
TEMATICAS_ACTIVIDADES = (('t-expectativas', ('A', 'B')), ('t-valores', ('B',)), ('t-eco', ('A',)),
                         ('t-mision-intereses', ('B',)), ('t-caso', ('C',)))


# --- Catálogo (B10, F06) ---
# El catálogo es real y lo carga `fijos` (`datos/catalogo.py`). La ruta solo nombra, por su código real, las
# carreras, instituciones y ubicaciones con que las pruebas demuestran cada mecánica.
CARRERAS_RUTA = {
    'psychology': 'mtpe-369',
    'civil-engineering': 'mtpe-106',
    'environmental-engineering': 'mtpe-176',
    'journalism': 'mtpe-291',  # Ciencias de la Comunicación: ninguna pública dicta Periodismo (mtpe-14)
    'nursing': 'mtpe-308',
    'veterinary-medicine': 'mtpe-115',
}
# B11: t-uni (pública) y t-privada ofrecen la misma carrera (Ingeniería Ambiental), para la precarga de la pensión.
INSTITUCIONES_RUTA = {
    't-uni': 'inst-63',             # Universidad Nacional Federico Villarreal, pública, Lima
    't-privada': 'inst-83',         # Universidad Peruana Unión, privada, Lima
    't-cusco-privada': 'inst-4',    # Universidad Andina del Cusco, privada
    't-tecnico': 'inst-408',        # IEST Público Faustino B. Franco, Arequipa
    't-ffaa': 'inst-966',           # Escuela Militar de Chorrillos
}
UBICACIONES_RUTA = {'t-lima': 'dep-15', 't-cusco': 'dep-8', 't-arequipa': 'dep-4'}

# DATO DE PRUEBA: (institución, carrera, ciclos). Reemplaza la duración derivada de la carrera; la de 11 ciclos
# prueba la duración impar (B11).
DURACIONES_CICLOS = (('t-privada', 'environmental-engineering', 11),)

# DATO DE PRUEBA: (carrera, letras RIASEC). Mientras `carreras_riasec.csv` no llegue, las carreras reales no tienen
# letras; estas las reciben solo si no traen las suyas, para que las mecánicas de la ruta (t-explorar, carreras
# recomendadas, sugerencias) sigan demostrándose.
TIPOS_CARRERA = (('environmental-engineering', 'IR'), ('journalism', 'AES'), ('nursing', 'S'),
                 ('civil-engineering', 'RI'), ('psychology', 'SIA'), ('veterinary-medicine', 'IRS'))

# Listas propias de una actividad: (código, nombre, ((código, texto), ...)).
LISTAS = (('t-lista-apoyos', 'Quién te apoya', (('FAMILIA', 'Mi familia'), ('DOCENTES', 'Mis docentes'),
                                                ('AMIGOS', 'Mis amigos'))),
          ('t-lista-valores', 'Valores', (('SERVIR', 'Servir a otros'), ('CREAR', 'Crear cosas nuevas'),
                                          ('ESTABILIDAD', 'Tener estabilidad'), ('RECONOCIMIENTO', 'Ser reconocido'),
                                          ('LIBERTAD', 'Tener libertad'))),
          ('t-lista-cambio', 'En tu lista', (('SUBE', 'Sube en mi lista'), ('IGUAL', 'Se queda igual'),
                                             ('BAJA', 'Baja en mi lista'))))

# (actividad, código, nombre, consigna, elección, criterios). El orden es el de la tupla dentro de cada
# actividad. Elección: None o (lista, mínima, máxima, ordenada, permite «otra»[, referencia]); la referencia
# (F02), una ELECCION de la misma actividad sobre la misma lista, solo marca lo elegido la vez pasada. Criterio: (código, tipo,
# descripción); la repregunta sale de `fijos.REPREGUNTAS_CRITERIO`.
ITEMS_REGISTRO = (
    ('t-expectativas', 't-exp-ruta', 'Tu ruta después del colegio',
     '¿Qué te gustaría hacer al terminar el colegio y por qué?',
     ('RUTAS_DESPUES_COLEGIO', 1, 2, False, True), (('C1', 'RAZON', 'Por qué elige esa ruta'),)),
    ('t-expectativas', 't-exp-apoyo', 'Quién te apoya', '¿Quién te apoya en esta decisión? Cuenta un ejemplo.',
     ('t-lista-apoyos', 1, 1, False, False), (('C1', 'EJEMPLO', 'Un ejemplo concreto de apoyo'),)),
    ('t-expectativas', 't-exp-espera', 'Lo que esperan de ti', '¿Qué esperan de ti las personas cercanas?', None,
     (('C1', 'EJEMPLO', 'Una expectativa concreta'), ('C2', 'RAZON', 'Por qué cree que la tienen'))),
    ('t-valores', 't-val-orden', 'Tus valores',
     'Ordena los tres valores más importantes para ti y explica el primero.',
     ('t-lista-valores', 3, 3, True, False), (('C1', 'RAZON', 'Por qué el primero es el más importante'),)),
    ('t-valores', 't-val-libre', 'Lo que piensas de tus valores', 'Escribe lo que quieras sobre tus valores.', None,
     ()),
    ('t-valores', 't-val-breve', 'Un momento con tus valores',
     'Describe un momento en que actuaste según tus valores.', None, ()),
    ('t-eco', 't-eco-ruta', 'Tu ruta, hoy',
     'La vez pasada elegiste una ruta. ¿Sigues pensando igual o cambiaste de idea? Cuéntame por qué.',
     ('RUTAS_DESPUES_COLEGIO', 1, 2, False, True, 't-ref-rutas'),
     (('C1', 'RAZON', 'Por qué mantiene o cambia su ruta'),)),
    # La consigna de un ítem con eco no supone que haya cita: funciona en cualquier estado del eco (F02).
    ('t-eco', 't-eco-espera', 'Lo que esperan de ti, hoy',
     '¿Qué esperan de ti las personas cercanas hoy? ¿Ha cambiado algo?', None, ()),
    ('t-contraste', 't-con-contraste', 'Contraste',
     '¿En qué se parece tu resultado a lo que pensabas de ti? ¿En qué se diferencia?', None,
     (('C1', 'CONTRASTE', 'Compara el resultado con lo que pensaba antes'),)),
    ('t-explorar', 't-explorar-sorpresa', 'Lo inesperado', '¿Qué opción fuera de tu perfil te llamó la atención y por qué?',
     None, (('C1', 'RAZON', 'Por qué le llamó la atención'),)),
    ('t-comparar', 't-comparar-eleccion', 'Comparación', 'Compara tus planes: ¿cuál te convence más y por qué?',
     None, (('C1', 'RAZON', 'Por qué ese plan le convence más'),)),
    ('t-proyecto', 't-proyecto-paso', 'Mi proyecto', '¿Cuál de tus pasos vas a dar primero y qué esperas averiguar?',
     None, (('C1', 'ACCION', 'Qué paso dará primero'),)),
    # B13 · HU-101: contrasta lo que pensaba (LO_QUE_PIENSO) con lo que aprendió en la entrevista.
    ('t-investigador-cierre', 't-cierre-cambio', 'Lo que cambió',
     '¿Qué cambió en lo que pensabas de la ocupación después de tu entrevista?', None,
     (('C1', 'CONTRASTE', 'Compara lo que pensaba antes con lo que aprendió'),)),
    ('t-investigador-cierre', 't-cierre-lista', 'En tu lista', '¿La ocupación sube o baja en tu lista? ¿Por qué?',
     ('t-lista-cambio', 1, 1, False, False), (('C1', 'RAZON', 'Por qué sube, baja o se queda igual'),)),
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
               ('t-ref-opcion-inicial', ('ACTIVIDAD', 't-proyecto'), 'OPCION_INICIAL', None),
               ('t-ref-lo-que-pienso', ('ACTIVIDAD', 't-investigador-cierre'), 'LO_QUE_PIENSO', None))

# Lo que cambia los valores por defecto de un ítem (obligatorio, sin longitud mínima).
PROPIEDADES_ITEMS = {'t-val-breve': {'min_caracteres': 40}}

# (código, título, descripción, tema, contenido, audiencia). El contenido es markdown y no repite el título
# (ajuste mochila).
FICHAS = (
    ('t-ficha', 'Ficha de prueba',
     'Creencias frecuentes sobre las carreras y qué dicen los datos.', 'Mitos y creencias',
     'Muchas decisiones se toman sobre frases que todos repiten y nadie revisa. Esta ficha reúne dos de las más '
     'comunes.\n\n### «Esa carrera no tiene futuro»\n\nImporta menos cuántos trabajan hoy que cómo cambia esa '
     'cifra y en qué ocupaciones terminan.\n\n> Pregunta clave: ¿quién lo dice, con qué dato y de qué año?\n\n'
     '### «Si estudias eso vas a ganar poco»\n\n- El ingreso depende de la ocupación.\n- También de la '
     'experiencia y del lugar.\n\nRevisa los rangos en [Ponte en Carrera](https://www.ponteencarrera.pe).',
     'ESTUDIANTE'),
    ('t-ficha-2', 'Segunda ficha de prueba', 'Tres preguntas para distinguir lo que te gusta de lo que se te da bien.',
     'Proyecto de vida',
     'Lo que te gusta y lo que se te da bien no siempre coinciden.\n\n### Tres preguntas\n\n1. ¿Qué harías '
     'aunque nadie te lo pidiera?\n2. ¿En qué te piden ayuda?\n3. ¿Qué te cuesta menos que a otros?',
     'ESTUDIANTE'),
    ('t-ficha-3', 'Carrera, ocupación e institución', 'Por qué no son lo mismo y cómo se relacionan entre sí.',
     'Mundo laboral',
     'Una **carrera** es lo que estudias; una **ocupación**, lo que haces al trabajar; una **institución**, dónde '
     'estudias.\n\n### Cómo se relacionan\n\nUna carrera lleva a varias ocupaciones, y una ocupación recibe gente '
     'de varias carreras.', 'ESTUDIANTE'),
    ('t-ficha-apo', 'Ficha del apoderado', 'Cómo acompañar sin decidir por tu hijo.', 'Acompañamiento',
     'Ficha que otorga t-apo-1.', 'APODERADO'),
)

# (código, batalla, ficha, enunciado, opciones, índice de la correcta, explicación). Pool de cada batalla:
# cada intento toma sus preguntas por intento (CONFIGURACION_BATALLAS) al azar. Las 10 primeras vienen de desafio-rumor del front (F04b);
# las fichas de la batalla se derivan de estas preguntas.
PREGUNTAS_BATALLA = (
    ('t-batalla-p01', 't-batalla', 't-ficha', '¿Qué convierte una frase en un mito vocacional?',
     ('Repetirla sin comprobarla', 'Buscar evidencia', 'Comparar fuentes', 'Revisar su fecha'), 0,
     'Que una frase se repita no demuestra que sea cierta ni que aplique a todas las personas.'),
    ('t-batalla-p02', 't-batalla', 't-ficha-2', '¿Qué conviene revisar ante un consejo de hace veinte años?',
     ('Cuántas veces se repitió', 'Si aplica a la situación de hoy', 'La popularidad del consejo',
      'Solo quién lo contó'), 1,
     'Una experiencia de otra época puede no describir el mercado laboral actual.'),
    ('t-batalla-p03', 't-batalla', 't-ficha', '¿Qué rutas pueden conducir a un buen trabajo?',
     ('Solo la universidad', 'Solo la formación técnica', 'Universidad, técnica, oficios y emprendimiento',
      'Solo la ruta más popular'), 2,
     'Existen distintas rutas válidas, según tus objetivos y las condiciones de cada formación.'),
    ('t-batalla-p04', 't-batalla', 't-ficha', '¿Qué determina si puedes ejercer una profesión?',
     ('Tu género', 'Los estereotipos', 'Lo que estudian tus amigos', 'Tus habilidades, conocimientos e interés'), 3,
     'Las habilidades se desarrollan. Ninguna profesión exige un sexo para ejercerla.'),
    ('t-batalla-p05', 't-batalla', 't-ficha-2', '¿Cómo considerar los ingresos al elegir?',
     ('Combinar interés y datos de ingresos y empleabilidad', 'Ignorar tus intereses', 'Ignorar el dinero',
      'Seguir el sueldo más alto sin investigar'), 0,
     'Lo sensato es combinar tus intereses con información real sobre las condiciones de trabajo.'),
    ('t-batalla-p06', 't-batalla', 't-ficha', '¿Qué significa elegir una carrera?',
     ('Una sentencia para toda la vida', 'Un primer paso que puede evolucionar', 'Renunciar a aprender otras cosas',
      'Acertar una única respuesta perfecta'), 1,
     'Las trayectorias cambian: puedes especializarte, combinar áreas o cambiar de rumbo.'),
    ('t-batalla-p07', 't-batalla', 't-ficha', '¿Qué conviene hacer antes de aceptar una creencia?',
     ('Repetirla', 'Aceptar la más popular', 'Preguntar por la evidencia a favor y en contra',
      'Buscar solo casos que la confirmen'), 2,
     'Buscar evidencia y contraejemplos ayuda a decidir con información.'),
    ('t-batalla-p08', 't-batalla', 't-ficha-2', '¿De qué pueden depender los ingresos dentro de una carrera?',
     ('Solo del nombre de la carrera', 'Solo de su prestigio', 'Solo de su popularidad',
      'De la institución, experiencia y especialización'), 3,
     'Los ingresos varían dentro de una misma carrera y dependen de distintos factores.'),
    ('t-batalla-p09', 't-batalla', 't-ficha-2', '¿Qué ocurre con las habilidades al cambiar de campo?',
     ('Algunas se transfieren a otras áreas', 'Todas dejan de servir', 'Nunca pueden desarrollarse',
      'Solo sirven en el primer empleo'), 0,
     'Comunicarte, resolver problemas y trabajar en equipo puede servirte en otras áreas.'),
    ('t-batalla-p10', 't-batalla', 't-ficha-2', '¿Qué demuestra la experiencia de una sola persona?',
     ('Lo que pasará a todo el mundo', 'Un caso que conviene contrastar', 'Que no necesitas más información',
      'Que el mercado nunca cambia'), 1,
     'Una experiencia personal es valiosa, pero es un solo caso. Contrástala con otros datos.'),
    ('t-batalla-p11', 't-batalla', 't-ficha', '¿Qué dice un estereotipo sobre una profesión?',
     ('Una generalización que no aplica a todos', 'Un dato comprobado', 'Una regla del colegio',
      'Un requisito legal'), 0,
     'Un estereotipo generaliza: no describe a cada persona ni sus posibilidades.'),
    ('t-batalla-p12', 't-batalla', 't-ficha', 'Si te gusta algo poco común, ¿qué conviene hacer?',
     ('Abandonarlo', 'Explorar cómo se aplica en distintos trabajos', 'Esperar que alguien decida por ti',
      'Elegir lo que eligen todos'), 1,
     'Un interés poco común puede conectar con varias ocupaciones; vale la pena explorarlo.'),
    ('t-batalla-p13', 't-batalla', 't-ficha-2', '¿Qué fuente es más confiable para conocer el empleo de una carrera?',
     ('Un rumor en redes', 'Datos oficiales y actualizados', 'Un comentario aislado', 'Un anuncio publicitario'), 1,
     'Las fuentes oficiales y actualizadas permiten comparar con más precisión.'),
    ('t-batalla-p14', 't-batalla', 't-ficha-2', 'Si alguien dice que una carrera «no tiene futuro», ¿qué haces?',
     ('La descartas de inmediato', 'Buscas datos actuales de empleabilidad', 'Preguntas solo a tus amigos',
      'Eliges otra al azar'), 1,
     'Una afirmación general se contrasta con datos actuales antes de decidir.'),
)
# (vidas del enemigo, destellos, preguntas por intento) de cada BATALLA (F04c). Las preguntas por intento
# deben alcanzar para terminar (vidas + destellos - 1) y el pool debe tener al menos el doble. Las vidas y
# los destellos de t-batalla son los de desafio-rumor.
CONFIGURACION_BATALLAS = {'t-batalla': (5, 3, 7)}

# DATO DE PRUEBA. (puntaje máximo, necesidades por problema) de cada CASO, en puntos de satisfacción: el
# máximo es el total de necesidades. t-caso y t-caso-2 juegan hidden-plaza: sus necesidades son las de
# ov_frontend/src/data/cases/plataforma/hidden-plaza.json, en orden de fase y problema. Mantener sincronizado
# con ese archivo (lo comprueba scripts/verificar_contenido_front.py).
CONFIGURACION_CASOS = {'t-caso': (8, (2, 1, 2, 2, 1)), 't-caso-2': (8, (2, 1, 2, 2, 1))}

# (código, título, descripción, enlace, pista, persona, ocupación, años de experiencia, cita). La pista se
# muestra mientras el testimonio está bloqueado (B08); la descripción es el texto completo y el enlace, el
# video. DATO DE PRUEBA: persona, cita, texto y video adaptados de los testimonios del front
# (`professionalTestimonials` en ov_frontend/src/data/catalog/occupations.ts). Las ocupaciones son necesidades
# de hidden-plaza, el caso que los regala (ajuste carga-casos).
TESTIMONIOS = (
    ('t-testimonio-1', 'Calma y cuidado en una emergencia',
     'Mi trabajo consiste en evaluar rápidamente qué ocurre, brindar los primeros cuidados y decidir qué necesita '
     'la persona antes de llegar a un hospital. Cada situación es diferente y por eso practicamos constantemente. '
     'También aprendí que explicar con calma lo que estamos haciendo puede ayudar tanto como una intervención '
     'técnica.', 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
     'Resuelve el caso de prueba para conocer este testimonio.', 'Luis Mendoza', '19-3091.00', 5,
     'Ayudar en una emergencia exige técnica, calma y una comunicación muy humana.'),
    ('t-testimonio-2', 'Puentes entre idiomas',
     'Trabajo con invitados, conferencistas y equipos de producción de distintos países. Antes de cada evento '
     'investigo el tema y preparo vocabulario especializado. Durante una conversación debo escuchar, comprender la '
     'intención y comunicarla con precisión, incluso cuando todo ocurre muy rápido.',
     'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
     'Alguien que trabaja con palabras que no son las suyas. ¿Quién será?', 'Sofía Kim', '17-2051.00', 6,
     'Traducir no es reemplazar palabras: es ayudar a que dos personas realmente se comprendan.'),
    # Ajuste mochila: dos voces de un llamado que aún no se abre (t-caso-2).
    ('t-testimonio-3', 'Datos que cuentan historias', 'Texto de prueba del tercer testimonio.',
     'https://www.youtube.com/watch?v=ysz5S6PUM-U', 'Una voz que llega con un llamado futuro.', 'Ana Torres',
     '19-3041.00', 3, 'Cita de prueba del tercer testimonio.'),
    ('t-testimonio-4', 'Un puente más', 'Texto de prueba del cuarto testimonio.',
     'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'Otra voz que llega con un llamado futuro.', 'Pedro Ríos',
     '19-3051.00', 8, 'Cita de prueba del cuarto testimonio.'),
)

# (código, orden, título, tema (chip), pregunta del estudiante, pregunta del apoderado (None: la misma), preguntas guía,
# mensaje de diferencias, algo que ya saben (F08)). El estudiante las habilita con reglas CONVERSACION; el
# apoderado, todas tras su carta.
CONVERSACIONES = (
    ('t-conv-1', 1, 'Primera conversación', 'Expectativas', '¿Qué esperas tú de tu futuro después del colegio?',
     '¿Qué espera usted del futuro de su hijo después del colegio?',
     ('¿En qué coinciden sus respuestas?', '¿Qué les sorprendió de la respuesta del otro?'),
     'Si sus respuestas son distintas, conversen sobre qué hay detrás de cada una.',
     'Recuerden lo que ya ha funcionado: acompañar también puede ser preguntar, escuchar y dar tiempo.'),
    ('t-conv-2', 2, 'Segunda conversación', 'Intereses', '¿Qué te dijo tu resultado de intereses sobre ti?', None,
     ('¿Qué parte del resultado les pareció más acertada?',),
     'Si ven el resultado de forma distinta, cuenten un ejemplo que lo explique.',
     'Un resultado describe intereses de hoy; ustedes ya conocen ejemplos que lo confirman o lo matizan.'),
)

# (código, nombre, descripción, requisito, oculta). La descripción es la historia del sello y el requisito, lo que
# pide; ninguno nombra códigos de actividad (ajuste pasaporte-perfil, F5).
INSIGNIAS = (('t-ins-1', 'La primera chispa',
              'Antes de buscar un destino decidiste mirar. Ese primer paso, el de aceptar que todavía no sabes, es el '
              'que abre todos los demás.', 'Completa la introducción de tu viaje.', False),
             ('t-ins-oculta', 'Destello intacto',
              'Enfrentaste una idea equivocada sin perder ni un destello. Contrastar lo que crees con lo que sabes te '
              'deja mirar con más claridad.', 'Vence un desafío sin perder destellos.', True),
             # B10: logros ocultos por vistas diversas del catálogo.
             ('t-ins-familias', 'Exploradora de familias',
              'Te asomaste a carreras de familias distintas. Mirar más de un territorio te ayuda a no quedarte con el '
              'primero que conoces.', 'Mira carreras de familias distintas.', True),
             ('t-ins-letras', 'Exploradora de intereses',
              'Recorriste ocupaciones guiadas por intereses distintos. Cada letra nueva es otra forma de imaginarte '
              'trabajando.', 'Mira ocupaciones de tipos distintos.', True),
             ('t-ins-instituciones', 'Exploradora de instituciones',
              'Conociste todas las formas de seguir estudiando. Saber qué puertas existen te deja elegir con más '
              'libertad.', 'Mira instituciones de todos los tipos.', True),
             # B13: publicar una entrevista y llegar a Leyenda.
             ('t-ins-entrevista', 'Voz de la ciudad',
              'Conversaste con alguien que ejerce un oficio y lo compartiste con tu salón. Preguntar a quien ya '
              'recorrió el camino lo vuelve más real.', 'Publica una entrevista.', False),
             ('t-ins-leyenda', 'Leyenda',
              'Tu entrevista quedó como Leyenda: la verán otros salones y otras promociones.',
              'Logra que tu entrevista sea Leyenda.', False))
# {insignia: (frase destacada, cómo se consiguió en pasado)}; lo que muestra el sello obtenido (F5).
TEXTOS_INSIGNIAS = {
    't-ins-1': ('Una nueva mirada viaja contigo.', 'completaste la introducción de tu viaje.'),
    't-ins-oculta': ('La información hace brillar tu camino.', 'venciste un desafío sin perder destellos.'),
    't-ins-familias': ('Un mapa crece cuando visitas más de un territorio.', 'miraste carreras de familias distintas.'),
    't-ins-letras': ('Cada interés abre una ventana distinta.', 'miraste ocupaciones de tipos distintos.'),
    't-ins-instituciones': ('Conocer las puertas también es avanzar.', 'miraste instituciones de todos los tipos.'),
    't-ins-entrevista': ('Preguntar abre caminos.', 'publicaste una entrevista.'),
    't-ins-leyenda': ('Tu voz llega lejos.', 'tu entrevista llegó a Leyenda.'),
}

# Páginas del pasaporte (ajuste pasaporte-perfil): (código, nombre, orden).
GRUPOS_INSIGNIA = (('G1', 'La luz que despeja caminos', 1), ('G2', 'Huellas en la ciudad', 2))
# {insignia: (grupo, orden dentro del grupo)}; toda insignia tiene grupo.
PAGINAS_INSIGNIAS = {'t-ins-1': ('G1', 1), 't-ins-oculta': ('G1', 2), 't-ins-familias': ('G2', 1),
                     't-ins-letras': ('G2', 2), 't-ins-instituciones': ('G2', 3), 't-ins-entrevista': ('G2', 4),
                     't-ins-leyenda': ('G2', 5)}
# Pista de Lumi de cada oculta, visible mientras no se obtiene.
PISTAS_INSIGNIAS = {
    't-ins-oculta': 'No todo brillo sobrevive a una batalla. El que no se apaga ni una vez, deja huella.',
    't-ins-familias': 'Las carreras viven en familias. Visita a más de una y verás que el mapa se agranda.',
    't-ins-letras': 'Cada oficio tiene una letra que lo guía. Busca letras distintas, no la misma dos veces.',
    't-ins-instituciones': 'Hay más de una puerta para estudiar. Asómate a todas antes de elegir una.',
}

# (número, título, descripción); las descripciones son las de `travelerLevels` del front.
NIVELES = ((1, 'Observador del horizonte',
            'Estás aprendiendo a mirar tus intereses y preguntas como pistas, sin apresurarte a elegir un destino.'),
           (2, 'Recolector de pistas',
            'Ya reconoces señales sobre lo que disfrutas, lo que haces bien y los retos que despiertan tu curiosidad.'),
           (3, 'Cartógrafo de posibilidades',
            'Tu mapa personal empieza a tomar forma. Ahora puedes contrastarlo con profesiones y situaciones del '
            'mundo real.'))
# Cita de Lumi de cada nivel, bajo su descripción en el pasaporte (F5); la del 2, la del boceto.
CITAS_LUMI = {1: 'Mirar con calma también es avanzar.',
              2: 'Los títulos no dicen cuánto vales. Dicen en qué parte del camino vas.',
              3: 'Un mapa no te dice adónde ir; te muestra por dónde podrías.'}

# Preguntas del diario: (código, nombre, pregunta base, uso, personalizada, dimensión). Las DESBLOQUEABLE las
# abre una regla; las DIARIA entran al sorteo de la pregunta del día por la dimensión del cuestionario de
# partida y llegada (o sin dimensión). Las personalizadas declaran sus referencias en `REFERENCIAS`.
PREGUNTAS_DIARIO = (
    ('t-diario-fija', 'Mi primer paso', '¿Qué te gustaría descubrir de ti en este camino?', 'DESBLOQUEABLE', False, None),
    ('t-diario-personal', 'Lo que espero', '¿Cómo te sientes con lo que esperas de este camino?', 'DESBLOQUEABLE',
     True, None),
    ('t-diario-tras-conversar', 'Lo que conversamos', '¿Qué te llevas de la conversación con tu familia?',
     'DESBLOQUEABLE', False, None),
    ('t-dia-claridad-1', 'Lo que tengo claro', '¿Qué tienes hoy un poco más claro que ayer?', 'DIARIA', False, 'AUTO-A'),
    ('t-dia-claridad-2', 'Una duda', '¿Qué duda te gustaría resolver esta semana?', 'DIARIA', False, 'AUTO-A'),
    ('t-dia-mi-1', 'Algo de mí', '¿Qué hiciste hoy que disfrutaste de verdad?', 'DIARIA', False, 'AUTO-B'),
    ('t-dia-favoritos', 'Mis favoritos', '¿Qué te atrae de lo que marcaste como favorito?', 'DIARIA', True, 'AUTO-B'),
    ('t-dia-libre', 'Un momento', '¿Qué momento de hoy quieres recordar?', 'DIARIA', False, None),
)

# (código, tipo de objetivo, objetivo, mensaje de bloqueo, condiciones); cada condición:
# (evento, referencia, conteo, mínimo).
REGLAS = (
    # T0 en orden: t-inicio → t-partida → t-cierre-inicio.
    ('R-t-partida', 'ACTIVIDAD', 't-partida', 'Completa el inicio para continuar.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-cierre-inicio', 'ACTIVIDAD', 't-cierre-inicio', 'Completa tu punto de partida para continuar.',
     (('COMPLETA_ACTIVIDAD', 't-partida', 'EVENTOS', 1),)),
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
    # Además del caso, pide cerrar el proyecto: al final del recorrido sigue bloqueado con su caso disponible
    # (ajuste mochila; SUPERA_CASO se registra una sola vez, así que no puede pedir dos superaciones).
    ('R-t-testimonio-2', 'TESTIMONIO', 't-testimonio-2', 'Supera el caso de prueba y cierra tu proyecto para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso', 'EVENTOS', 1), ('COMPLETA_ACTIVIDAD', 't-proyecto', 'EVENTOS', 1))),
    ('R-t-testimonio-3', 'TESTIMONIO', 't-testimonio-3', 'Supera el segundo caso para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso-2', 'EVENTOS', 1),)),
    ('R-t-testimonio-4', 'TESTIMONIO', 't-testimonio-4', 'Supera el segundo caso para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso-2', 'EVENTOS', 1),)),
    ('R-t-caso-2', 'ACTIVIDAD', 't-caso-2', 'Completa tu proyecto para abrir este llamado.',
     (('COMPLETA_ACTIVIDAD', 't-proyecto', 'EVENTOS', 1),)),
    ('R-t-ficha', 'FICHA', 't-ficha', 'Completa el inicio para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ficha-2', 'FICHA', 't-ficha-2', 'Completa el inicio para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ficha-3', 'FICHA', 't-ficha-3', 'Completa la actividad opcional para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-opcional', 'EVENTOS', 1),)),
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
    # Ajuste pasaporte-perfil: nivel 3 con dos condiciones (la ruta corta ve una sola carrera y no lo alcanza).
    ('R-NIV-3', 'NIVEL', 3, 'Termina el bloque de inicio y mira tres carreras para subir de nivel.',
     (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1), ('VISTA_CARRERA', None, 'REFERENCIAS_DISTINTAS', 3))),
    ('R-t-apo-2', 'ACTIVIDAD', 't-apo-2', 'Completa la primera actividad.',
     (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-SEC-DIARIO', 'SECCION', 'DIARIO', 'Completa el inicio para abrir tu diario.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CATALOGO', 'SECCION', 'CATALOGO', 'Completa el inicio para abrir el catálogo.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-PLANES', 'SECCION', 'PLANES', 'Completa el inicio para abrir tus planes.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CHECK_IN', 'SECCION', 'CHECK_IN', 'Completa el cierre del inicio para hacer tu check-in.',
     (('COMPLETA_ACTIVIDAD', 't-cierre-inicio', 'EVENTOS', 1),)),
    # B13: Investigaciones se abre con una misión de la ciudad; la primera entrevista publicada trae de vuelta al
    # investigador con la misión de registro «qué cambió».
    ('R-SEC-INVESTIGACIONES', 'SECCION', 'INVESTIGACIONES', 'Completa la misión del investigador para investigar.',
     (('COMPLETA_ACTIVIDAD', 't-investigador', 'EVENTOS', 1),)),
    ('R-t-investigador-cierre', 'ACTIVIDAD', 't-investigador-cierre',
     'Publica tu primera entrevista para contar qué cambió.', (('PUBLICA_ENTREVISTA', None, 'EVENTOS', 1),)),
    ('R-t-ins-entrevista', 'INSIGNIA', 't-ins-entrevista', 'Publica una entrevista.',
     (('PUBLICA_ENTREVISTA', None, 'EVENTOS', 1),)),
    ('R-t-ins-leyenda', 'INSIGNIA', 't-ins-leyenda', 'Logra que tu entrevista sea Leyenda.',
     (('ENTREVISTA_LEYENDA', None, 'EVENTOS', 1),)),
    ('R-SEC-FAMILIA', 'SECCION', 'FAMILIA', 'Completa el registro de expectativas para abrir la sección Familia.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-diario-fija', 'PREGUNTA_DIARIO', 't-diario-fija', 'Completa el inicio para recibir esta pregunta.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-diario-personal', 'PREGUNTA_DIARIO', 't-diario-personal',
     'Completa el registro de expectativas para recibir esta pregunta.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    # B12: la carta del estudiante y una actividad habilitan cada conversación; conversada, da una pregunta del diario.
    ('R-t-conv-1', 'CONVERSACION', 't-conv-1', 'Escribe tu carta y completa el registro de expectativas para conversar.',
     (('ESCRIBE_CARTA', None, 'EVENTOS', 1), ('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1))),
    ('R-t-conv-2', 'CONVERSACION', 't-conv-2', 'Escribe tu carta y contrasta tu resultado de intereses para conversar.',
     (('ESCRIBE_CARTA', None, 'EVENTOS', 1), ('COMPLETA_ACTIVIDAD', 't-contraste', 'EVENTOS', 1))),
    ('R-t-diario-tras-conversar', 'PREGUNTA_DIARIO', 't-diario-tras-conversar',
     'Conversa en familia para recibir esta pregunta.', (('COMPLETA_CONVERSACION', 't-conv-1', 'EVENTOS', 1),)),
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
# DATO DE PRUEBA: el recuerdo n se abre al llegar al nivel n de amistad: mismo umbral y mismo conteo (eventos de
# escritura con tope diario) que la amistad con Lumi (ajuste del diario de F05).
REGLAS += tuple(
    (f'R-{codigo}', 'ACTIVIDAD', codigo, f'Escríbele a Lumi para que te cuente su recuerdo ({umbral} cartas).',
     (('ESCRIBE_ENTRADA_DIARIO', None, 'EVENTOS_TOPE_DIARIO', umbral),))
    for codigo, umbral in zip(RECUERDOS_LUMI, UMBRALES_AMISTAD, strict=True))


# Texto de cada condición, en el orden de la regla (ajuste pasaporte-perfil): lo que el pasaporte muestra en la
# lista de condiciones. Las reglas que no están aquí guardan sus condiciones sin texto.
TEXTOS_CONDICIONES = {
    'R-t-ins-1': ('Completa la misión de inicio',),
    'R-t-ins-oculta': ('Vence un desafío sin perder destellos',),
    'R-t-ins-familias': ('Mira carreras de familias distintas',),
    'R-t-ins-letras': ('Mira ocupaciones de tipos distintos',),
    'R-t-ins-instituciones': ('Mira instituciones de todos los tipos',),
    'R-t-ins-entrevista': ('Publica una entrevista',),
    'R-t-ins-leyenda': ('Logra que tu entrevista sea Leyenda',),
    'R-NIV-2': ('Termina el bloque de inicio',),
    'R-NIV-3': ('Termina el bloque de inicio', 'Mira tres carreras distintas'),
}


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


def cargar(sesion: Session) -> None:
    cargador.cargar(sesion, sys.modules[__name__])
    validar_distribucion_items(sesion)
