export const fieldMissions = [
  {
    id: 'welcome',
    title: 'El inicio del viaje',
    kind: 'information',
    region: 'El campamento',
    description: 'Descubre qué significa explorar tu futuro.',
    x: 130,
    y: 140,
  },
  {
    id: 'beliefs',
    title: 'La plaza de los rumores',
    kind: 'reflection',
    region: 'Puente de las preguntas',
    description:
      'Piensa en una creencia sobre elegir una carrera. ¿De dónde viene? ¿Qué te gustaría investigar?',
    x: 400,
    y: 140,
  },
  {
    id: 'pregones',
    title: 'Mis propios pregones',
    kind: 'reflection',
    region: 'Fuente de la plaza',
    description:
      'Revisa una frase sobre estudios o trabajo que has escuchado cerca de ti y construye tu propia postura.',
    x: 495,
    y: 210,
  },
  {
    id: 'story',
    title: 'Las huellas que traigo',
    kind: 'reflection',
    region: 'Bosque de recuerdos',
    description: '¿Qué experiencia de tu historia te enseñó algo sobre ti?',
    x: 590,
    y: 290,
  },
  {
    id: 'future',
    title: 'Mi horizonte',
    kind: 'reflection',
    region: 'Mirador del mañana',
    description:
      '¿Cómo imaginas tu futuro y el de tu entorno? Cuéntale a Lumi lo que te ilusiona o te inquieta.',
    x: 360,
    y: 390,
  },
  {
    id: 'compass',
    title: 'Mi brújula personal',
    kind: 'questionnaire',
    region: 'Valle del descubrimiento',
    description: 'Explora tus intereses y tu manera de prepararte, un bloque a la vez.',
    x: 130,
    y: 485,
  },
  {
    id: 'plan',
    title: 'Mi mapa de ruta',
    kind: 'deliverable',
    region: 'Sendero de posibilidades',
    description: '¿Qué deseas construir y qué pequeño paso puedes dar esta semana?',
    x: 400,
    y: 550,
  },
  {
    id: 'expectations',
    title: 'Preparar la mochila',
    kind: 'reflection',
    region: 'Puertas de la ciudad',
    description: '¿Qué esperas de tu preparación vocacional y qué apoyo te gustaría recibir?',
    x: 670,
    y: 550,
  },
  {
    id: 'next-step',
    title: 'Elegir mi siguiente paso',
    kind: 'reflection',
    region: 'Cruce de caminos',
    description: 'Reúne lo que descubriste y decide qué pequeño paso quieres intentar primero.',
    x: 835,
    y: 555,
  },
] as const
export type FieldMission = (typeof fieldMissions)[number]
export const questionnaireBlocks = [
  {
    title: 'Lo que despierta mi curiosidad',
    items: [
      {
        id: 'interest',
        text: '¿Qué actividad te gustaría explorar primero?',
        options: [
          'Crear algo',
          'Investigar un problema',
          'Acompañar a otras personas',
          'Organizar un proyecto',
        ],
        sensitive: false,
      },
      {
        id: 'learning',
        text: '¿Cómo prefieres acercarte a algo nuevo?',
        options: ['Probándolo', 'Leyendo o mirando ejemplos', 'Conversando', 'Todavía no lo sé'],
        sensitive: false,
      },
    ],
  },
  {
    title: 'Cómo vivo este momento',
    items: [
      {
        id: 'support',
        text: '¿Sientes que puedes conversar sobre tus opciones?',
        openPrompt: 'Si deseas, describe cómo son las conversaciones sobre tu futuro.',
        options: ['Sí', 'A veces', 'No', 'Prefiero no responder'],
        sensitive: true,
      },
      {
        id: 'preparation',
        text: '¿Qué te gustaría hacer a continuación?',
        options: ['Conocer profesiones', 'Hablar con alguien', 'Conocerme mejor', 'Tomarme un tiempo'],
        sensitive: false,
      },
    ],
  },
]
export const cityCases = [
  {
    id: 'forest-fire',
    title: 'Incendio forestal',
    description: 'El bosque está en llamas. Reúne un equipo para ayudar a la comunidad.',
    x: 180,
    y: 160,
    professionals: [],
  },
  {
    id: 'neighborhood-radio',
    title: 'Una voz para el barrio',
    description: 'El barrio necesita comunicar sus historias. ¿Quién puede investigar, grabar y difundirlas?',
    x: 460,
    y: 130,
    professionals: ['sound-technician', 'community-manager'],
  },
  {
    id: 'river-mystery',
    title: 'El misterio del río',
    description:
      'La comunidad encontró residuos en el río. ¿Quién puede investigar lo que ocurre y comunicar los hallazgos?',
    x: 750,
    y: 190,
    professionals: ['environmental-engineer', 'journalist'],
  },
  {
    id: 'open-door-app',
    title: 'Una puerta digital abierta',
    description:
      'Una aplicación expone datos de sus usuarios. Forma un equipo para investigar el error y proteger sus derechos.',
    x: 220,
    y: 405,
    professionals: ['software-developer', 'lawyer'],
  },
  {
    id: 'community-garden',
    title: 'El huerto que necesita crecer',
    description:
      'Un terreno vacío puede convertirse en un huerto. Hace falta cuidar el suelo y coordinar a los vecinos.',
    x: 510,
    y: 360,
    professionals: ['environmental-engineer', 'event-coordinator'],
  },
  {
    id: 'city-festival',
    title: 'Festival en la ciudad',
    description:
      'La ciudad prepara un festival. ¿Quién puede organizarlo y cuidar la seguridad de los asistentes?',
    x: 760,
    y: 510,
    professionals: ['event-coordinator', 'security-guard'],
  },
]
// DATO DE PRUEBA: Alias ficticios de salón; los reemplazará el servidor.
export const classroomAliases = ['Río', 'Quilla', 'Cedro', 'Nova', 'Brisa']
// DATO DE PRUEBA: Avisos de recursos de ejemplo; los reemplazará el servidor.
export const resourceDemoNotices = [
  {
    id: 'future-fair',
    kind: 'event',
    title: 'Feria de carreras y oficios de la comunidad',
    body: 'Conoce instituciones, conversa con profesionales y lleva tus preguntas. Puedes asistir con una persona de tu familia.',
    date: '2026-09-26',
    attendees: ['Quilla', 'Cedro'],
  },
  {
    id: 'career-route-forum',
    kind: 'event',
    title: 'Foro: rutas después del colegio',
    body: 'Un panel con estudiantes y egresados que compartieron distintos caminos de formación y trabajo.',
    date: '2026-09-12',
    attendees: ['Alex', 'Río', 'Quilla', 'Cedro'],
  },
  {
    id: 'science-lab-visit',
    kind: 'event',
    title: 'Visita al laboratorio de ciencias aplicadas',
    body: 'Una experiencia breve para conocer demostraciones de química, biología y tecnología en acción.',
    date: '2026-09-16',
    attendees: ['Nova', 'Brisa'],
  },
  {
    id: 'changing-work',
    kind: 'article',
    title: 'Cinco cambios que están transformando el mundo del trabajo',
    body: 'Una lectura breve preparada por orientación para reconocer nuevas ocupaciones, habilidades transferibles y distintas rutas de formación.',
    date: '2026-09-17',
    attendees: [],
  },
  {
    id: 'design-open-house',
    kind: 'event',
    title: 'Visita abierta: diseño, tecnología y creatividad',
    body: 'Recorre talleres, conversa con estudiantes y participa en mini experiencias de animación, diseño y desarrollo web.',
    date: '2026-10-03',
    attendees: ['Río', 'Nova', 'Brisa', 'Cedro'],
  },
  {
    id: 'financial-aid-workshop',
    kind: 'event',
    title: 'Taller para entender becas y financiamiento',
    body: 'Trae tus preguntas sobre requisitos, cronogramas y alternativas para continuar estudiando después del colegio.',
    date: '2026-10-10',
    attendees: ['Quilla'],
  },
  {
    id: 'ask-before-choosing',
    kind: 'publication',
    title: 'Preguntas útiles antes de elegir una carrera',
    body: 'Guarda estas preguntas para una visita o entrevista: ¿cómo es un día habitual?, ¿qué desafíos tiene el trabajo?, ¿qué rutas permiten llegar allí?',
    date: '2026-09-15',
    attendees: [],
  },
  {
    id: 'scholarships-update',
    kind: 'news',
    title: 'Nuevas charlas informativas sobre becas',
    body: 'Esta semana se publicaron nuevas sesiones para conocer requisitos, fechas y alternativas de financiamiento educativo.',
    date: '2026-09-14',
    attendees: [],
  },
] as const

