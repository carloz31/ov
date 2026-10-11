import type { JournalEntry, ReadinessCheckIn } from '@/types/adventure'

// DATO DE PRUEBA: Entradas de diario ficticias; las reemplazarán entradas del estudiante.
const journalDemoEntries: JournalEntry[] = [
  {
    id: 'demo-journal-family',
    title: 'Lo que espero de este camino',
    body: 'Me gustaría poder hablar de mis dudas sin sentir que ya debería tener una respuesta. También quiero descubrir opciones que todavía no conozco.',
    kind: 'prompted',
    createdAt: '2026-09-18T09:30:00.000Z',
    linkedActivityId: 'expectations',
    promptShown: '¿Cómo llegas a este momento de tu proceso vocacional?',
    topicTags: ['dudas', 'familia'],
    missionId: 'expectations',
  },
  {
    id: 'demo-journal-discovery',
    title: 'Una idea que no esperaba',
    body: 'Hoy entendí que una carrera puede combinar cosas que antes veía separadas. Me interesa seguir mirando opciones que mezclen creatividad y tecnología.',
    kind: 'prompted',
    createdAt: '2026-09-10T16:15:00.000Z',
    linkedActivityId: 'compass',
    promptShown: '¿Qué de este resultado te sorprendió o no encaja con lo que pensabas de ti?',
    topicTags: ['descubrimientos', 'intereses'],
    missionId: 'compass',
  },
  {
    id: 'demo-journal-open',
    title: 'Entrada libre',
    body: 'Hoy no tengo mucho que ordenar. Solo quiero recordar que puedo avanzar con una pregunta a la vez.',
    kind: 'open',
    createdAt: '2026-09-03T20:00:00.000Z',
    topicTags: ['calma'],
  },
  {
    id: 'demo-journal-first-doubts',
    title: 'Primeras dudas',
    body: 'Me cuesta separar lo que realmente me interesa de lo que otras personas esperan de mí. Quiero darme permiso para investigar antes de responder.',
    kind: 'prompted',
    createdAt: '2026-07-14T15:20:00.000Z',
    linkedActivityId: 'story',
    promptShown: '¿Hay algo que sientes que se espera de ti, pero que no estás seguro de querer?',
    topicTags: ['expectativas', 'dudas'],
    missionId: 'story',
  },
  {
    id: 'demo-journal-new-option',
    title: 'Una opción nueva',
    body: 'Escuché sobre diseño de servicios y me sorprendió que combine investigación, creatividad y trabajo con personas. No sabía que existía esa posibilidad.',
    kind: 'prompted',
    createdAt: '2026-08-02T18:10:00.000Z',
    linkedActivityId: 'future',
    promptShown: 'De lo que exploraste hoy, ¿qué es lo que menos esperabas encontrar?',
    topicTags: ['carreras', 'descubrimientos'],
    missionId: 'future',
  },
  {
    id: 'demo-journal-conversation',
    title: 'Después de conversar',
    body: 'La conversación fue más tranquila de lo que imaginaba. Pudimos hablar de alternativas sin decidir nada todavía y eso me dio un poco más de confianza.',
    kind: 'prompted',
    createdAt: '2026-08-19T19:40:00.000Z',
    linkedActivityId: 'family-support',
    promptShown: '¿Qué cambió después de poner tus dudas en palabras?',
    topicTags: ['familia', 'confianza'],
  },
  {
    id: 'demo-journal-daily-question',
    title: 'Tema del día',
    body: 'Hoy me quedé pensando en si prefiero un trabajo con proyectos muy distintos o uno donde pueda especializarme con más profundidad.',
    kind: 'prompted',
    createdAt: '2026-09-07T17:25:00.000Z',
    linkedActivityId: 'daily-prompt-2026-09-07',
    promptShown: '¿Qué conversación, actividad o momento de hoy te dejó una pregunta?',
    topicTags: ['día a día', 'preguntas', 'trabajo'],
    lockedTopicTags: ['día a día', 'preguntas'],
  },
  {
    id: 'demo-journal-pressure',
    title: 'Lo que necesito esta semana',
    body: 'Esta semana sentí más presión porque varias personas preguntaron qué voy a estudiar. Me ayudaría volver a mis opciones y anotar qué información me falta.',
    kind: 'prompted',
    createdAt: '2026-09-14T21:00:00.000Z',
    linkedActivityId: 'plan',
    promptShown: '¿Qué es lo que más te preocupa en este momento? No hace falta que tenga solución todavía.',
    topicTags: ['presión', 'próximos pasos'],
    missionId: 'plan',
  },
  {
    id: 'demo-journal-small-step',
    title: 'Un paso pequeño',
    body: 'Todavía tengo dudas, pero decidí preparar tres preguntas para la feria. Tener un paso concreto hace que todo se sienta un poco más manejable.',
    kind: 'prompted',
    createdAt: '2026-09-17T18:30:00.000Z',
    linkedActivityId: 'expectations',
    promptShown: '¿Qué pequeño paso podría ayudarte a sentir más claridad?',
    topicTags: ['dudas', 'próximos pasos'],
    missionId: 'expectations',
  },
]

