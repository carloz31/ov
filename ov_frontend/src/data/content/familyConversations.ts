import type {
  AdventureState,
  FamilyConversation,
} from '@/types/adventure'

type ConversationAudience = 'student' | 'parent'

type FamilyConversationTopic = {
  id: string
  title: string
  block: string
  symbol: string
  prompts: Record<ConversationAudience, string>
  bridge: string
  guideQuestions: string[]
  toneTip: string
}

const familyConversationTopics: FamilyConversationTopic[] = [
  {
    id: 'work-trends',
    title: 'Tendencias laborales de antes y ahora',
    block: 'Bloque 3 · Explorar el mundo laboral',
    symbol: '🧭',
    prompts: {
      student: '¿Qué carreras sientes que están en tendencia ahora? ¿Qué te llama la atención de ellas?',
      parent: '¿Qué carreras estaban en tendencia cuando tú eras joven? ¿Te gustaban?',
    },
    bridge:
      'El mercado laboral cambia entre generaciones. Poner ambas miradas sobre la mesa ayuda a conversar desde la curiosidad, sin dar por hecho que el mundo sigue siendo igual.',
    guideQuestions: [
      '¿Qué cambios encuentran entre ambas épocas?',
      '¿Qué intereses personales aparecen detrás de cada respuesta?',
      '¿Qué información les gustaría investigar juntos?',
    ],
    toneTip: 'Ya saben que escuchar primero ayuda a convertir las preocupaciones en preguntas abiertas.',
  },
  {
    id: 'strengths',
    title: 'Nuestras fortalezas, vistas desde afuera',
    block: 'Bloque 4 · Reconocer fortalezas',
    symbol: '✨',
    prompts: {
      student: '¿Qué fortaleza reconoces en tu familia cuando te acompaña a tomar decisiones?',
      parent: '¿Qué fortaleza ves con más claridad en tu hijo o hija cuando enfrenta algo nuevo?',
    },
    bridge:
      'A veces otras personas reconocen capacidades que uno todavía no logra nombrar. Compartirlas puede ampliar la manera en que cada quien se mira.',
    guideQuestions: [
      '¿En qué situación concreta han visto esa fortaleza?',
      '¿Cómo podría ayudar durante la exploración vocacional?',
      '¿Hay alguna fortaleza que quieran seguir desarrollando?',
    ],
    toneTip:
      'Pueden hablar desde ejemplos concretos, con la misma calidez con la que ya han practicado acompañarse.',
  },
  {
    id: 'support',
    title: 'Cómo nos gustaría acompañarnos en esta etapa',
    block: 'Bloque 5 · Construir un camino propio',
    symbol: '🤝',
    prompts: {
      student: '¿Qué papel te gustaría que tuviera tu familia mientras exploras y tomas tu decisión?',
      parent: '¿Cómo te gustaría acompañar sin reemplazar la decisión de tu hijo o hija?',
    },
    bridge:
      'Hacer explícitas las expectativas permite construir una forma de acompañamiento que cuide tanto la autonomía como el vínculo familiar.',
    guideQuestions: [
      '¿Qué tipo de apoyo sería útil en este momento?',
      '¿Qué decisiones necesita tomar directamente el estudiante?',
      '¿Cómo pueden avisarse cuando una conversación se sienta difícil?',
      '¿Qué pequeño acuerdo quieren probar a partir de hoy?',
    ],
    toneTip:
      'Recuerden lo que ya han trabajado: acompañar también puede ser preguntar, escuchar y dar tiempo.',
  },
  {
    id: 'uncertainty',
    title: 'Lo que nos preocupa y lo que nos da confianza',
    block: 'Bloque 5 · Hablar de la incertidumbre',
    symbol: '🌤️',
    prompts: {
      student: '¿Qué incertidumbre sobre tu futuro te gustaría poder conversar con calma?',
      parent:
        '¿Qué preocupación sobre el futuro de tu hijo o hija quisieras transformar en una conversación?',
    },
    bridge:
      'Las preocupaciones pueden venir del cariño, de la falta de información o del miedo a equivocarse. Nombrarlas ayuda a decidir qué necesitan conversar y qué pueden investigar.',
    guideQuestions: [
      '¿Qué parte de esta preocupación pueden comprender mejor juntos?',
      '¿Qué necesitaría cada uno para sentirse escuchado?',
      '¿Qué dato o experiencia podría darles más claridad?',
    ],
    toneTip:
      'Ya saben que una inquietud puede expresarse sin convertirla en presión ni en una decisión anticipada.',
  },
  {
    id: 'shared-future',
    title: 'Una imagen compartida del futuro',
    block: 'Cierre · Mirar el camino recorrido',
    symbol: '🌱',
    prompts: {
      student: '¿Qué te gustaría que recordemos de esta etapa dentro de algunos años?',
      parent: '¿Qué te gustaría que recordemos de esta etapa dentro de algunos años?',
    },
    bridge:
      'Aunque cada persona vive el proceso desde un lugar distinto, también pueden construir recuerdos y acuerdos que los acompañen más adelante.',
    guideQuestions: [
      '¿Qué momento de este proceso quisieran conservar?',
      '¿Qué aprendieron sobre la forma en que se acompañan?',
      '¿Qué conversación les gustaría volver a tener más adelante?',
    ],
    toneTip:
      'Pueden cerrar reconociendo el camino recorrido, sin exigir que todas las respuestas estén resueltas.',
  },
]