// DATO DE PRUEBA: Videos de recursos de ejemplo; los reemplazará el catálogo integrado.
export const resourceDemoVideos = [
  {
    id: 'i3',
    title: 'Creadora audiovisual',
    alias: 'Daniela, Sofía y Marcos',
    url: 'https://example.com/audiovisual',
    reflection: 'Aprendimos cómo se combinan narrativa, tecnología y coordinación en una producción.',
    createdAt: '2026-09-17T18:00:00.000Z',
  },
  {
    id: 'demo-environmental-engineering',
    title: 'Así se investiga la calidad del agua',
    alias: 'Brisa',
    url: 'https://example.com/exploracion-ambiental',
    reflection:
      'Conversé con una ingeniera ambiental y descubrí que combina trabajo de campo, análisis y diálogo con comunidades.',
    createdAt: '2026-09-16T18:00:00.000Z',
  },
  {
    id: 'demo-industrial-design',
    title: 'Objetos que hacen más fácil la vida diaria',
    alias: 'Río y Cedro',
    url: 'https://example.com/diseno-industrial',
    reflection:
      'Entrevistamos a una diseñadora industrial. Nos sorprendió cómo observa un problema, prueba ideas y trabaja con otras personas para convertirlas en objetos útiles.',
    createdAt: '2026-09-18T18:00:00.000Z',
  },
  {
    id: 'demo-culinary-arts',
    title: 'Creatividad y organización detrás de una cocina',
    alias: 'Nova',
    url: 'https://example.com/artes-culinarias',
    reflection:
      'Una chef nos contó que cocinar profesionalmente también significa planificar, liderar equipos y escuchar a las personas que reciben el plato.',
    createdAt: '2026-09-20T18:00:00.000Z',
  },
  {
    id: 'demo-electrical-tech',
    title: 'Cómo se mantiene segura una instalación eléctrica',
    alias: 'Quilla y Brisa',
    url: 'https://example.com/electricidad',
    reflection:
      'Descubrimos una ruta técnica con mucho trabajo práctico, atención al detalle y responsabilidad por la seguridad de otras personas.',
    createdAt: '2026-09-21T18:00:00.000Z',
  },
]

// DATO DE PRUEBA: Lectura de recurso de ejemplo; la reemplazará el catálogo integrado.
export const resourceReading =
  'Explorar tu futuro es un proceso. Puedes empezar por reconocer experiencias que disfrutas, conversar con personas de distintas profesiones y anotar las preguntas que aparecen. No necesitas tener una respuesta definitiva hoy. Tu siguiente paso puede ser pequeño y cambiar con lo que aprendas.'

export const legendInterviews = [
  {
    id: 'legend-community-health',
    title: 'Cuidar también es prevenir y escuchar',
    alias: 'Luna y Tilo · Salón 2025',
    url: '',
    reflection:
      'Una entrevista sobre el trabajo de una enfermera comunitaria: educación, prevención y acompañamiento a las familias.',
    createdAt: '2025-11-18T16:00:00.000Z',
  },
  {
    id: 'legend-animation',
    title: 'De una idea a un personaje en movimiento',
    alias: 'Mar · Salón 2024',
    url: '',
    reflection:
      'Una conversación sobre creatividad, práctica constante y la importancia de construir proyectos de animación en equipo.',
    createdAt: '2024-10-09T17:00:00.000Z',
  },
]
