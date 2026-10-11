// DATO DE PRUEBA: estudiantes, cuestionarios y planes inventados; se reemplazarán por los datos de seguimiento del servidor.
import { careerCatalog } from '@/data/catalog/careersAndInstitutions'
import { occupationCatalog } from '@/data/catalog/occupations'
import type {
  Dimension,
  ProfileActivity,
  ProfileCatalog,
  ProfilePlan,
  QuestionnaireApplication,
  QuestionnaireDefinition,
  StudentProfile,
} from '@/types/studentProfile'

// A single clock keeps generated dates consistent across the list and profile.
export const profileReferenceDate = new Date().toISOString()
const daysAgo = (days: number) => {
  const date = new Date(profileReferenceDate)
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(17, 0, 0, 0)
  return date.toISOString()
}
export const blocks = [
  { id: 'start', name: 'Punto de partida' },
  { id: 'self', name: 'Me conozco' },
  { id: 'explore', name: 'Exploro posibilidades' },
  { id: 'decide', name: 'Mi siguiente decisión' },
]
const dimension = (
  id: string,
  name: string,
  description: string,
  color: string,
  possibleInterests?: string[],
): Dimension => ({
  id,
  name,
  description,
  color,
  possibleInterests,
})
const riasec = [
  dimension(
    'R',
    'Realista',
    'Prefiere resolver tareas prácticas con herramientas, materiales o equipos.',
    '#9a5222',
    ['Herramientas y construcción', 'Tecnología práctica', 'Trabajo al aire libre'],
  ),
  dimension(
    'I',
    'Investigador',
    'Le interesa analizar información, investigar y comprender cómo funcionan las cosas.',
    '#3567a8',
    ['Ciencia e investigación', 'Análisis de datos', 'Resolución de problemas'],
  ),
  dimension(
    'A',
    'Artístico',
    'Disfruta expresar ideas, crear y explorar formas originales de hacer las cosas.',
    '#8156a3',
    ['Diseño y creación visual', 'Música y escritura', 'Expresión artística'],
  ),
  dimension('S', 'Social', 'Se interesa por acompañar, enseñar y ayudar a otras personas.', '#287466', [
    'Educación',
    'Cuidado y acompañamiento',
    'Trabajo comunitario',
  ]),
  dimension('E', 'Emprendedor', 'Le atrae proponer iniciativas, persuadir y coordinar personas.', '#a44354', [
    'Emprendimiento',
    'Liderazgo de equipos',
    'Comunicación y negociación',
  ]),
  dimension(
    'C',
    'Convencional',
    'Prefiere organizar información y trabajar con procesos claros y ordenados.',
    '#686225',
    ['Organización de información', 'Administración', 'Gestión de datos y procesos'],
  ),
]
const scale = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']
export const questionnaires: QuestionnaireDefinition[] = [
  {
    id: 'interests',
    name: 'Test de intereses',
    kind: 'interests',
    priority: true,
    activityIds: ['interests-1', 'interests-2'],
    dimensions: riasec,
    description: 'Explora qué tipos de tareas y entornos de trabajo le interesan al estudiante.',
    interpretation:
      'Las barras muestran sus intereses por dimensión. El código reúne las tres dimensiones con mayor porcentaje.',
  },
  {
    id: 'social',
    name: 'Habilidades sociales',
    kind: 'highlights',
    priority: true,
    activityIds: ['social-1', 'social-2'],
    dimensions: [
      dimension('communication', 'Comunicación', 'Expresa ideas y escucha a otras personas.', '#3567a8'),
      dimension('empathy', 'Empatía', 'Reconoce y comprende lo que sienten otras personas.', '#287466'),
      dimension('cooperation', 'Cooperación', 'Colabora para alcanzar objetivos compartidos.', '#8156a3'),
    ],
    description: 'Explora cómo se percibe al comunicarse y relacionarse con otras personas.',
    interpretation:
      'Un porcentaje mayor indica una habilidad que reconoce más desarrollada. Las dimensiones con el valor más alto se destacan.',
  },
  {
    id: 'intelligences',
    name: 'Inteligencias múltiples',
    kind: 'highlights',
    priority: false,
    activityIds: ['intelligences-1', 'intelligences-2'],
    dimensions: [
      dimension('language', 'Lingüística', 'Usa el lenguaje para comprender y expresar ideas.', '#3567a8'),
      dimension(
        'logic',
        'Lógico-matemática',
        'Encuentra patrones y resuelve problemas mediante el razonamiento.',
        '#9a5222',
      ),
      dimension('visual', 'Espacial', 'Comprende imágenes, formas y relaciones en el espacio.', '#8156a3'),
      dimension('interpersonal', 'Interpersonal', 'Comprende y se relaciona con otras personas.', '#287466'),
    ],
    description: 'Explora formas de aprender y resolver tareas que el estudiante reconoce en sí mismo.',
    interpretation:
      'Las barras permiten comparar las dimensiones de su resultado. Todas las dimensiones empatadas en el máximo se muestran como destacadas.',
  },
  {
    id: 'entry',
    name: 'Cuestionario de entrada',
    kind: 'comparison',
    priority: true,
    activityIds: ['entry-in', 'entry-out'],
    scale,
    dimensions: [
      dimension(
        'knowledge',
        'Información sobre carreras',
        'Conoce alternativas de estudio y lo que hacen sus profesionales.',
        '#3567a8',
      ),
      dimension(
        'resources',
        'Recursos para decidir',
        'Reconoce sus recursos y alternativas para preparar su decisión.',
        '#287466',
      ),
      dimension(
        'decision',
        'Claridad de su decisión',
        'Identifica qué considera al elegir su siguiente paso.',
        '#8156a3',
      ),
    ],
    description: 'Explora cómo se percibe al comenzar y al finalizar su recorrido vocacional.',
    interpretation:
      'La comparación muestra el nivel y el porcentaje de cada dimensión en la entrada y la salida. El cambio indica si subió, bajó o se mantuvo entre ambas aplicaciones.',
  },
  {
    id: 'perception',
    name: 'Autopercepción',
    kind: 'comparison',
    priority: false,
    activityIds: ['perception-in', 'perception-out'],
    scale,
    dimensions: [
      dimension(
        'self',
        'Autoconocimiento',
        'Reconoce intereses, fortalezas y aspectos que desea desarrollar.',
        '#3567a8',
      ),
      dimension(
        'environment',
        'Entorno e influencias',
        'Identifica cómo su entorno interviene en sus decisiones.',
        '#9a5222',
      ),
      dimension(
        'confidence',
        'Confianza para elegir',
        'Reconoce su capacidad para evaluar opciones y tomar decisiones.',
        '#287466',
      ),
    ],
    description: 'Explora la percepción del estudiante sobre sí mismo y su proceso de decisión.',
    interpretation:
      'Cada dimensión agrupa respuestas relacionadas. Sus niveles de entrada y salida permiten observar cambios a lo largo del recorrido.',
  },
]
const recordDefinitions = [
  {
    id: 'story',
    title: 'Mi punto de partida',
    blockId: 'start',
    items: [
      { id: 'expectations', name: 'Expectativas', prompt: '¿Qué esperas descubrir durante este recorrido?' },
    ],
  },
  {
    id: 'swot',
    title: 'Mi FODA',
    blockId: 'self',
    items: [
      {
        id: 'strengths',
        name: 'Fortalezas',
        prompt: 'Describe capacidades que te ayudarán a alcanzar tus metas.',
      },
      { id: 'opportunities', name: 'Oportunidades', prompt: '¿Qué oportunidades ofrece tu entorno?' },
      { id: 'weaknesses', name: 'Debilidades', prompt: '¿Qué necesitas desarrollar o mejorar?' },
      { id: 'obstacles', name: 'Amenazas', prompt: '¿Qué dificultades podrían afectar tu recorrido?' },
    ],
  },
  {
    id: 'paths',
    title: 'Mis alternativas de estudio',
    blockId: 'explore',
    items: [
      {
        id: 'alternatives',
        name: 'Alternativas',
        prompt: 'Describe dos opciones de estudio y qué te interesa de cada una.',
      },
    ],
  },
  {
    id: 'preparation',
    title: 'Mi preparación',
    blockId: 'decide',
    items: [
      {
        id: 'steps',
        name: 'Próximos pasos',
        prompt: '¿Qué acciones realizarás para preparar tu siguiente paso?',
      },
    ],
  },
]
export const activities: ProfileActivity[] = [
  ...blocks.map((block, index) => ({
    id: `information-${block.id}`,
    title: `Información de ${block.name.toLocaleLowerCase('es')}`,
    blockId: block.id,
    order: index * 10,
    kind: 'information' as const,
    required: true,
    priority: false,
  })),
  ...recordDefinitions.map((record, index) => ({
    ...record,
    order: index * 10 + 8,
    kind: 'record' as const,
    required: true,
    priority: index < 2,
  })),
  ...questionnaires.flatMap((q, index) =>
    q.activityIds.map((id, part) => ({
      id,
      title: q.name,
      blockId: q.kind === 'comparison' ? (part === 0 ? 'start' : 'decide') : 'self',
      order: q.kind === 'comparison' ? (part === 0 ? index : 39 + index) : 12 + index * 2 + part,
      kind: 'questionnaire' as const,
      required: true,
      priority: false,
    })),
  ),
  ...['Un día en una ocupación', 'Exploración de la ciudad', 'Encuentro con un profesional'].map(
    (title, index) => ({
      id: `free-${index}`,
      title,
      blockId: 'explore',
      order: 50 + index,
      kind: 'information' as const,
      required: false,
      priority: false,
    }),
  ),
].sort((a, b) => a.order - b.order)