// DATO DE PRUEBA: Conversaciones familiares ficticias; las reemplazarán respuestas de la familia.
const familyConversationDemoData: FamilyConversation[] = [
  {
    id: 'strengths',
    student:
      'Valoro que en mi familia saben mantener la calma y hacer preguntas cuando yo todavía no tengo claro qué quiero.',
    studentAnsweredAt: '2026-09-15T18:20:00.000Z',
  },
  {
    id: 'support',
    parent:
      'Quiero acompañarte escuchando primero, ayudándote a buscar información y respetando que la decisión final sea tuya.',
    parentAnsweredAt: '2026-09-16T01:10:00.000Z',
  },
  {
    id: 'uncertainty',
    student:
      'Me preocupa elegir algo y descubrir después que no era para mí. Me ayudaría sentir que cambiar de rumbo también es parte del proceso.',
    parent:
      'Me inquieta no conocer todas las opciones para poder apoyarte. Quisiera convertir esa preocupación en tiempo para investigar juntos.',
    studentAnsweredAt: '2026-09-16T20:35:00.000Z',
    parentAnsweredAt: '2026-09-17T00:15:00.000Z',
    studentMarkedAt: '2026-09-17T22:00:00.000Z',
    studentReflection: 'Me sentí escuchado cuando hablamos de que cambiar de opinión no es fracasar.',
  },
  {
    id: 'shared-future',
    student:
      'Me gustaría recordar que pude hablar de mis dudas sin tener que fingir que ya conocía todas las respuestas.',
    parent:
      'Me gustaría recordar que aprendimos a escucharnos y a investigar posibilidades sin apresurar una elección.',
    studentAnsweredAt: '2026-09-12T19:00:00.000Z',
    parentAnsweredAt: '2026-09-12T22:30:00.000Z',
    studentMarkedAt: '2026-09-13T17:00:00.000Z',
    parentMarkedAt: '2026-09-13T21:00:00.000Z',
    studentReflection: 'Quiero conservar la confianza para volver a hablar cuando aparezcan nuevas dudas.',
    parentReflection: 'Quiero seguir haciendo preguntas antes de dar consejos.',
    completedAt: '2026-09-13T21:00:00.000Z',
  },
]

function getFamilyConversationTopic(id: string) {
  return familyConversationTopics.find((topic) => topic.id === id)
}

function getFamilyConversationDemo(id: string) {
  return familyConversationDemoData.find((conversation) => conversation.id === id)
}

function getFamilyGiftLetter(state: AdventureState, audience: ConversationAudience) {
  if (audience === 'student') {
    return 'Me comprometo a escucharte con curiosidad, acompañarte a investigar y darte el tiempo que necesites para construir tu propia decisión.'
  }
  const expectation = state.reflectionDrafts.expectations?.trim()
  return expectation
    ? `Cuando comenzaba este proceso escribí: “${expectation}”. Quería compartirlo contigo porque tu compañía también forma parte del camino que espero construir.`
    : 'Espero que podamos recorrer este proceso con confianza. Quiero compartir mis dudas y descubrimientos sabiendo que puedo contar contigo sin dejar de construir mi propio camino.'
}

export {
  familyConversationDemoData,
  familyConversationTopics,
  getFamilyGiftLetter,
  getFamilyConversationDemo,
  getFamilyConversationTopic,
}
export type { ConversationAudience, FamilyConversationTopic }
