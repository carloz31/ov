"""Lo fijo de la plataforma, sea cual sea la ruta: secciones, listas comunes, repreguntas por tipo
de criterio, temáticas, RIASEC, el catálogo O*NET y el cuestionario de partida y llegada.

Se carga en todo conjunto. La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from dataclasses import dataclass

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import DESCRIPCIONES_RIASEC, DIMENSIONES_RIASEC, transformar_opcion_onet
from datos.ocupaciones import RUTA_OCUPACIONES, leer_ocupaciones


# (código, nombre, audiencia). Cada ruta decide con sus reglas cuándo se abre cada sección.
SECCIONES = (('CATALOGO', 'Catálogo', 'ESTUDIANTE'), ('CHECK_IN', 'Check-in', 'ESTUDIANTE'),
             ('DIARIO', 'Diario', 'ESTUDIANTE'), ('FAMILIA', 'Familia', 'ESTUDIANTE'),
             ('PLANES', 'Planes', 'ESTUDIANTE'), ('CONVERSACIONES', 'Conversaciones', 'APODERADO'))

# Código reservado para la opción «otra»; ninguna lista puede usarlo.
CODIGO_OTRA = 'OTRA'

# (código, nombre, ((código, texto), ...)). Listas comunes: se comparan entre actividades y tarjetas.
# Textos provisionales hasta la carga real (B02).
LISTAS_COMUNES = (
    ('RUTAS_DESPUES_COLEGIO', 'Rutas después del colegio',
     (('UNIVERSIDAD', 'Estudiar en una universidad'), ('INSTITUTO', 'Estudiar en un instituto'),
      ('TRABAJAR', 'Trabajar'), ('EMPRENDER', 'Emprender un negocio'), ('AUN_NO_SE', 'Aún no lo sé'))),
    ('DIFICULTADES', 'Dificultades',
     (('ECONOMICAS', 'Económicas'), ('ACADEMICAS', 'Académicas'), ('FAMILIARES', 'Familiares'),
      ('INFORMACION', 'Falta de información'), ('DISTANCIA', 'Distancia'))),
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

# Rubros que el front precarga en REALIDAD: (rubro, frecuencia recomendada, monto de referencia en soles,
# en cero si la institución es pública, solo si el camino incluye prepararse). Alimentación y Vivienda no se
# precargan: el estudiante los agrega a mano.
REFERENCIAS_RUBROS = (('PREPARACION', 'UNICA', 1300, False, True), ('ADMISION', 'UNICA', 350, False, False),
                      ('MATRICULA', 'POR_CICLO', 600, False, False), ('PENSION', 'MENSUAL', 1800, True, False),
                      ('MATERIALES', 'POR_CICLO', 300, False, False), ('TRANSPORTE', 'MENSUAL', 150, False, False))

# Caminos que incluyen prepararse antes de postular (precargan el rubro Preparación).
CAMINOS_CON_PREPARACION = ('PREPARARME',)

# Repregunta de cada tipo de criterio; el criterio la hereda si no trae la suya. Provisional (B02).
REPREGUNTAS_CRITERIO = {
    'EJEMPLO': '¿Podrías darme un ejemplo concreto?',
    'RAZON': '¿Por qué lo piensas así?',
    'ACCION': '¿Qué podrías hacer al respecto?',
    'CONTRASTE': '¿En qué se diferencia de lo que pensabas antes?',
}

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

# Los 60 enunciados de §4.3.7, sin texto narrativo del front.
ENUNCIADOS_RIASEC = {'R': ('Reparar una bicicleta o un electrodoméstico.',
       'Armar muebles siguiendo un plano.',
       'Cultivar un huerto o cuidar plantas.',
       'Manejar maquinaria o herramientas eléctricas.',
       'Instalar el cableado eléctrico de una casa.',
       'Construir una maqueta o una estructura de madera.',
       'Cuidar animales en una granja o un refugio.',
       'Trabajar al aire libre, en el campo o en una obra.',
       'Pintar o reparar paredes y techos.',
       'Ensamblar las piezas de una computadora.'),
 'I': ('Hacer experimentos en un laboratorio.',
       'Investigar por qué ocurre un fenómeno natural.',
       'Resolver problemas de matemáticas o de lógica.',
       'Analizar datos para encontrar patrones.',
       'Leer sobre descubrimientos científicos.',
       'Estudiar cómo funciona el cuerpo humano.',
       'Observar el cielo y aprender sobre los planetas.',
       'Investigar las causas de una enfermedad.',
       'Programar una solución para un problema.',
       'Comparar información de distintas fuentes antes de concluir.'),
 'A': ('Dibujar o pintar.',
       'Escribir cuentos, poemas o guiones.',
       'Tocar un instrumento o componer música.',
       'Actuar en una obra de teatro.',
       'Diseñar un afiche o la portada de una revista.',
       'Tomar fotografías o grabar videos creativos.',
       'Decorar un espacio con un estilo propio.',
       'Bailar o crear una coreografía.',
       'Diseñar ropa o accesorios.',
       'Inventar personajes para una historia o un videojuego.'),
 'S': ('Enseñar algo a un niño o a un compañero.',
       'Escuchar y aconsejar a alguien que tiene un problema.',
       'Cuidar a personas enfermas o mayores.',
       'Organizar actividades para ayudar a la comunidad.',
       'Trabajar como voluntario en una campaña.',
       'Explicar un tema difícil a un grupo.',
       'Mediar en una discusión entre amigos.',
       'Acompañar a alguien en su primer día en un lugar nuevo.',
       'Orientar a otros estudiantes sobre sus estudios.',
       'Atender a personas que llegan buscando ayuda.'),
 'E': ('Vender un producto o una idea.',
       'Liderar un equipo para cumplir una meta.',
       'Iniciar un negocio propio.',
       'Convencer a otros en un debate.',
       'Organizar un evento y conseguir auspiciadores.',
       'Negociar un acuerdo o un precio.',
       'Representar a tu salón ante la dirección.',
       'Planificar cómo hacer crecer un emprendimiento.',
       'Dirigir una reunión y tomar decisiones.',
       'Promocionar una actividad en redes sociales.'),
 'C': ('Ordenar y clasificar documentos.',
       'Llevar las cuentas de ingresos y gastos.',
       'Registrar datos en una hoja de cálculo.',
       'Revisar un texto para corregir errores.',
       'Seguir un procedimiento paso a paso.',
       'Organizar un inventario de materiales.',
       'Preparar un horario o un calendario de actividades.',
       'Archivar información para encontrarla rápido.',
       'Verificar que una factura esté correcta.',
       'Mantener al día una base de datos.')}

OCUPACIONES = (('sound-technician', 'Técnico/a de sonido', '27-4014.00'),
 ('electrician', 'Electricista', '47-2111.00'),
 ('event-coordinator', 'Coordinador/a de eventos', '13-1121.00'),
 ('translator', 'Traductor/a', '27-3091.00'),
 ('community-manager', 'Community manager', '27-3031.00'),
 ('graphic-designer', 'Diseñador/a gráfico/a', '27-1024.00'),
 ('event-assistant', 'Asistente de eventos', '39-3031.00'),
 ('security-guard', 'Guardia de seguridad', '33-9032.00'),
 ('paramedic', 'Paramédico/a', '29-2043.00'),
 ('photographer', 'Fotógrafo/a', '27-4021.00'),
 ('lawyer', 'Abogado/a', '23-1011.00'),
 ('cook', 'Cocinero/a', '35-2014.00'),
 ('illustrator', 'Ilustrador/a', '27-1013.00'),
 ('firefighter', 'Bombero/a', '33-2011.00'),
 ('meteorologist', 'Meteorólogo/a', '19-2021.00'),
 ('municipal-police', 'Policía municipal', '33-3051.00'),
 ('medical-specialist', 'Médico/a especialista', '29-1216.00'),
 ('veterinarian', 'Veterinario/a', '29-1131.00'),
 ('biologist', 'Biólogo/a', '19-1029.04'),
 ('environmental-engineer', 'Ingeniero/a medioambiental', '17-2081.00'),
 ('civil-engineer', 'Ingeniero/a civil', '17-2051.00'),
 ('machinery-operator', 'Operador/a de maquinaria', '47-2073.00'),
 ('social-worker', 'Trabajador/a social', '21-1021.00'),
 ('psychologist', 'Psicólogo/a', '19-3033.00'),
 ('logistics-coordinator', 'Coordinador/a logístico/a', '13-1081.00'),
 ('journalist', 'Periodista', '27-3023.00'),
 ('teacher', 'Docente', '25-2031.00'),
 ('architect', 'Arquitecto/a', '17-1011.00'),
 ('geologist', 'Geólogo/a', '19-2042.00'),
 ('agricultural-engineer', 'Ingeniero/a agrónomo/a', '17-2021.00'),
 ('public-administrator', 'Gestor/a público/a', '11-3012.00'),
 ('sociologist', 'Sociólogo/a', '19-3041.00'),
 ('data-analyst', 'Analista de datos', '15-2051.00'),
 ('urban-planner', 'Urbanista', '19-3051.00'),
 ('documentary-filmmaker', 'Documentalista', '27-2012.00'),
 # nurse no existe en el catálogo del frontend; la exige la carrera nursing.
 ('nurse', 'Enfermero/a', '29-1141.00'))

CARRERAS = (('environmental-engineering',
  'Ingeniería Ambiental',
  'Ingeniería y ambiente',
  ('environmental-engineer', 'agricultural-engineer', 'geologist', 'data-analyst')),
 ('journalism',
  'Periodismo',
  'Comunicación',
  ('journalist', 'documentary-filmmaker', 'photographer', 'community-manager', 'translator')),
 ('nursing', 'Enfermería', 'Salud', ('nurse', 'paramedic')),
 ('civil-engineering',
  'Ingeniería Civil',
  'Ingeniería e infraestructura',
  ('civil-engineer', 'architect', 'urban-planner', 'geologist', 'machinery-operator')),
 ('veterinary-medicine',
  'Medicina Veterinaria',
  'Salud y ciencias naturales',
  ('veterinarian', 'agricultural-engineer', 'biologist')),
 ('psychology',
  'Psicología',
  'Ciencias sociales y salud',
  ('psychologist', 'teacher', 'sociologist', 'social-worker')))


# (carrera, descripción, duración), copiados de `careerCatalog` del front.
DETALLE_CARRERAS = (
    ('environmental-engineering',
     'Diseña soluciones para prevenir, medir y reducir impactos sobre el ambiente.', '5 años aproximadamente'),
    ('journalism',
     'Investiga hechos, contrasta fuentes y comunica información de interés público.', '5 años aproximadamente'),
    ('nursing',
     'Brinda cuidados integrales y acompaña a las personas en prevención, atención y recuperación.',
     '5 años aproximadamente'),
    ('civil-engineering',
     'Planifica, construye y evalúa infraestructura segura para las comunidades.', '5 años aproximadamente'),
    ('veterinary-medicine',
     'Protege la salud y el bienestar de animales domésticos, productivos y silvestres.', '5 años aproximadamente'),
    ('psychology',
     'Comprende el comportamiento humano y acompaña procesos de bienestar y desarrollo.', '5 años aproximadamente'),
)

# (ocupación, qué hacen, lugares de trabajo, habilidades), copiados del catálogo del front
# (`typicalWork`, `workplaces`, `skills`). Las ocupaciones con el texto por completar no aparecen.
DETALLE_OCUPACIONES = (
    ('sound-technician',
     'Realiza montajes, pruebas de sonido, operación en vivo y solución de fallas.',
     'Eventos, teatros, estudios, medios y empresas audiovisuales.',
     ('Diagnóstico técnico', 'Escucha crítica', 'Trabajo bajo presión')),
    ('electrician',
     'Mide voltajes, instala circuitos y localiza fallas eléctricas.',
     'Construcción, industria, mantenimiento, eventos y servicios técnicos.',
     ('Precisión', 'Seguridad', 'Diagnóstico')),
    ('event-coordinator',
     'Planifica cronogramas, coordina proveedores y gestiona contingencias.',
     'Convenciones, festivales, agencias, centros culturales y empresas.',
     ('Organización', 'Negociación', 'Toma de decisiones')),
    ('translator',
     'Traduce conversaciones, textos o contenidos preservando su significado.',
     'Eventos, empresas, editoriales, instituciones y trabajo independiente.',
     ('Idiomas', 'Escucha', 'Precisión cultural')),
    ('community-manager',
     'Planifica publicaciones, conversa con audiencias y analiza respuestas digitales.',
     'Marcas, agencias, medios, instituciones y proyectos independientes.',
     ('Redacción', 'Estrategia digital', 'Empatía')),
    ('graphic-designer',
     'Diseña identidades, piezas informativas, interfaces y materiales impresos o digitales.',
     'Agencias, editoriales, empresas, estudios y trabajo independiente.',
     ('Comunicación visual', 'Creatividad', 'Síntesis')),
    ('event-assistant',
     'Apoya acreditaciones, orientación, montaje y coordinación cotidiana.',
     'Ferias, convenciones, congresos, festivales y centros de eventos.',
     ('Servicio', 'Adaptabilidad', 'Comunicación')),
    ('security-guard',
     'Vigila espacios, controla accesos y aplica protocolos de seguridad.',
     'Eventos, comercios, instituciones, empresas y espacios públicos.',
     ('Observación', 'Calma', 'Respuesta rápida')),
    ('paramedic',
     'Responde a emergencias, brinda primeros cuidados y coordina traslados.',
     'Ambulancias, hospitales, eventos, industrias y equipos de respuesta.',
     ('Evaluación rápida', 'Calma', 'Atención prehospitalaria')),
    ('photographer',
     'Planifica tomas, registra eventos y selecciona o edita imágenes.',
     'Medios, estudios, eventos, agencias y trabajo independiente.',
     ('Observación', 'Narrativa visual', 'Técnica fotográfica')),
    ('lawyer',
     'Analiza casos, asesora personas y redacta o revisa acuerdos.',
     'Estudios jurídicos, empresas, instituciones y consultoría.',
     ('Argumentación', 'Lectura detallada', 'Negociación')),
    ('cook',
     'Planifica preparaciones, controla insumos y produce alimentos de forma segura.',
     'Restaurantes, hoteles, servicios de catering, eventos y emprendimientos.',
     ('Organización', 'Técnica culinaria', 'Higiene')),
    ('illustrator',
     'Investiga referencias, desarrolla bocetos y crea piezas visuales finales.',
     'Editoriales, estudios de videojuegos, agencias y trabajo independiente.',
     ('Dibujo', 'Narrativa visual', 'Creatividad')),
    ('psychologist',
     'Escucha, evalúa necesidades emocionales y diseña estrategias de acompañamiento.',
     'Centros de salud, colegios, organizaciones, empresas y consulta privada.',
     ('Escucha activa', 'Contención emocional', 'Evaluación', 'Empatía')),
    ('logistics-coordinator',
     'Controla inventarios, coordina transporte y resuelve necesidades de abastecimiento.',
     'Empresas, almacenes, organizaciones humanitarias, hospitales y operaciones públicas.',
     ('Organización', 'Inventarios', 'Coordinación', 'Resolución de problemas')),
    ('teacher',
     'Planifica clases, facilita aprendizajes y acompaña el desarrollo de estudiantes.',
     'Colegios, institutos, organizaciones sociales y proyectos educativos.',
     ('Comunicación', 'Planificación', 'Facilitación', 'Creatividad')),
    ('architect',
     'Diseña proyectos, desarrolla planos y coordina soluciones espaciales y constructivas.',
     'Estudios, constructoras, municipalidades, consultorías y trabajo independiente.',
     ('Diseño espacial', 'Planificación', 'Representación visual', 'Coordinación')),
    ('geologist',
     'Realiza trabajo de campo, analiza suelos y rocas y elabora mapas de riesgo.',
     'Consultoras, minería, obras públicas, investigación y gestión de riesgos.',
     ('Trabajo de campo', 'Análisis del terreno', 'Cartografía', 'Gestión de riesgos')),
    ('agricultural-engineer',
     'Evalúa cultivos, asesora productores y diseña mejoras para el manejo agrícola.',
     'Campos, cooperativas, empresas agrícolas, instituciones públicas y consultorías.',
     ('Manejo de suelos', 'Producción agrícola', 'Asesoría técnica', 'Planificación')),
    ('public-administrator',
     'Diseña programas, gestiona presupuestos y coordina servicios para la ciudadanía.',
     'Municipalidades, ministerios, gobiernos regionales y organizaciones públicas.',
     ('Gestión de proyectos', 'Coordinación institucional', 'Presupuesto', 'Servicio público')),
    ('sociologist',
     'Realiza investigaciones, analiza información social y propone intervenciones comunitarias.',
     'Universidades, instituciones públicas, consultoras y organizaciones sociales.',
     ('Investigación social', 'Análisis', 'Entrevistas', 'Trabajo comunitario')),
    ('data-analyst',
     'Limpia información, crea visualizaciones y comunica hallazgos a equipos de decisión.',
     'Empresas, instituciones públicas, centros de investigación y organizaciones.',
     ('Análisis', 'Visualización de datos', 'Pensamiento crítico', 'Comunicación')),
    ('urban-planner',
     'Analiza territorios, diseña planes urbanos y coordina propuestas con comunidades e instituciones.',
     'Municipalidades, consultoras, universidades y organismos de planificación.',
     ('Planificación territorial', 'Cartografía', 'Participación ciudadana', 'Análisis urbano')),
    ('documentary-filmmaker',
     'Investiga temas, realiza entrevistas y produce relatos audiovisuales de no ficción.',
     'Productoras, medios, organizaciones culturales y proyectos independientes.',
     ('Investigación', 'Entrevistas', 'Narrativa audiovisual', 'Edición')),
)

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


def _leer_catalogo_seleccionado():
    archivo = {fila.codigo_onet: fila for fila in leer_ocupaciones(RUTA_OCUPACIONES)}
    for codigo, _, codigo_onet in OCUPACIONES:
        if codigo_onet not in archivo:
            raise ValueError(f'Falta la ocupación O*NET {codigo_onet}, requerida por {codigo}')
    return {codigo: archivo[codigo_onet] for codigo, _, codigo_onet in OCUPACIONES}


def _cargar_riasec(sesion):
    instrumento = modelos.Instrumento(codigo='TEST-RIASEC', nombre='Test de intereses (RIASEC)',
        descripcion='Versión de prueba para la iteración 1.', tipo_resultado=modelos.TipoResultado.COINCIDENCIAS)
    escala = modelos.EscalaRespuesta(codigo='ESC-LIKERT5', nombre='Preferencia en cinco opciones')
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta,
                                      puntaje=transformar_opcion_onet(n))
                   for n, etiqueta in enumerate(OPCIONES_LIKERT, start=1))
    dimensiones = {c: modelos.Dimension(codigo=c, nombre=n, instrumento_id=instrumento.id, orden=orden,
                                        descripcion=DESCRIPCIONES_RIASEC[c])
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


def _cargar_tematicas(sesion):
    tematicas = {c: modelos.Tematica(codigo=c, nombre=n, descripcion=d, orden=orden)
                 for orden, (c, n, d) in enumerate(TEMATICAS, start=1)}
    sesion.add_all(tematicas.values())
    sesion.flush()
    return tematicas


def _cargar_partida_llegada(sesion, tematicas):
    instrumento = modelos.Instrumento(codigo='TEST-PARTIDA-LLEGADA', nombre='Punto de partida y de llegada',
        descripcion='Las mismas afirmaciones al inicio y al cierre, para ver cuánto cambiaste.',
        tipo_resultado=modelos.TipoResultado.COMPARACION)
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


def _cargar_catalogo(sesion, archivo, dimensiones):
    ocupaciones = {c: modelos.Ocupacion(codigo=c, titulo=t, codigo_onet=onet) for c, t, onet in OCUPACIONES}
    familias = {c: modelos.FamiliaCarrera(codigo=f'family-{c}', nombre=f) for c, _, f, _ in CARRERAS}
    sesion.add_all([*ocupaciones.values(), *familias.values()])
    sesion.flush()
    detalle_carreras = {c: (d, duracion) for c, d, duracion in DETALLE_CARRERAS}
    detalle_ocupaciones = {c: (d, lugares, habilidades) for c, d, lugares, habilidades in DETALLE_OCUPACIONES}
    for codigo, (descripcion, lugares, habilidades) in detalle_ocupaciones.items():
        ocupaciones[codigo].descripcion = descripcion
        ocupaciones[codigo].lugares_trabajo = lugares
        ocupaciones[codigo].habilidades = list(habilidades)
    carreras = {c: modelos.Carrera(codigo=c, nombre=n, familia_id=familias[c].id,
                                   descripcion=detalle_carreras[c][0], duracion=detalle_carreras[c][1])
                for c, n, _, _ in CARRERAS}
    sesion.add_all(carreras.values())
    sesion.flush()
    sesion.execute(insert(modelos.PuntajeOcupacion), [
        {'ocupacion_id': ocupaciones[c].id, 'dimension_id': dimensiones[d].id, 'valor': fila.valores[n]}
        for c, fila in archivo.items() for n, (d, _) in enumerate(DIMENSIONES_RIASEC)
    ])
    sesion.execute(insert(modelos.CarreraOcupacion), [
        {'carrera_id': carreras[c].id, 'ocupacion_id': ocupaciones[o].id}
        for c, _, _, relaciones in CARRERAS for o in relaciones
    ])


def _cargar_secciones(sesion):
    secciones = {c: modelos.Seccion(codigo=c, nombre=n, audiencia=modelos.Audiencia(a)) for c, n, a in SECCIONES}
    sesion.add_all(secciones.values())
    sesion.flush()
    return secciones


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
    secciones = _cargar_secciones(sesion)
    listas = cargar_listas(sesion, LISTAS_COMUNES, comun=True)
    secciones_tarjeta = _cargar_tarjeta(sesion, listas)
    archivo = _leer_catalogo_seleccionado()
    tematicas = _cargar_tematicas(sesion)
    dimensiones, aplicacion, items = _cargar_riasec(sesion)
    _cargar_catalogo(sesion, archivo, dimensiones)
    comparacion, items_comparacion = _cargar_partida_llegada(sesion, tematicas)
    sesion.flush()
    return Fijos(aplicaciones={a.codigo: a for a in (aplicacion, *comparacion)},
                 items={'TEST-RIASEC': items, 'TEST-PARTIDA-LLEGADA': items_comparacion}, secciones=secciones,
                 listas=listas, tematicas=tematicas, secciones_tarjeta=secciones_tarjeta)