const careerLinks: Record<string, string[]> = {
  psychologist: ['psychology'],
  'community-manager': ['journalism'],
  photographer: ['journalism'],
  'documentary-filmmaker': ['journalism'],
  'urban-planner': ['civil-engineering', 'environmental-engineering'],
}
export const profileCatalog: ProfileCatalog = {
  occupations: occupationCatalog
    .filter((item) => careerLinks[item.id])
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.typicalWork,
      careerIds: careerLinks[item.id],
    })),
  careers: careerCatalog.map(({ id, name, description }) => ({ id, name, description })),
  institutions: [
    { id: 'unmsm', name: 'Universidad Nacional Mayor de San Marcos', shortName: 'UNMSM', careerIds: [] },
    { id: 'pucp', name: 'Pontificia Universidad Católica del Perú', shortName: 'PUCP', careerIds: [] },
    { id: 'utec', name: 'Universidad de Ingeniería y Tecnología', shortName: 'UTEC', careerIds: [] },
    { id: 'tecsup', name: 'Tecsup', shortName: 'Tecsup', careerIds: [] },
    {
      id: 'senati',
      name: 'Servicio Nacional de Adiestramiento en Trabajo Industrial',
      shortName: 'SENATI',
      careerIds: [],
    },
  ],
}

const identities: [string, string, number, number | null][] = [
  ['Ana Lucía', 'Álvarez Rojas', 32, 0],
  ['Bruno', 'Benavides Soto', 78, 1],
  ['Camila', 'Cárdenas Ruiz', 45, 9],
  ['Diego', 'Delgado Pérez', 84, 2],
  ['Elena', 'Espinoza León', 0, null],
  ['Fabio', 'Flores Vega', 66, 0],
  ['Gabriela', 'García Muñoz', 91, 1],
  ['Hugo', 'Huamán Torres', 57, 12],
  ['Inés', 'Ibáñez Castro', 72, 3],
  ['Javier', 'Jiménez Paredes', 39, 8],
  ['Karla', 'López Medina', 88, 0],
  ['Luis', 'Mendoza Díaz', 61, 5],
  ['María José', 'Acosta Salas', 76, 1],
  ['Nicolás', 'Bravo Ortiz', 28, 10],
  ['Olivia', 'Chávez Mora', 94, 0],
  ['Pedro', 'Dávila Ramos', 52, 4],
  ['Rosa', 'Fernández Gil', 81, 2],
  ['Santiago', 'Gómez Peña', 34, 14],
  ['Teresa', 'Herrera Núñez', 69, 1],
  ['Ulises', 'Ibarra Cruz', 47, 7],
  ['Valeria', 'Luna Reyes', 87, 0],
  ['Walter', 'Morales Silva', 56, 6],
  ['Ximena', 'Navarro Quispe', 93, 1],
  ['Yahir', 'Ponce Vidal', 42, 11],
]
const makePlan = (slot: ProfilePlan['slot'], careerId: string, complete: boolean): ProfilePlan => ({
  slot,
  careerId,
  updatedAt: daysAgo(2),
  motivation: 'Me interesa comprender problemas y aportar soluciones para otras personas.',
  swot: {
    strengths: 'Escucho con atención y organizo mis tareas.',
    weaknesses: 'Quiero mejorar mi expresión frente a grupos.',
    opportunities: complete ? 'Puedo conversar con profesionales de mi comunidad.' : '',
    obstacles: complete ? 'Necesito organizar el tiempo y los costos de estudio.' : '',
  },
  budget: complete
    ? {
        institutionId: 'unmsm',
        tuition: 0,
        enrollment: 350,
        housing: 0,
        scholarship: 'Sin beca',
      }
    : undefined,
  actions: [
    { description: 'Revisar los requisitos de admisión.', date: daysAgo(-5) },
    ...(complete
      ? [{ description: 'Conversar con un profesional sobre su trabajo.', date: daysAgo(-12) }]
      : []),
  ],
})