// DATO DE PRUEBA: Check-ins de ejemplo; los reemplazarán registros del estudiante.
const readinessDemoCheckIns: ReadinessCheckIn[] = [
  { id: 'demo-check-jul-14', createdAt: '2026-07-14T13:00:00.000Z', linkedActivityId: 'story', value: 4 },
  {
    id: 'demo-check-jul-22',
    createdAt: '2026-07-22T13:00:00.000Z',
    linkedActivityId: 'daily-check-in',
    value: 5,
  },
  { id: 'demo-check-aug-02', createdAt: '2026-08-02T13:00:00.000Z', linkedActivityId: 'future', value: 7 },
  {
    id: 'demo-check-aug-10',
    createdAt: '2026-08-10T13:00:00.000Z',
    linkedActivityId: 'daily-check-in',
    value: 6,
  },
  {
    id: 'demo-check-aug-19',
    createdAt: '2026-08-19T13:00:00.000Z',
    linkedActivityId: 'family-support',
    value: 8,
  },
  {
    id: 'demo-check-aug-27',
    createdAt: '2026-08-27T13:00:00.000Z',
    linkedActivityId: 'daily-check-in',
    value: 5,
  },
  { id: 'demo-check-1', createdAt: '2026-09-03T13:00:00.000Z', linkedActivityId: 'welcome', value: 7 },
  { id: 'demo-check-2', createdAt: '2026-09-07T13:00:00.000Z', linkedActivityId: 'story', value: 8 },
  { id: 'demo-check-3', createdAt: '2026-09-10T13:00:00.000Z', linkedActivityId: 'compass', value: 6 },
  { id: 'demo-check-4', createdAt: '2026-09-14T13:00:00.000Z', linkedActivityId: 'plan', value: 4 },
  { id: 'demo-check-5', createdAt: '2026-09-17T13:00:00.000Z', linkedActivityId: 'expectations', value: 3 },
]

const dailyJournalPrompts = [
  {
    prompt: '¿Qué idea sobre tu futuro te acompañó más durante el día de hoy?',
    tags: ['día a día', 'futuro'],
  },
  {
    prompt: '¿Qué conversación, actividad o momento de hoy te dejó una pregunta?',
    tags: ['día a día', 'preguntas'],
  },
  {
    prompt: '¿Hubo algo hoy que te hizo sentir más cerca o más lejos de una decisión?',
    tags: ['día a día', 'decisiones'],
  },
  {
    prompt: '¿Qué descubriste hoy sobre la manera en que quieres construir tu camino?',
    tags: ['día a día', 'descubrimientos'],
  },
] as const

const promptVariants = {
  integration: [
    '¿Qué de este resultado te sorprendió, o no encaja con lo que pensabas de ti?',
    'Si tuvieras que explicarle este resultado a alguien que te conoce bien, ¿qué le dirías?',
    '¿Hay algo aquí que ya sospechabas de ti mismo, y algo que no?',
  ],
  support: [
    '¿Qué es lo que más te preocupa en este momento? No hace falta que tenga solución todavía.',
    '¿Hay algo que sientes que se espera de ti, pero que no estás seguro de querer?',
    'Si nadie más fuera a leer esto nunca, ¿qué escribirías sobre cómo te sientes hoy?',
  ],
  exploration: [
    'De lo que exploraste hoy, ¿qué es lo que menos esperabas encontrar?',
    '¿Sigues pensando en la misma opción de siempre, o algo de hoy te hizo dudar un poco?',
  ],
} as const

function getActivityPrompt(activityId: string, recentCheckIns: ReadinessCheckIn[]) {
  const latest = [...recentCheckIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const mode =
    latest && latest.value < 5 ? 'support' : activityId === 'compass' ? 'integration' : 'exploration'
  const choices = promptVariants[mode]
  const seed = [...activityId].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return choices[seed % choices.length]
}

function getDailyJournalPrompt(date = new Date()) {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const seed = [...dateKey].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const selected = dailyJournalPrompts[seed % dailyJournalPrompts.length]
  return { prompt: selected.prompt, tags: [...selected.tags] }
}

export {
  dailyJournalPrompts,
  getActivityPrompt,
  getDailyJournalPrompt,
  journalDemoEntries,
  promptVariants,
  readinessDemoCheckIns,
}
