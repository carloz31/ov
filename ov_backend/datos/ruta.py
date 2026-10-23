"""Ruta mínima de prueba: lo justo para demostrar cada mecánica.

DATO DE PRUEBA: todo este módulo. Los códigos `t-...` nombran la mecánica que prueban.
Cada lote agrega filas en este formato; el cargador las interpreta sin lógica a medida.
La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from functools import cache

from argon2 import PasswordHasher
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import MAXIMO_ITEMS_REGISTRO
from datos import fijos
from datos.ocupaciones import validar_distribucion_items


# Mismos parámetros por defecto que `app/services/acceso.py`; datos/ no importa services/.
_HASHER = PasswordHasher()


@cache
def _hash(contrasena: str) -> str:
    # Uno por contraseña y proceso: recargar deja las mismas filas y no repite el costo de Argon2id.
    return _HASHER.hash(contrasena)


# (código, nombre)
SALONES = (('5A', 'Quinto A'), ('5B', 'Quinto B'))

# (código, nombre, rol, salón, correo, contraseña). B17: credenciales de prueba, iguales a las de
# `datos/usuarios_prueba.txt` y a los usuarios del modo local del front. Los correos usan example.com (reservado).
CUENTAS = (('est-ana', 'Ana', 'ESTUDIANTE', '5A', 'ana.estudiante@example.com', 'Ana2026!'),
           ('est-luis', 'Luis', 'ESTUDIANTE', '5A', 'luis.estudiante@example.com', 'Luis2026!'),
           ('est-beto', 'Beto', 'ESTUDIANTE', '5B', 'beto.estudiante@example.com', 'Beto2026!'),
           ('apo-rosa', 'Rosa', 'APODERADO', None, 'rosa.apoderada@example.com', 'Rosa2026!'),
           ('ori-carmen', 'Carmen', 'ORIENTADORA', None, 'carmen.orientadora@example.com', 'Carmen2026!'))

# (orientadora, salón, es principal)
ORIENTADORAS_SALONES = (('ori-carmen', '5A', True),)

# (código, estudiante, apoderado, parentesco)
VINCULOS = (('VIN-ANA', 'est-ana', 'apo-rosa', 'madre'),)

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
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'))

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
               ('t-caso', 'CIUDAD', 'Caso de prueba', 'CASO', 10, 10),
               ('t-contraste', 'CIUDAD', 'Registro de contraste de intereses', 'REGISTRO', None, 10),
               ('t-apo-1', 'FAMILIA', 'Primera actividad del apoderado', 'INFORMATIVA', None, 10),
               ('t-apo-carta', 'FAMILIA', 'Carta del apoderado', 'INFORMATIVA', None, 10))

# Lo que cambia los valores por defecto (requerida, visibilidad SIEMPRE).
PROPIEDADES = {'t-opcional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               # Las opcionales aparecen en el mapa cuando se desbloquean (F00).
               't-valores': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-eco': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-lee-cuestionario': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-batalla': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-explorar': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
               't-adicional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'}}

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
    't-caso': 'Ayuda a resolver un caso de la ciudad.',
    't-contraste': 'Contrasta tu resultado de intereses con lo que esperabas.',
    't-apo-1': 'Conozca cómo acompañar a su hijo en este proceso.',
    't-apo-carta': 'Escriba una carta para su hijo.',
}

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
          ('t-ficha-2', 'Segunda ficha de prueba', 'Segunda ficha que otorga t-inicio (F04b).', 'ESTUDIANTE'),
          ('t-ficha-apo', 'Ficha del apoderado', 'Ficha que otorga t-apo-1.', 'APODERADO'))

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
# máximo es el total de necesidades. t-caso juega forest-fire: sus necesidades son las de
# `expectedProfessionalIds` en ov_frontend/src/data/content/forestFireCase.ts, en orden de fase y problema.
# Mantener sincronizado con ese archivo (lo comprueba tests/servidor/casos en el front).
CONFIGURACION_CASOS = {'t-caso': (14, (2, 3, 3, 1, 2, 3))}

# (código, título, descripción, enlace, pista, persona, ocupación, años de experiencia, cita). La pista se
# muestra mientras el testimonio está bloqueado (B08); la descripción es el texto completo y el enlace, el
# video. DATO DE PRUEBA: persona, cita, texto y video adaptados de los testimonios del front
# (`professionalTestimonials` en ov_frontend/src/data/catalog/occupations.ts).
TESTIMONIOS = (
    ('t-testimonio-1', 'Calma y cuidado en una emergencia',
     'Mi trabajo consiste en evaluar rápidamente qué ocurre, brindar los primeros cuidados y decidir qué necesita '
     'la persona antes de llegar a un hospital. Cada situación es diferente y por eso practicamos constantemente. '
     'También aprendí que explicar con calma lo que estamos haciendo puede ayudar tanto como una intervención '
     'técnica.', 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
     'Resuelve el caso de prueba para conocer este testimonio.', 'Luis Mendoza', 'paramedic', 5,
     'Ayudar en una emergencia exige técnica, calma y una comunicación muy humana.'),
    ('t-testimonio-2', 'Puentes entre idiomas',
     'Trabajo con invitados, conferencistas y equipos de producción de distintos países. Antes de cada evento '
     'investigo el tema y preparo vocabulario especializado. Durante una conversación debo escuchar, comprender la '
     'intención y comunicarla con precisión, incluso cuando todo ocurre muy rápido.',
     'https://www.youtube.com/watch?v=aqz-KE-bpKQ', None, 'Sofía Kim', 'translator', 6,
     'Traducir no es reemplazar palabras: es ayudar a que dos personas realmente se comprendan.'),
)

# (código, orden, título, pregunta del estudiante, pregunta del apoderado (None: la misma), preguntas guía,
# mensaje de diferencias). El estudiante las habilita con reglas CONVERSACION; el apoderado, todas tras su carta.
CONVERSACIONES = (
    ('t-conv-1', 1, 'Primera conversación', '¿Qué esperas tú de tu futuro después del colegio?',
     '¿Qué espera usted del futuro de su hijo después del colegio?',
     ('¿En qué coinciden sus respuestas?', '¿Qué les sorprendió de la respuesta del otro?'),
     'Si sus respuestas son distintas, conversen sobre qué hay detrás de cada una.'),
    ('t-conv-2', 2, 'Segunda conversación', '¿Qué te dijo tu resultado de intereses sobre ti?', None,
     ('¿Qué parte del resultado les pareció más acertada?',),
     'Si ven el resultado de forma distinta, cuenten un ejemplo que lo explique.'),
)

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
    ('R-t-testimonio-2', 'TESTIMONIO', 't-testimonio-2', 'Supera el caso de prueba para conocer este testimonio.',
     (('SUPERA_CASO', 't-caso', 'EVENTOS', 1),)),
    ('R-t-ficha', 'FICHA', 't-ficha', 'Completa el inicio para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ficha-2', 'FICHA', 't-ficha-2', 'Completa el inicio para obtener esta ficha.',
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
                                 salon_id=None if salon is None else salones[salon].id,
                                 correo=correo.strip().lower(), contrasena_hash=_hash(contrasena))
               for c, n, r, salon, correo, contrasena in CUENTAS}
    bloques = {c: modelos.Bloque(codigo=c, numero=num, nombre=n, espacio=modelos.Espacio(e),
                                audiencia=modelos.Audiencia(a)) for c, num, n, e, a in BLOQUES}
    fichas = {c: modelos.Ficha(codigo=c, titulo=t, contenido=texto, audiencia=modelos.Audiencia(a))
              for c, t, texto, a in FICHAS}
    ocupaciones = {o.codigo: o for o in sesion.scalars(select(modelos.Ocupacion))}
    for c, *_, ocupacion, _anios, _cita in TESTIMONIOS:
        if ocupacion not in ocupaciones:
            raise ValueError(f'El testimonio {c} apunta a una ocupación inexistente: {ocupacion}')
    testimonios = {c: modelos.Testimonio(codigo=c, titulo=t, descripcion=d, enlace=e, pista=p, persona=persona,
                                         ocupacion_id=ocupaciones[ocupacion].id, anios_experiencia=anios, cita=cita)
                   for c, t, d, e, p, persona, ocupacion, anios, cita in TESTIMONIOS}
    conversaciones = {c: modelos.Conversacion(codigo=c, orden=o, titulo=t, pregunta_estudiante=pe,
                                             pregunta_apoderado=pa, preguntas_guia=list(guia), mensaje_diferencias=m)
                      for c, o, t, pe, pa, guia, m in CONVERSACIONES}
    insignias = {c: modelos.Insignia(codigo=c, nombre=n, descripcion=d, requisito=r, es_oculta=o,
                                   audiencia=modelos.Audiencia.ESTUDIANTE) for c, n, d, r, o in INSIGNIAS}
    niveles = {num: modelos.Nivel(numero=num, titulo=t) for num, t in NIVELES}
    preguntas = _preguntas_diario(sesion)
    sesion.add_all([*cuentas.values(), *bloques.values(), *fichas.values(), *testimonios.values(), *conversaciones.values(),
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
        if tipo == 'BATALLA' and codigo not in CONFIGURACION_BATALLAS:
            raise ValueError(f'La batalla {codigo} no tiene vidas, destellos ni preguntas por intento')
        maximo = _puntaje_maximo_caso(codigo, tipo, puntaje)
        actividades[codigo] = modelos.Actividad(
            codigo=codigo, titulo=titulo, tipo=modelos.TipoActividad(tipo), contenido=contenido(codigo),
            orden=ordenes[bloque], bloque_id=bloques[bloque].id, puntaje_minimo=puntaje, puntaje_maximo=maximo,
            **dict(zip(('vidas_enemigo', 'destellos', 'preguntas_por_intento'),
                       CONFIGURACION_BATALLAS.get(codigo, (None, None, None)))),
            duracion_estimada_min=duracion, requerida=propiedades.get('requerida', True),
            visibilidad=modelos.Visibilidad(propiedades.get('visibilidad', 'SIEMPRE')),
            descripcion=DESCRIPCIONES.get(codigo))
    sesion.add_all(actividades.values())
    sesion.flush()
    return {'BLOQUE': bloques, 'ACTIVIDAD': actividades, 'FICHA': fichas, 'TESTIMONIO': testimonios,
            'CONVERSACION': conversaciones,
            'INSIGNIA': insignias, 'NIVEL': niveles, 'PREGUNTA_DIARIO': preguntas, 'SALON': salones}


def _puntaje_maximo_caso(codigo, tipo, minimo):
    """El máximo de un CASO debe ser el total de sus necesidades y alcanzar el mínimo; si no, la carga falla."""
    if tipo != 'CASO':
        if codigo in CONFIGURACION_CASOS:
            raise ValueError(f'{codigo} no es un caso y no admite puntaje máximo')
        return None
    if codigo not in CONFIGURACION_CASOS:
        raise ValueError(f'El caso {codigo} no tiene puntaje máximo ni necesidades')
    maximo, necesidades = CONFIGURACION_CASOS[codigo]
    if sum(necesidades) != maximo:
        raise ValueError(f'El puntaje máximo de {codigo} ({maximo}) no es el total de sus necesidades '
                         f'({sum(necesidades)})')
    if minimo is None or not 0 <= minimo <= maximo:
        raise ValueError(f'El puntaje mínimo de {codigo} debe estar entre 0 y {maximo}')
    return maximo


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


def _cargar_preguntas_batalla(sesion, actividades, fichas):
    for codigo, batalla, ficha, enunciado, opciones, correcta, explicacion in PREGUNTAS_BATALLA:
        if batalla not in actividades or actividades[batalla].tipo != modelos.TipoActividad.BATALLA:
            raise ValueError(f'La pregunta {codigo} apunta a {batalla}, que no es una batalla')
        if ficha not in fichas or fichas[ficha].audiencia != modelos.Audiencia.ESTUDIANTE:
            raise ValueError(f'La pregunta {codigo} sale de {ficha}, que no es una ficha del estudiante')
        if len(opciones) < 3 or not 0 <= correcta < len(opciones):
            raise ValueError(f'La pregunta {codigo} necesita al menos tres opciones y una correcta entre ellas')
        if not enunciado.strip() or not explicacion.strip() or any(not o.strip() for o in opciones):
            raise ValueError(f'La pregunta {codigo} tiene un texto vacío')
    for actividad in actividades.values():
        if actividad.tipo != modelos.TipoActividad.BATALLA:
            continue
        if actividad.preguntas_por_intento < actividad.vidas_enemigo + actividad.destellos - 1:
            raise ValueError(f'Las {actividad.preguntas_por_intento} preguntas por intento de {actividad.codigo} '
                             f'no alcanzan para terminar con {actividad.vidas_enemigo} vidas y '
                             f'{actividad.destellos} destellos')
        pool = sum(1 for pregunta in PREGUNTAS_BATALLA if pregunta[1] == actividad.codigo)
        if pool < 2 * actividad.preguntas_por_intento:
            raise ValueError(f'El pool de {actividad.codigo} ({pool}) debe ser al menos el doble de sus '
                             f'preguntas por intento ({actividad.preguntas_por_intento})')
    sesion.add_all(modelos.PreguntaBatalla(
        codigo=codigo, actividad_id=actividades[batalla].id, ficha_id=fichas[ficha].id, enunciado=enunciado,
        opciones=list(opciones), correcta=correcta, explicacion=explicacion)
        for codigo, batalla, ficha, enunciado, opciones, correcta, explicacion in PREGUNTAS_BATALLA)


def _validar_eleccion(codigo, eleccion, listas):
    if eleccion is None:
        return
    lista, minima, maxima, _, permite_otra = eleccion[:5]
    if lista not in listas:
        raise ValueError(f'El ítem {codigo} usa la lista inexistente {lista}')
    disponibles = len(listas[lista][2]) + (1 if permite_otra else 0)
    if not 0 <= minima <= maxima or not 1 <= maxima <= disponibles:
        raise ValueError(f'El ítem {codigo} tiene una elección mínima o máxima incoherente')


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
        lista, minima, maxima, ordenada, otra, referencia = (*eleccion, None)[:6] if eleccion else (
            None, None, None, False, False, None)
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
            raise ValueError(f'El ítem {codigo} retoma {referencia}, que no es una ELECCION de su actividad')
        fuente = items[referencias[referencia][1]][0]
        # Lo elegido antes llega marcado: debe caber en la lista, el máximo y la «otra» del ítem.
        if item.lista_id != fuente.lista_id:
            raise ValueError(f'El ítem {codigo} retoma una elección de otra lista')
        if item.eleccion_maxima < fuente.eleccion_maxima or (fuente.permite_otra and not item.permite_otra):
            raise ValueError(f'El ítem {codigo} no admite todo lo que pudo elegirse en su fuente')
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
                   'SUPERA_CASO': objetivos['ACTIVIDAD'], 'SUPERA_BATALLA': objetivos['ACTIVIDAD'],
                   'COMPLETA_CONVERSACION': objetivos['CONVERSACION']}
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
    _cargar_preguntas_batalla(sesion, objetivos['ACTIVIDAD'], objetivos['FICHA'])
    _cargar_catalogo(sesion)
    _cargar_registros(sesion, objetivos['ACTIVIDAD'], base)
    _cargar_salones(sesion, objetivos.pop('SALON'), objetivos['ACTIVIDAD'])
    _cargar_reglas(sesion, objetivos)
    sesion.flush()
    validar_distribucion_items(sesion)