function makeStudent(
  [nombres, apellidos, targetPercent, accessDays]: (typeof identities)[number],
  index: number,
): StudentProfile {
  const initial = index === 4 || index >= 14
  const advanced = !initial && (index === 6 || targetPercent >= 80)
  const intermediate = index === 5
  const missingFamily = initial || [2, 11, 17, 21].includes(index)
  const noOptions = initial || [0, 7, 15, 21].includes(index)
  const recordsAttention = intermediate || [11, 13, 19].includes(index)
  const applications: QuestionnaireApplication[] = questionnaires.map((q, qIndex) => {
    const inProgress = !initial && !advanced && qIndex === 1
    const hasResult = !initial && !inProgress && (advanced || qIndex !== 2)
    const completedParts = initial ? 0 : inProgress ? 1 : hasResult ? 2 : 0
    if (!hasResult)
      return {
        questionnaireId: q.id,
        state: inProgress ? 'in-progress' : 'not-started',
        completedParts,
        totalParts: 2,
      }
    const values = q.dimensions.map((d, i) => ({
      dimensionId: d.id,
      percent:
        q.kind === 'interests' && intermediate
          ? 50
          : qIndex === 2 && i < 2
            ? 85
            : [60, 70, 85, 55, 45, 35][(i + index) % 6],
    }))
    const completedAt = daysAgo(8)
    if (q.kind === 'comparison') {
      const entry = q.dimensions.map((d, i) => ({
        dimensionId: d.id,
        level: [2, 3, 4][i % 3],
        percent: [40, 60, 80][i % 3],
      }))
      const exit = advanced
        ? entry.map((v, i) => ({
            ...v,
            level: i === 2 ? v.level! - 1 : i === 1 ? v.level : v.level! + 1,
            percent: i === 2 ? v.percent - 20 : i === 1 ? v.percent : v.percent + 20,
          }))
        : undefined
      return {
        questionnaireId: q.id,
        state: advanced ? 'completed' : 'in-progress',
        completedParts: advanced ? 2 : 1,
        totalParts: 2,
        completedAt: advanced ? daysAgo(2) : undefined,
        result: {
          kind: 'comparison',
          entry,
          exit,
          entryDate: completedAt,
          exitDate: advanced ? daysAgo(2) : undefined,
        },
      }
    }
    return {
      questionnaireId: q.id,
      state: 'completed',
      completedParts: 2,
      totalParts: 2,
      completedAt,
      result:
        q.kind === 'interests'
          ? {
              kind: 'interests',
              values,
              matches: intermediate
                ? []
                : profileCatalog.occupations.slice(0, 6).map((item, i) => ({
                    occupationId: item.id,
                    fit: i < 2 ? 'very-high' : i < 4 ? 'high' : 'good',
                  })),
            }
          : { kind: 'highlights', values },
    }
  })
  const required = activities.filter((a) => a.required)
  const desiredCompleted = initial ? 0 : Math.round((required.length * targetPercent) / 100)
  const completedIds = new Set(
    applications.flatMap((q) =>
      questionnaires.find((def) => def.id === q.questionnaireId)!.activityIds.slice(0, q.completedParts),
    ),
  )
  const remaining = required.filter((a) => a.kind !== 'questionnaire' && (advanced || a.blockId !== 'decide'))
  for (const item of remaining) if (completedIds.size < desiredCompleted) completedIds.add(item.id)
  const plans = noOptions
    ? []
    : [
        makePlan('A', 'psychology', advanced),
        ...(advanced
          ? [makePlan('B', 'journalism', true), makePlan('C', 'nursing', true)]
          : [makePlan('B', 'civil-engineering', false)]),
      ]
  return {
    id: `ejemplo-${String(index + 1).padStart(2, '0')}`,
    nombres,
    apellidos,
    email: `estudiante.${String(index + 1).padStart(2, '0')}@example.com`,
    salon: index < 12 ? '5.° A' : '5.° B',
    ultimoIngreso: accessDays === null ? null : daysAgo(accessDays),
    availableBlockIds: initial
      ? ['start']
      : advanced
        ? blocks.map((b) => b.id)
        : ['start', 'self', 'explore'],
    activities: activities.map((activity) => {
      const completed = completedIds.has(activity.id) || (!activity.required && advanced)
      const underway = !initial && !completed && activity.kind === 'record' && activity.id === 'preparation'
      return {
        activityId: activity.id,
        state: completed ? 'completed' : underway ? 'in-progress' : 'not-started',
        updatedAt: completed || underway ? daysAgo(3) : undefined,
        completedAt: completed ? daysAgo(4) : undefined,
        answers:
          activity.items && (completed || underway)
            ? activity.items
                .filter((_, i) => !underway || i === 0)
                .map((item, i) => ({
                  itemId: item.id,
                  text:
                    recordsAttention && activity.id === 'swot' && i === 3
                      ? 'Me preocupa no poder continuar mis estudios.\nSiento mucha presión y quisiera conversar sobre mis opciones.'
                      : !advanced && i === 1
                        ? 'Seguir estudiando.'
                        : `Quiero conocer mejor mis alternativas y prepararme con tiempo.\nPuedo apoyarme en mi familia y en personas que conocen esta área.`,
                  date: daysAgo(3),
                  underdeveloped: !advanced && i === 1,
                  attention: recordsAttention && activity.id === 'swot' && i === 3,
                }))
            : [],
      }
    }),
    questionnaires: applications,
    plans,
    initialInterest: noOptions
      ? undefined
      : { careerId: advanced ? 'journalism' : 'environmental-engineering', date: daysAgo(40) },
    favorites: noOptions
      ? { careers: [], occupations: [], institutions: [] }
      : {
          careers: ['psychology', 'journalism'],
          occupations: profileCatalog.occupations.slice(0, 2).map((item) => item.id),
          institutions: ['unmsm', 'tecsup'],
        },
    guardian: missingFamily
      ? undefined
      : {
          name: `${index % 2 ? 'Rosa' : 'José'} ${apellidos}`,
          relationship: index % 2 ? 'Madre' : 'Padre',
          email: `apoderado.${String(index + 1).padStart(2, '0')}@example.com`,
          completed: advanced ? 4 : 1,
          total: 4,
        },
    conversations: ['Lo que descubro de mí', 'Mis alternativas', 'Mi siguiente paso'].map((name, i) => ({
      id: `conversation-${i}`,
      name,
      state:
        missingFamily || (!advanced && i === 2) ? 'unavailable' : advanced && i < 2 ? 'completed' : 'pending',
      date: !missingFamily && advanced && i < 2 ? daysAgo(6 - i) : undefined,
    })),
    signals: initial
      ? []
      : Array.from({ length: 21 }, (_, i) => ({
          date: daysAgo(20 - i).slice(0, 10),
          session: i % 4 !== 0,
          security:
            i % 4 === 0 ? null : advanced ? (i < 10 ? 5 : i < 16 ? 7 : 9) : i < 10 ? 7 : i < 16 ? 5 : 3,
          diaryEntries: i % 4 === 0 ? 0 : advanced ? (i < 10 ? 1 : 3) : i < 10 ? 3 : 1,
        })),
  }
}
export const studentProfiles: StudentProfile[] = identities.map(makeStudent).map((student, index) => {
  // Keep the three representative profiles intact; enrich the other active examples.
  if (![4, 5, 6].includes(index) && index < 14) {
    if (student.plans.length)
      student.plans = student.plans.map((plan, offset) => ({
        ...plan,
        careerId: profileCatalog.careers[(index + offset) % profileCatalog.careers.length].id,
      }))
    if (student.initialInterest && student.plans.length)
      student.initialInterest = {
        ...student.initialInterest,
        careerId:
          index % 3 === 0
            ? student.plans[0].careerId
            : index % 3 === 1
              ? student.plans.at(-1)!.careerId
              : profileCatalog.careers[(index + 3) % profileCatalog.careers.length].id,
      }
    if (student.favorites.careers.length)
      student.favorites = {
        careers: [0, 1].map(
          (offset) => profileCatalog.careers[(index + offset) % profileCatalog.careers.length].id,
        ),
        occupations: [0, 1].map(
          (offset) => profileCatalog.occupations[(index + offset) % profileCatalog.occupations.length].id,
        ),
        institutions: [profileCatalog.institutions[index % profileCatalog.institutions.length].id],
      }
    student.questionnaires = student.questionnaires.map((application) =>
      application.result?.kind === 'interests'
        ? {
            ...application,
            result: {
              ...application.result,
              matches: [0, 1, 2, 3, 4, 5].map((offset) => ({
                occupationId:
                  profileCatalog.occupations[(index + offset) % profileCatalog.occupations.length].id,
                fit: offset < 2 ? 'very-high' : offset < 4 ? 'high' : 'good',
              })),
            },
          }
        : application,
    )
  }
  return {
    ...student,
    signals: student.signals.map((day, dayIndex) => ({
      ...day,
      diaryEntriesByType: {
        guided: dayIndex % 3 === 0 ? day.diaryEntries : 0,
        dailyPrompt: dayIndex % 3 === 1 ? day.diaryEntries : 0,
        free: dayIndex % 3 === 2 ? day.diaryEntries : 0,
      },
    })),
  }
})
