// DATO DE PRUEBA: estado demostrativo de la orientadora; se reemplazará por los datos de su institución.
import type {
  Activity,
  ActivityProgress,
  CounselorPortalState,
  Interest,
  PerceptionApplication,
  PerceptionItem,
  Resource,
  Student,
  TopicTag,
} from '../types'

const counselorProfile = {
  name: 'Patricia Mendoza',
  role: 'Orientadora vocacional',
  email: 'pmendoza@colegio.edu.pe',
}

const tags: TopicTag[] = [
  { id: 't1', code: 'T1', name: 'Autoconocimiento', description: 'Intereses, habilidades y fortalezas.' },
  {
    id: 't2',
    code: 'T2',
    name: 'Historia personal y proyecto de vida',
    description: 'Historia, metas y aspiraciones.',
  },
  { id: 't3', code: 'T3', name: 'Entorno e influencias', description: 'Familia, amistades y expectativas.' },
  { id: 't4', code: 'T4', name: 'Creencias y mitos', description: 'Prestigio, estereotipos y prejuicios.' },
  {
    id: 't5',
    code: 'T5',
    name: 'Mundo profesional',
    description: 'Ocupaciones y testimonios profesionales.',
  },
  { id: 't6', code: 'T6', name: 'Mercado laboral y formación', description: 'Demanda, rutas y requisitos.' },
  { id: 't7', code: 'T7', name: 'Financiamiento', description: 'Costos, becas y presupuestos.' },
  { id: 't8', code: 'T8', name: 'Decisión y emociones', description: 'Seguridad, presión e incertidumbre.' },
]

const perceptionItems: PerceptionItem[] = [
  {
    id: 'pi1',
    order: 1,
    statement: 'Tengo información acerca de cómo se desempeña un profesional en la carrera que me gusta.',
    tagIds: ['t5'],
    direction: 'POSITIVA',
  },
  {
    id: 'pi2',
    order: 2,
    statement: 'Conozco las instituciones donde estudiar la carrera que me gusta.',
    tagIds: ['t6'],
    direction: 'POSITIVA',
  },
  {
    id: 'pi3',
    order: 3,
    statement: 'Siento presión de mi grupo de amigos/as sobre la profesión que debo elegir.',
    tagIds: ['t3', 't8'],
    direction: 'INVERSA',
  },
  {
    id: 'pi4',
    order: 4,
    statement: 'Siento presión de mis padres o familiares sobre la profesión que debo elegir.',
    tagIds: ['t3', 't8'],
    direction: 'INVERSA',
  },
  {
    id: 'pi5',
    order: 5,
    statement: 'Me gusta mi futura profesión porque goza de buena reputación y reconocimiento social.',
    tagIds: ['t4'],
    direction: 'NEUTRA',
  },
  {
    id: 'pi6',
    order: 6,
    statement: 'Mi futura profesión está influenciada por el dinero que podré recibir de ella.',
    tagIds: ['t6', 't7'],
    direction: 'NEUTRA',
  },
  {
    id: 'pi7',
    order: 7,
    statement: 'Por los recursos económicos de mi familia, debo elegir una profesión que no me satisface.',
    tagIds: ['t7', 't8'],
    direction: 'INVERSA',
  },
  {
    id: 'pi8',
    order: 8,
    statement: 'Una carrera de mando intermedio no tiene la reputación social que deseo.',
    tagIds: ['t4', 't6'],
    direction: 'INVERSA',
  },
  {
    id: 'pi9',
    order: 9,
    statement: 'Estoy seguro(a) de lo que voy a estudiar.',
    tagIds: ['t1', 't2', 't8'],
    direction: 'POSITIVA',
  },
  {
    id: 'pi10',
    order: 10,
    statement: 'Mis calificaciones más altas están en cursos elementales para mi futura profesión.',
    tagIds: ['t1'],
    direction: 'POSITIVA',
  },
]

