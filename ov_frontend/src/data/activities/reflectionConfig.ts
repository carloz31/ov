import type { Actividad, NodoConsigna, NodoDialogo } from '@/types/activities'
import type { Criterion, ItemRef, Scenario } from '@/types/reflection'

// The map order, rather than ACT numbers, determines chronology and prerequisites.
export const baseRoute = [
  ['welcome', 'mission-welcome'],
  ['beliefs', 'enc-mitos'],
  ['pregones', 'act-07'],
  ['story', 'mission-story'],
  ['future', 'mission-future'],
  ['compass', 'mission-compass'],
  ['plan', 'act-06'],
  ['expectations', 'mission-expectations'],
  ['next-step', 'mission-next-step'],
] as const
export const pendingContent = new Set(['mission-expectations', 'mission-next-step'])
// Fixed presentation outcomes; no inference from response length or keywords.
export const presentationScenarios: Record<string, Scenario> = {
  'act-07/r07-frase': { evaluaciones: ['ADECUADA'], generacion: 'VALIDA' },
  'act-07/r07-revision': { evaluaciones: ['ADECUADA'], generacion: 'VALIDA' },
  'act-07/r07-postura': { evaluaciones: ['ADECUADA'], generacion: 'VALIDA' },
}
export const reflectionCopy = {
  intro: 'Lo que escribas ahora te servirá más adelante en tu camino.',
  loading: 'Lumi está preparando tu pregunta…',
  useNotice: 'Esta pregunta puede influir más adelante en tu camino.',
  memory: (title: string) => `Lumi recuerda lo que escribiste en «${title}»`,
  fullResponse: 'Ver tu respuesta completa',
  missing: (title: string, phrases: string) =>
    `En «${title}» no me contaste mucho sobre ${phrases}, así que esta vez te pregunto de forma general.`,
  firstAdditional: (title: string) =>
    `Algunos senderos solo aparecen cuando te detienes a pensar. Lo que escribiste en «${title}» abrió una misión nueva.`,
  nextAdditional: (title: string) => `Se abrió otra misión desde «${title}».`,
}
const criterion = (id: string, descripcion: string, fraseAviso?: string): Criterion => ({
  id,
  descripcion,
  fraseAviso,
  seguimiento: `¿Podrías contarme más sobre ${fraseAviso ?? descripcion.toLowerCase()}?`,
})
const ref = (actividadId: string, nodoId: string): ItemRef => ({ actividadId, nodoId })
const phrase = ref('act-07', 'r07-frase')
const achievements = ref('mission-story', 'story-logros')
const aspiration = ref('mission-future', 'future-aspiracion')
export const criteria: Record<string, Criterion[]> = {
  'act-07/r07-frase': [
    criterion('frase', 'Una frase escuchada', 'qué frase has escuchado'),
    criterion('persona', 'Quién la dice', 'quién la dice'),
  ],
  'act-07/r07-revision': [
    criterion('experiencia', 'La experiencia de quien la dice'),
    criterion('evidencia', 'Evidencia a favor y en contra'),
    criterion('aplicacion', 'La aplicación a tu caso y al momento actual'),
  ],
  'act-07/r07-postura': [
    criterion('postura', 'Tu postura y su razón'),
    criterion('influencia', 'Su influencia en las opciones que consideras'),
  ],
  'mission-story/story-personas': [
    criterion('persona', 'Una persona concreta'),
    criterion('influencia', 'Cómo ha influido en ti'),
  ],
  'mission-story/story-logros': [
    criterion('logro', 'Un logro concreto', 'qué logro te enorgullece'),
    criterion('orgullo', 'Por qué te enorgullece', 'por qué te enorgullece'),
  ],
  'mission-story/mission-story-entry': [
    criterion('experiencia', 'Una experiencia concreta'),
    criterion('aprendizaje', 'Qué aprendiste sobre ti'),
  ],
  'mission-future/future-aspiracion': [
    criterion('aspiracion', 'Una aspiración concreta', 'qué te gustaría que pasara'),
    criterion('importancia', 'Por qué te importa', 'por qué te importa'),
  ],
  'mission-future/future-emociones': [
    criterion('emocion', 'Una emoción identificada'),
    criterion('motivo', 'Qué te hace sentir así'),
  ],
  'mission-future/future-entorno': [
    criterion('expectativas', 'Lo que tu entorno espera'),
    criterion('comparacion', 'En qué coincide o difiere de lo que tú esperas'),
  ],
  'extra-ecos/ecos-origen': [
    criterion('procedencia', 'De dónde viene la frase'),
    criterion('experiencia', 'Si quien la dice lo vivió o lo escuchó'),
  ],
  'extra-ecos/ecos-respuesta': [
    criterion('respuesta', 'Qué le dirías'),
    criterion('conexion', 'La conexión con lo que aprendiste'),
  ],
  'extra-objeto/objeto-recuerdo': [
    criterion('recuerdo', 'Un objeto, foto o recuerdo de un logro'),
    criterion('significado', 'Qué dice de ti'),
    criterion('acciones', 'Qué hiciste para lograrlo'),
  ],
  'extra-dudas/dudas-reflexion': [
    criterion('historia', 'Una parte de las historias'),
    criterion('conexion', 'Cómo se relaciona con lo que sientes hoy'),
  ],
}
export const personalizations: Record<
  string,
  { codigo: string; itemsOrigen: ItemRef[]; instruccion: string; plantillaSimulada: string }
