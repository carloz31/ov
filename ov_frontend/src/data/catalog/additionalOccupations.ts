import type { Occupation } from '@/types/catalog'

const additionalOccupationCatalog: Occupation[] = [
  {
    id: 'psychologist',
    name: 'Psicólogo/a',
    shortDescription: 'Acompaña el bienestar emocional de personas y comunidades.',
    contextualDescription:
      'Puede ofrecer primeros auxilios psicológicos, reconocer señales de estrés y acompañar procesos posteriores a una emergencia.',
    sector: 'Salud mental',
    color: '#8b67c8',
    typicalWork: 'Escucha, evalúa necesidades emocionales y diseña estrategias de acompañamiento.',
    workplaces: 'Centros de salud, colegios, organizaciones, empresas y consulta privada.',
    skills: ['Escucha activa', 'Contención emocional', 'Evaluación', 'Empatía'],
  },
  {
    id: 'teacher',
    name: 'Docente',
    shortDescription: 'Diseña experiencias para que otras personas aprendan y desarrollen capacidades.',
    contextualDescription:
      'Puede crear actividades de prevención, preparación comunitaria y aprendizaje a partir de lo ocurrido.',
    sector: 'Educación',
    color: '#497fc1',
    typicalWork: 'Planifica clases, facilita aprendizajes y acompaña el desarrollo de estudiantes.',
    workplaces: 'Colegios, institutos, organizaciones sociales y proyectos educativos.',
    skills: ['Comunicación', 'Planificación', 'Facilitación', 'Creatividad'],
  },
  {
    id: 'logistics-coordinator',
    name: 'Coordinador/a logístico/a',
    shortDescription: 'Organiza recursos, rutas y entregas para que lleguen al lugar y momento adecuados.',
    contextualDescription:
      'Puede ordenar la recepción y distribución de alimentos, equipos, medicinas y donaciones.',
    sector: 'Logística',
    color: '#d07a3e',
    typicalWork: 'Controla inventarios, coordina transporte y resuelve necesidades de abastecimiento.',
    workplaces: 'Empresas, almacenes, organizaciones humanitarias, hospitales y operaciones públicas.',
    skills: ['Organización', 'Inventarios', 'Coordinación', 'Resolución de problemas'],
  },
  {
    id: 'architect',
    name: 'Arquitecto/a',
    shortDescription: 'Diseña espacios habitables considerando seguridad, necesidades y entorno.',
    contextualDescription:
      'Puede proponer viviendas temporales o reconstrucciones que respondan mejor a los riesgos de la zona.',
    sector: 'Arquitectura y construcción',
    color: '#6d7890',
    typicalWork: 'Diseña proyectos, desarrolla planos y coordina soluciones espaciales y constructivas.',
    workplaces: 'Estudios, constructoras, municipalidades, consultorías y trabajo independiente.',
    skills: ['Diseño espacial', 'Planificación', 'Representación visual', 'Coordinación'],
  },
  {
    id: 'geologist',
    name: 'Geólogo/a',
    shortDescription: 'Estudia el terreno, sus materiales y los procesos que pueden volverlo inestable.',
    contextualDescription:
      'Puede evaluar laderas y reconocer zonas expuestas a deslizamientos después de perder vegetación.',
    sector: 'Ciencias de la Tierra',
    color: '#9a7048',
    typicalWork: 'Realiza trabajo de campo, analiza suelos y rocas y elabora mapas de riesgo.',
    workplaces: 'Consultoras, minería, obras públicas, investigación y gestión de riesgos.',
    skills: ['Trabajo de campo', 'Análisis del terreno', 'Cartografía', 'Gestión de riesgos'],
  },
  {
    id: 'agricultural-engineer',
    name: 'Ingeniero/a agrónomo/a',
    shortDescription: 'Trabaja con cultivos, suelos y sistemas productivos del ámbito rural.',
    contextualDescription:
      'Puede orientar la recuperación de cultivos y prácticas que protejan el suelo de las familias agricultoras.',
    sector: 'Agricultura',
    color: '#4e9a61',
    typicalWork: 'Evalúa cultivos, asesora productores y diseña mejoras para el manejo agrícola.',
    workplaces: 'Campos, cooperativas, empresas agrícolas, instituciones públicas y consultorías.',
    skills: ['Manejo de suelos', 'Producción agrícola', 'Asesoría técnica', 'Planificación'],
  },
  {
    id: 'public-administrator',
    name: 'Gestor/a público/a',
    shortDescription: 'Coordina programas, recursos y decisiones dentro de instituciones públicas.',
    contextualDescription:
      'Puede articular municipalidades y otras entidades para convertir necesidades en acciones y recursos concretos.',
    sector: 'Gestión pública',
    color: '#476f9c',
    typicalWork: 'Diseña programas, gestiona presupuestos y coordina servicios para la ciudadanía.',
    workplaces: 'Municipalidades, ministerios, gobiernos regionales y organizaciones públicas.',
    skills: ['Gestión de proyectos', 'Coordinación institucional', 'Presupuesto', 'Servicio público'],
  },
  {
    id: 'sociologist',
    name: 'Sociólogo/a',
    shortDescription: 'Estudia cómo se organizan las comunidades y cómo viven los cambios sociales.',
    contextualDescription:
      'Puede investigar cómo afectó la emergencia a distintos grupos y qué redes comunitarias conviene fortalecer.',
    sector: 'Ciencias sociales',
    color: '#a45d86',
    typicalWork: 'Realiza investigaciones, analiza información social y propone intervenciones comunitarias.',
    workplaces: 'Universidades, instituciones públicas, consultoras y organizaciones sociales.',
    skills: ['Investigación social', 'Análisis', 'Entrevistas', 'Trabajo comunitario'],
  },
  {
    id: 'data-analyst',
    name: 'Analista de datos',
    shortDescription: 'Convierte información dispersa en patrones que apoyan decisiones.',
    contextualDescription:
      'Puede reunir datos del caso, identificar zonas recurrentes de riesgo y ayudar a planificar respuestas futuras.',
    sector: 'Datos y tecnología',
    color: '#5667c7',
    typicalWork: 'Limpia información, crea visualizaciones y comunica hallazgos a equipos de decisión.',
    workplaces: 'Empresas, instituciones públicas, centros de investigación y organizaciones.',
    skills: ['Análisis', 'Visualización de datos', 'Pensamiento crítico', 'Comunicación'],
  },
  {
    id: 'drone-operator',
    name: 'Operador/a de drones',
    shortDescription: 'Obtiene imágenes y mediciones aéreas de lugares de difícil acceso.',
    contextualDescription:
      'Puede documentar el área afectada desde el aire y apoyar el seguimiento sin exponer personas al terreno.',
    sector: 'Tecnología aplicada',
    color: '#4f8790',
    typicalWork: 'Planifica vuelos, opera equipos y procesa imágenes aéreas para distintos proyectos.',
    workplaces: 'Audiovisuales, agricultura, topografía, seguridad, investigación y emergencias.',
    skills: ['Pilotaje', 'Lectura espacial', 'Registro audiovisual', 'Seguridad operacional'],
  },
  {
    id: 'urban-planner',
    name: 'Urbanista',
    shortDescription: 'Planifica cómo se organizan los territorios, servicios y espacios habitados.',
    contextualDescription:
      'Puede revisar el crecimiento de la localidad y proponer zonas, accesos y servicios menos expuestos a futuros riesgos.',
    sector: 'Planificación territorial',
    color: '#637f70',
    typicalWork:
      'Analiza territorios, diseña planes urbanos y coordina propuestas con comunidades e instituciones.',
    workplaces: 'Municipalidades, consultoras, universidades y organismos de planificación.',
    skills: ['Planificación territorial', 'Cartografía', 'Participación ciudadana', 'Análisis urbano'],
  },
  {
    id: 'documentary-filmmaker',
    name: 'Documentalista',
    shortDescription: 'Investiga y cuenta historias reales mediante recursos audiovisuales.',
    contextualDescription:
      'Puede conservar la memoria de la comunidad y comunicar aprendizajes a través de testimonios e imágenes.',
    sector: 'Comunicación audiovisual',
    color: '#845f69',
    typicalWork: 'Investiga temas, realiza entrevistas y produce relatos audiovisuales de no ficción.',
    workplaces: 'Productoras, medios, organizaciones culturales y proyectos independientes.',
    skills: ['Investigación', 'Entrevistas', 'Narrativa audiovisual', 'Edición'],
  },
]

export { additionalOccupationCatalog }