const activities: Activity[] = [
  activity('act-01', 'ACT-01', 'Punto de partida', 'B0', 1, 'ENCUENTRO', ['t8']),
  activity('act-02', 'ACT-02', 'Las voces que me rodean', 'B0', 2, 'REGISTRO', ['t3']),
  activity('act-04', 'ACT-04', 'Mi historia personal', 'B1', 3, 'REGISTRO', ['t2']),
  activity('act-05', 'ACT-05', 'Mis aspiraciones', 'B1', 4, 'REGISTRO', ['t2', 't3', 't8']),
  activity('act-06', 'ACT-06', 'Línea de tiempo', 'B1', 5, 'REGISTRO', ['t2']),
  activity('act-08', 'ACT-08', 'Intereses vocacionales', 'B2', 6, 'TEST', ['t1']),
  activity('act-10', 'ACT-10', 'Habilidades sociales', 'B2', 7, 'TEST', ['t1']),
  activity('act-12', 'ACT-12', 'Exploro posibilidades', 'B3', 8, 'REGISTRO', ['t5']),
  activity('act-13', 'ACT-13', 'Rutas y costos', 'B3', 9, 'REGISTRO', ['t6', 't7']),
  activity('act-15', 'ACT-15', 'Entrevista a un profesional', 'B3', 10, 'REGISTRO', ['t5']),
  activity('act-17', 'ACT-17', 'Contrasto mis opciones', 'B4', 11, 'REGISTRO', ['t1', 't8']),
  activity('act-18', 'ACT-18', 'Proyecto de vida', 'B4', 12, 'REGISTRO', ['t2', 't8']),
  activity('act-19', 'ACT-19', 'Mi siguiente decisión', 'B5', 13, 'REGISTRO', ['t8']),
  {
    ...activity('case-forest', 'CAS-01', 'Incendio forestal', 'Casos', 1, 'CASO', ['t5']),
    sequential: false,
  },
  {
    ...activity('case-radio', 'CAS-02', 'Una voz para el barrio', 'Casos', 2, 'CASO', ['t5']),
    sequential: false,
  },
  {
    ...activity('case-river', 'CAS-03', 'El misterio del río', 'Casos', 3, 'CASO', ['t5']),
    sequential: false,
  },
  familyActivity('parent-role', 'Módulo sobre el rol del apoderado', undefined, ['t3']),
  familyActivity('act-p01', 'ACT-P01 Mi rol en el proceso', 'act-04', ['t3']),
  familyActivity('act-p02', 'ACT-P02 Me fortalezco para acompañar', 'act-17', ['t3', 't8']),
  {
    ...familyActivity('act-p03-1', 'ACT-P03-1 Primera conversación familiar', 'act-05', ['t3', 't8']),
    participant: 'FAMILIAR',
    type: 'REGISTRO',
  },
  {
    ...familyActivity('act-p03-2', 'ACT-P03-2 Segunda conversación familiar', 'act-10', ['t3', 't8']),
    participant: 'FAMILIAR',
    type: 'REGISTRO',
  },
]

function activity(
  id: string,
  code: string,
  name: string,
  block: string,
  order: number,
  type: Activity['type'],
  tagIds: string[],
): Activity {
  return {
    id,
    code,
    name,
    block,
    order,
    type,
    sequential: true,
    participant: 'ESTUDIANTE',
    tagIds,
    premise: `Reflexiona y registra tus hallazgos para ${name.toLocaleLowerCase('es-PE')}.`,
  }
}

function familyActivity(
  id: string,
  name: string,
  activatedById: string | undefined,
  tagIds: string[],
): Activity {
  return {
    id,
    code: id.toUpperCase(),
    name,
    block: 'Familia',
    order: 0,
    type: 'MODULO_FAMILIAR',
    sequential: false,
    participant: 'APODERADO',
    activatedById,
    tagIds,
  }
}

const classrooms = [
  { id: '4b', name: '4.º de secundaria · B', grade: '4.º de secundaria', section: 'B', promotion: '2027' },
  { id: '5a', name: '5.º de secundaria · A', grade: '5.º de secundaria', section: 'A', promotion: '2026' },
]

const people = [
  ['s1', '4b', 'Alejandro Rojas', 12, 0],
  ['s2', '4b', 'Valentina Torres', 10, 1],
  ['s3', '4b', 'Diego Ramírez', 7, 9],
  ['s4', '4b', 'Lucía Salazar', 9, 2],
  ['s5', '4b', 'Mateo Quispe', 3, 12],
  ['s6', '5a', 'Sofía Sánchez', 13, 0],
  ['s7', '5a', 'Joaquín Paredes', 10, 1],
  ['s8', '5a', 'Daniela Castro', 11, 2],
  ['s9', '5a', 'Sebastián Luna', 8, 8],
  ['s10', '5a', 'Camila Vargas', 12, 0],
] as const