> = {
  'mission-story/story-personas': {
    codigo: 'P1',
    itemsOrigen: [phrase],
    instruccion: 'Pregunta si la persona que dijo esa frase también ha influido en quién es hoy y cómo.',
    plantillaSimulada:
      'Al escribir «{cita}», ¿la persona que dijo esa frase también ha influido en quién eres hoy y de qué manera?',
  },
  'mission-future/future-entorno': {
    codigo: 'P2',
    itemsOrigen: [phrase],
    instruccion:
      'Pregunta si esa frase refleja lo que su entorno espera de él y si coincide con lo que él quiere.',
    plantillaSimulada:
      'Al escribir «{cita}», ¿esa frase refleja lo que tu entorno espera de ti y coincide con lo que tú quieres?',
  },
  'act-06/g-anio1-meta': {
    codigo: 'P3',
    itemsOrigen: [aspiration],
    instruccion: 'Pregunta dónde se ve al año para empezar a acercarse a esa aspiración.',
    plantillaSimulada:
      'Escribiste «{cita}». ¿Dónde te ves al año de terminar el colegio para empezar a acercarte a esa aspiración?',
  },
  'act-06/g-anio1-cuento': {
    codigo: 'P4',
    itemsOrigen: [achievements],
    instruccion: 'Pregunta si ese logro le dejó algo que hoy lo acerque a su meta.',
    plantillaSimulada:
      'En tu logro contaste «{cita}». ¿Qué te dejó esa experiencia que hoy te acerque a tus metas?',
  },
  'act-06/g-anio1-obstaculos': {
    codigo: 'P5',
    itemsOrigen: [phrase],
    instruccion: 'Pregunta si esa frase podría convertirse en un obstáculo y cómo lo enfrentaría.',
    plantillaSimulada:
      'Escribiste «{cita}». ¿Crees que esa idea podría ser un obstáculo para ti y cómo lo enfrentarías?',
  },
}
const textNode = (id: string, premisa: string, ayuda: string): NodoConsigna => ({
  id,
  tipo: 'consigna',
  hablanteId: 'companero',
  premisa,
  ayuda,
  placeholder: 'Escribe aquí…',
  entregable: { tipo: 'texto', minCaracteres: 30, maxCaracteres: 800 },
  obligatoria: true,
  visibilidad: 'estudiante_orientadora',
})
const dialogue = (id: string, hablanteId: string, texto: string): NodoDialogo => ({
  id,
  tipo: 'dialogo',
  hablanteId,
  texto,
})
export const pilotNodes = {
  personas: textNode(
    'story-personas',
    '¿Quiénes han influido en quién eres hoy y de qué manera?',
    'Piensa en una persona y en algo concreto que hayas aprendido o vivido con ella.',
  ),
  logros: textNode(
    'story-logros',
    '¿Qué logro te enorgullece? ¿Por qué te enorgullece?',
    'Puede ser algo cotidiano: cuenta qué hiciste y qué significó para ti.',
  ),
  aspiracion: textNode(
    'future-aspiracion',
    '¿Qué te gustaría que ocurriera en tu vida en los próximos años? ¿Por qué te importa?',
    'No necesitas certezas. Describe una posibilidad que tenga sentido para ti.',
  ),
  emociones: textNode(
    'future-emociones',
    '¿Qué emociones te provoca pensar en tu futuro? ¿Qué te hace sentir así?',
    'Puedes sentir varias cosas a la vez. Cuenta qué situación se relaciona con ellas.',
  ),
  entorno: textNode(
    'future-entorno',
    '¿Qué esperan de ti tu familia y tus amigos? ¿Coincide con lo que tú esperas?',
    'Puedes encontrar coincidencias o diferencias. Explica cómo lo ves hoy.',
  ),
}
// Provisional editorial content: editable here without changing any player component.
export const additionalMissions = [
  {
    id: 'extra-ecos',
    titulo: 'Ecos de la plaza',
    descripcion: 'Mira de dónde viene una frase y encuentra tus propias palabras para responder.',
    actividadOrigen: 'act-07',
    puntoOrigen: 'pregones',
    posicionMapa: { x: 640, y: 100 },
    tematica: 'creencias',
    reglas: [phrase, ref('act-07', 'r07-postura')],
    insignia: { codigo: 'I11' as const, nombre: 'Eco desarmado' },
    nodos: [
      textNode(
        'ecos-origen',
        '¿De dónde crees que viene esa frase? ¿La persona que la dice lo vivió o lo escuchó de alguien más?',
        'Puedes distinguir lo que sabes de lo que todavía te preguntas.',
      ),
      textNode(
        'ecos-respuesta',
        'Si pudieras responderle con lo que aprendiste, ¿qué le dirías?',
        'Explica con tus propias palabras lo que quisieras compartir.',
      ),
    ],
  },
  {
    id: 'extra-objeto',
    titulo: 'El objeto que guardo',
    descripcion: 'Encuentra un recuerdo que cuente algo de lo que has logrado.',
    actividadOrigen: 'mission-story',
    puntoOrigen: 'story',
    posicionMapa: { x: 790, y: 300 },
    tematica: 'historia',
    reglas: [achievements, ref('mission-story', 'story-personas')],
    insignia: { codigo: 'I12' as const, nombre: 'Guardián de recuerdos' },
    nodos: [
      textNode(
        'objeto-recuerdo',
        'Elige un objeto, una foto o un recuerdo que represente algo que lograste. ¿Qué dice de ti y qué tuviste que hacer para lograrlo?',
        'No necesitas subir una imagen: basta con describir ese recuerdo.',
      ),
    ],
  },
  {
    id: 'extra-dudas',
    titulo: 'Los que también dudaron',
    descripcion: 'Escucha dos historias sobre la duda y mira qué se parece a lo que sientes.',
    actividadOrigen: 'mission-future',
    puntoOrigen: 'future',
    posicionMapa: { x: 570, y: 420 },
    tematica: 'futuro',
    reglas: [ref('mission-future', 'future-emociones'), ref('mission-future', 'future-entorno')],
    insignia: { codigo: 'I13' as const, nombre: 'Duda compartida' },
    nodos: [
      dialogue(
        'dudas-a1',
        'aurelio',
        'Al principio imaginaba que tendría un solo oficio para toda la vida. Cuando mis planes cambiaron, pensé que había perdido el rumbo.',
      ),
      dialogue(
        'dudas-a2',
        'aurelio',
        'Probé otra tarea en la plaza y descubrí que algo de lo que había aprendido también me servía allí. No tuve que empezar sin nada.',
      ),
      dialogue(
        'dudas-a3',
        'aurelio',
        'Todavía hay cosas que no sé. Mi historia siguió cambiando mientras yo encontraba nuevas preguntas.',
      ),
      dialogue(
        'dudas-m1',
        'mara',
        'Cuando pensaba en mi futuro, sentía curiosidad y miedo al mismo tiempo. Me costaba explicarlo porque creía que debía estar segura.',
      ),
      dialogue(
        'dudas-m2',
        'mara',
        'Conversé con alguien que también había dudado. Escuchar su experiencia me ayudó a ponerle nombre a lo que sentía.',
      ),
      dialogue(
        'dudas-m3',
        'mara',
        'No elegí todo de una vez. Una experiencia pequeña me permitió conocer algo nuevo y después pensar en el siguiente paso.',
      ),
      textNode(
        'dudas-reflexion',
        '¿Qué parte de estas historias se parece a lo que sientes hoy?',
        'Puedes reconocer una emoción, una duda o una experiencia; explica la conexión.',
      ),
    ],
  },
]
export const additionalActivities: Actividad[] = additionalMissions.map((m, i) => ({
  id: m.id,
  tipo: 'registro',
  audiencia: 'estudiante',
  titulo: m.titulo,
  subtitulo: m.descripcion,
  bloque: 1,
  orden: 10 + i,
  obligatoria: false,
  requisitos: [],
  ubicacion: 'Un sendero del Camino',
  duracionEstimadaMin: i === 2 ? 6 : 4,
  personajeIds: i === 2 ? ['aurelio', 'mara', 'companero'] : ['companero'],
  plantilla: { tipo: 'secuencial' },
  nodos: [
    ...m.nodos,
    dialogue(
      `${m.id}-cierre`,
      'companero',
      'Esta nueva mirada viaja contigo. Cuando quieras, volvamos al camino.',
    ),
  ],
}))
export function configureStudentActivities(source: Actividad[]): Actividad[] {
  return [
    ...source.map((activity) => {
      const index = baseRoute.findIndex(([, id]) => id === activity.id)
      if (index < 0) return activity
      const next = { ...activity, orden: index + 1, requisitos: index ? [baseRoute[index - 1][1]] : [] }
      if (activity.id === 'act-06') delete next.siguienteSugerida
      if (activity.id === 'mission-story')
        next.nodos = activity.nodos.flatMap((n) =>
          n.id === 'mission-story-entry' ? [pilotNodes.personas, pilotNodes.logros, n] : [n],
        )
      if (activity.id === 'mission-future')
        next.nodos = activity.nodos.flatMap((n) =>
          n.id === 'mission-future-entry'
            ? [pilotNodes.aspiracion, pilotNodes.emociones, pilotNodes.entorno]
            : [n],
        )
      if (activity.id === 'mission-story') next.codigo = 'ACT-04'
      if (activity.id === 'mission-future') next.codigo = 'ACT-05'
      return next
    }),
    ...additionalActivities,
  ]
}
export function routeOrder(id: string) {
  return baseRoute.findIndex(([, activityId]) => activityId === id)
}