function isoAgo(now: Date, days: number, hours = 12) {
  const date = new Date(now)
  date.setHours(hours, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function indexMatch(studentId: string): 'GREAT' | 'GOOD' | 'BAD' {
  const value = Number(studentId.replace('s', '')) % 3
  return value === 0 ? 'BAD' : value === 1 ? 'GREAT' : 'GOOD'
}

function buildInterests(studentId: string, now: Date, sparse: boolean): Interest[] {
  const cardComplete = studentId === 's1' || studentId === 's6'
  const base: Interest[] = [
    {
      id: `${studentId}-career-1`,
      type: 'CARRERA',
      name: studentId === 's2' ? 'Diseño gráfico' : 'Enfermería',
      origin: 'Test RIASEC',
      addedAt: isoAgo(now, sparse ? 28 : 40),
      status: 'ACTIVO',
      riasecCode: studentId === 's2' ? 'A-S-I' : 'S-I-A',
      riasecMatch: cardComplete ? 'GREAT' : 'GOOD',
      card: {
        motivation: 'Me interesa aportar a otras personas y resolver problemas concretos.',
        influences: cardComplete
          ? [{ person: 'Docente', description: 'Me ayudó a reconocer esta posibilidad.' }]
          : [],
        knowledge: cardComplete
          ? 'Acompaña, evalúa necesidades y coordina soluciones con un equipo.'
          : undefined,
        preparations: cardComplete ? ['Participar en una charla vocacional'] : [],
        budgets: cardComplete
          ? [
              {
                institution: 'Instituto del Sur',
                institutionType: 'Privada',
                duration: '3 años',
                totalCost: 28500,
              },
            ]
          : [],
      },
    },
  ]
  if (!sparse) {
    base.push({
      id: `${studentId}-career-2`,
      type: 'CARRERA',
      name: 'Ingeniería ambiental',
      origin: 'Catálogo',
      addedAt: isoAgo(now, 6),
      status: 'ACTIVO',
      riasecCode: 'I-R-S',
      riasecMatch: indexMatch(studentId),
      partialCardParts: ['motivation'],
      card: { motivation: 'En exploración', influences: [], preparations: [], budgets: [] },
    })
    base.push({
      id: `${studentId}-occupation-1`,
      type: 'OCUPACION',
      name: 'Gestor de proyectos sociales',
      origin: 'Caso',
      addedAt: isoAgo(now, 3),
      status: 'ACTIVO',
    })
    base.push({
      id: `${studentId}-discarded`,
      type: 'CARRERA',
      name: 'Derecho',
      origin: 'Cuestionario de entrada',
      addedAt: isoAgo(now, 60),
      status: 'DESCARTADO',
      discardedAt: isoAgo(now, 12),
      discardReason: 'ACT-17',
    })
  }
  return base
}

function buildStudent(row: (typeof people)[number], now: Date, index: number): Student {
  const [id, classroomId, name, completedCount, inactiveDays] = row
  const sequential = activities.filter((item) => item.sequential && item.participant === 'ESTUDIANTE')
  const progress: ActivityProgress[] = sequential.slice(0, completedCount).map((item, activityIndex) => ({
    activityId: item.id,
    status: 'COMPLETADA' as const,
    startedAt: isoAgo(now, 62 - activityIndex * 4),
    completedAt: isoAgo(now, 60 - activityIndex * 4),
  }))
  if (completedCount < sequential.length)
    progress.push({
      activityId: sequential[completedCount].id,
      status: 'EN_CURSO',
      startedAt: isoAgo(now, Math.max(1, inactiveDays)),
    })
  const completedRecordActivities = activities.filter(
    (item) =>
      item.type === 'REGISTRO' &&
      item.participant === 'ESTUDIANTE' &&
      progress.some((entry) => entry.activityId === item.id && entry.status === 'COMPLETADA'),
  )
  const reviewTarget = id === 's3' ? 'act-06' : id === 's5' ? 'act-04' : id === 's9' ? 'act-12' : undefined
  const records = completedRecordActivities.map((item, recordIndex) => ({
    id: `${id}-${item.id}-v1`,
    activityId: item.id,
    version: 1,
    text: `Registro de ${name} para ${item.name}. Incluye aprendizajes y próximos pasos.`,
    date: isoAgo(now, 45 - recordIndex * 4),
    items: [
      {
        id: `${id}-${item.id}-item-1`,
        prompt: item.premise ?? `¿Qué descubriste en ${item.name}?`,
        response: `Identifiqué aprendizajes importantes durante ${item.name.toLocaleLowerCase('es-PE')}.`,
      },
      {
        id: `${id}-${item.id}-item-2`,
        prompt: '¿Cómo se relaciona esto con tu decisión vocacional?',
        response: `Lo relaciono con mis intereses y con los siguientes pasos que quiero investigar.`,
      },
    ],
    preliminaryReview: item.id === reviewTarget ? ('OBSERVADO' as const) : ('ADECUADO' as const),
    reviewReason:
      item.id === reviewTarget
        ? id === 's5'
          ? 'La respuesta requiere mayor desarrollo.'
          : 'Las respuestas son demasiado breves.'
        : undefined,
    reviewStatus: item.id === reviewTarget ? ('SIN_ATENDER' as const) : ('ACEPTADO' as const),
  }))
  const entryAnswers = Object.fromEntries(
    perceptionItems.map((item) => [item.id, Math.max(1, Math.min(5, 2 + ((index + item.order) % 3)))]),
  )
  const exitAnswers = Object.fromEntries(
    perceptionItems.map((item) => [
      item.id,
      Math.max(1, Math.min(5, entryAnswers[item.id] + (item.direction === 'INVERSA' ? -1 : 1))),
    ]),
  )
  const perceptions: PerceptionApplication[] = [
    { moment: 'ENTRADA', date: isoAgo(now, 70), answers: entryAnswers },
  ]
  if (completedCount >= 11) perceptions.push({ moment: 'SALIDA', date: isoAgo(now, 2), answers: exitAnswers })
  const guardianMissing = id === 's3'
  const guardian = guardianMissing
    ? undefined
    : {
        name:
          [
            'Ana Rojas',
            'Miguel Torres',
            '',
            'Rosa Salazar',
            'Elena Quispe',
            'María Sánchez',
            'Carlos Paredes',
            'Teresa Castro',
            'Pedro Luna',
            'Julia Vargas',
          ][index] || 'Apoderado/a',
        relationship: index % 2 ? 'Padre' : 'Madre',
        email: `familia.${id}@correo.pe`,
        phone: `+51 987 65${index} 12${index}`,
        firstAccess: isoAgo(now, 80),
        lastAccess: isoAgo(now, index + 1),
      }
  const lowCheckIns = id === 's3' ? [4, 3, 2] : id === 's5' ? [2, 2, 1] : [3, 4, 4]
  return {
    id,
    code: `EST-2026-${String(index + 1).padStart(3, '0')}`,
    classroomId,
    name,
    email: `${name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(' ', '.')}@alumno.edu.pe`,
    phone: `+51 999 10${index} 20${index}`,
    firstAccess: isoAgo(now, 180),
    lastAccess: isoAgo(now, inactiveDays),
    progress,
    records,
    perceptions,
    entranceAnswers: [
      {
        question: '¿Qué esperas de este proceso?',
        answer: 'Conocer opciones y tomar una decisión con más información.',
      },
      {
        question: '¿Qué tema te preocupa más?',
        answer: index % 2 ? 'Los costos y las becas.' : 'Encontrar una opción que conecte con mis intereses.',
      },
    ],
    testResults: [
      {
        name: 'RIASEC',
        summary: index % 2 ? 'ASI' : 'SIA',
        details: ['Social', 'Investigador', 'Artístico'],
      },
      {
        name: 'Inteligencias',
        summary: 'Interpersonal · Lingüística · Naturalista',
        details: ['Interpersonal', 'Lingüística', 'Naturalista'],
      },
      {
        name: 'Estilos de aprendizaje',
        summary: index % 2 ? 'Visual y reflexivo' : 'Activo y visual',
        details: ['Dimensión predominante identificada'],
      },
      {
        name: 'Habilidades sociales',
        summary: 'Escucha y colaboración',
        details: ['Fortaleza: escucha', 'Por mejorar: expresar desacuerdos'],
      },
    ],
    interests: buildInterests(id, now, id === 's9'),
    institutions:
      id === 's9'
        ? []
        : [
            {
              id: `${id}-institution-1`,
              name: index % 2 ? 'Universidad del Pacífico' : 'Instituto del Sur',
              type: index % 2 ? 'UNIVERSIDAD' : 'INSTITUTO',
              addedAt: isoAgo(now, 9),
            },
            ...(id === 's7'
              ? [
                  {
                    id: `${id}-institution-2`,
                    name: 'Escuela de Oficiales',
                    type: 'FUERZAS_ARMADAS' as const,
                    addedAt: isoAgo(now, 4),
                  },
                ]
              : []),
          ],
    diaryUsage: {
      total: 4 + index,
      spontaneous: 1 + (index % 3),
      prompted: 3 + Math.floor(index / 2),
      lastEntry: isoAgo(now, index % 5),
      weekly: [1, 2, index % 3, 2],
    },
    checkIns: lowCheckIns.map((value, checkIndex) => ({
      id: `${id}-check-${checkIndex}`,
      date: isoAgo(now, 12 - checkIndex * 4, 9 + checkIndex * 3),
      value: value as 1 | 2 | 3 | 4 | 5,
    })),
    completedCaseIds:
      completedCount > 9 ? ['case-forest', 'case-radio'] : completedCount > 6 ? ['case-forest'] : [],
    completedCaseDates:
      completedCount > 9
        ? { 'case-forest': isoAgo(now, 18), 'case-radio': isoAgo(now, 8) }
        : completedCount > 6
          ? { 'case-forest': isoAgo(now, 18) }
          : {},
    familyActivities: [
      {
        activityId: 'parent-role',
        status: guardian ? 'COMPLETADA' : undefined,
        completedAt: guardian ? isoAgo(now, 60) : undefined,
      },
      {
        activityId: 'act-p01',
        status: id === 's5' ? 'EN_CURSO' : guardian && completedCount > 4 ? 'COMPLETADA' : undefined,
        completedAt: guardian && completedCount > 4 && id !== 's5' ? isoAgo(now, 28) : undefined,
      },
      { activityId: 'act-p02', status: completedCount > 11 ? 'EN_CURSO' : undefined },
    ],
    familyConversations: [
      {
        activityId: 'act-p03-1',
        studentPrompt: '¿Qué esperas de tu familia mientras exploras tus intereses?',
        studentRecord:
          completedCount > 4 ? 'Conversamos sobre las expectativas familiares y mis intereses.' : undefined,
        guardianPrompt: '¿Cómo puedes acompañar la exploración de tu hijo o hija?',
        guardianLetter:
          guardian && completedCount > 5 ? 'Quiero acompañarte escuchando antes de aconsejar.' : undefined,
        completedAt: guardian && completedCount > 5 ? isoAgo(now, 25) : undefined,
      },
      {
        activityId: 'act-p03-2',
        studentPrompt: '¿Qué acuerdos alcanzaron después de conversar sobre tus opciones?',
        studentRecord:
          completedCount > 7 ? 'Comparamos opciones y acordamos investigar los costos.' : undefined,
        guardianPrompt: '¿Qué compromiso asumirás para apoyar los siguientes pasos?',
        guardianLetter:
          guardian && completedCount > 10
            ? 'Confío en que puedas construir una decisión informada.'
            : undefined,
        completedAt: guardian && completedCount > 10 ? isoAgo(now, 4) : undefined,
      },
    ],
    guardian,
    additionalGuardians:
      id === 's7' && guardian
        ? [{ ...guardian, name: 'Lucía Paredes', relationship: 'Tía', email: 'lucia.paredes@correo.pe' }]
        : undefined,
  }
}

function seedResources(now: Date): Resource[] {
  return [
    {
      id: 'resource-availability',
      type: 'PUBLICACION',
      title: 'Horario de atención de orientación',
      description: 'Martes y jueves en el recreo, oficina de Psicología.',
      tagIds: ['t8'],
      audience: 'AMBOS',
      publicationDate: isoAgo(now, 5),
      viewCount: 38,
      favoriteCount: 3,
    },
    {
      id: 'resource-finance',
      type: 'PUBLICACION',
      title: 'Guía breve de becas y financiamiento',
      description: 'Preguntas clave para comparar alternativas de financiamiento.',
      url: 'https://example.com/becas',
      tagIds: ['t7'],
      audience: 'AMBOS',
      publicationDate: isoAgo(now, 3),
      viewCount: 64,
      favoriteCount: 14,
    },
    {
      id: 'resource-work',
      type: 'PUBLICACION',
      title: 'Así trabaja una profesional de salud',
      description: 'Testimonio sobre tareas, retos y formación.',
      url: 'https://example.com/salud',
      tagIds: ['t5'],
      audience: 'ESTUDIANTES',
      publicationDate: isoAgo(now, 1),
      viewCount: 51,
      favoriteCount: 9,
    },
    {
      id: 'event-fair',
      type: 'EVENTO',
      title: 'Feria de carreras y oficios',
      description: 'Conoce instituciones y conversa con profesionales.',
      url: 'https://example.com/feria',
      tagIds: ['t5', 't6'],
      audience: 'AMBOS',
      publicationDate: isoAgo(now, 8),
      viewCount: 72,
      favoriteCount: 6,
      event: {
        dateTime: isoAgo(now, -8, 10),
        organizer: 'Colegio Nuevo Horizonte',
        modality: 'PRESENCIAL',
        hasCost: false,
      },
    },
    {
      id: 'event-old',
      type: 'EVENTO',
      title: 'Charla de admisión',
      description: 'Sesión informativa sobre modalidades de ingreso.',
      url: 'https://example.com/admision',
      tagIds: ['t6'],
      audience: 'ESTUDIANTES',
      publicationDate: isoAgo(now, 20),
      viewCount: 43,
      favoriteCount: 2,
      event: { dateTime: isoAgo(now, 4, 16), organizer: 'Instituto del Sur', modality: 'VIRTUAL' },
    },
  ]
}

function createCounselorPortalState(now = new Date()): CounselorPortalState {
  return {
    referenceDate: now.toISOString(),
    classrooms,
    tags,
    perceptionItems,
    activities,
    students: people.map((row, index) => buildStudent(row, now, index)),
    watchlist: [
      { studentId: 's3', reason: 'Revisar seguridad y ritmo de avance.', date: isoAgo(now, 6) },
      { studentId: 's9', reason: 'Exploración todavía muy cerrada.', date: isoAgo(now, 3) },
    ],
    excludedActivityIds: [],
    resources: seedResources(now),
    interviews: [
      {
        id: 'i1',
        videoId: 'demo-industrial-design',
        authors: ['Valentina Torres', 'Diego Ramos'],
        classroomId: '4b',
        subject: 'Diseñadora industrial',
        date: isoAgo(now, 3),
        commentCount: 8,
        url: 'https://example.com/diseno-industrial',
        reflection: 'Conocimos cómo observa problemas, crea prototipos y trabaja con equipos diversos.',
        featured: true,
      },
      {
        id: 'i2',
        videoId: 'demo-electrical-tech',
        authors: ['Joaquín Paredes'],
        classroomId: '5a',
        subject: 'Técnico electricista',
        date: isoAgo(now, 6),
        commentCount: 4,
        url: 'https://example.com/electricidad',
        reflection: 'Descubrimos una ruta práctica que exige precisión y responsabilidad por la seguridad.',
        featured: false,
      },
      {
        id: 'i3',
        authors: ['Daniela Castro', 'Sofía Luna', 'Marcos Vega'],
        classroomId: '5a',
        subject: 'Creadora audiovisual',
        date: isoAgo(now, 10),
        commentCount: 2,
        url: 'https://example.com/audiovisual',
        reflection: 'Aprendimos cómo se combinan narrativa, tecnología y coordinación en una producción.',
        featured: false,
      },
    ],
  }
}

export { activities, classrooms, counselorProfile, createCounselorPortalState, perceptionItems, tags }
