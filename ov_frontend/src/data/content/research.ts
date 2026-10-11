import { classroomAliases } from '@/data/content/adventure'

// Metadatos conservados de StudentResourceBoard; niveles y reacciones recibidas son demostraciones.
// DATO DE PRUEBA: Comentarios de entrevistas; los reemplazará la integración de investigaciones.
export const interviewDetails: Record<
  string,
  {
    career: string
    path: string
    professional: string
    duration: string
    summary: string
    comments: { author: string; reaction: string; text?: string }[]
  }
> = {
  'demo-environmental-engineering': {
    career: 'Ingeniería Ambiental',
    path: 'Universitaria',
    professional: 'María R.',
    duration: '8 min',
    summary: 'Conversamos sobre el monitoreo de ríos, el análisis de datos y el trabajo con comunidades.',
    comments: [
      {
        author: 'Nova',
        reaction: 'Me enseñó algo que no sabía',
        text: 'No imaginaba que se pudiera trabajar tanto fuera de la oficina.',
      },
      { author: 'Cedro', reaction: 'Muy completa' },
    ],
  },
  'demo-industrial-design': {
    career: 'Diseño Industrial',
    path: 'Universitaria',
    professional: 'Lucía P.',
    duration: '7 min',
    summary: 'Una mirada al proceso de diseñar productos: observar, prototipar, probar y mejorar.',
    comments: [
      {
        author: 'Brisa',
        reaction: 'Me dieron ganas de investigar más',
        text: 'Quiero saber qué programas y materiales usan.',
      },
      { author: 'Quilla', reaction: 'Muy completa' },
    ],
  },
  'demo-culinary-arts': {
    career: 'Artes Culinarias',
    path: 'Técnica',
    professional: 'Carla M.',
    duration: '6 min',
    summary: 'Una chef comparte cómo combina técnica, creatividad y coordinación para crear experiencias.',
    comments: [
      {
        author: 'Río',
        reaction: 'Me enseñó algo que no sabía',
        text: 'Me sorprendió todo lo que se planifica antes de cocinar.',
      },
    ],
  },
  'demo-electrical-tech': {
    career: 'Electricidad Industrial',
    path: 'Técnica',
    professional: 'Jorge A.',
    duration: '9 min',
    summary: 'Conocimos el trabajo de diagnóstico, instalación y seguridad en distintos espacios.',
    comments: [
      {
        author: 'Nova',
        reaction: 'Me dieron ganas de investigar más',
        text: 'Me gustaría conocer las especialidades que existen.',
      },
      { author: 'Cedro', reaction: 'Muy completa' },
    ],
  },
  'legend-community-health': {
    career: 'Enfermería',
    path: 'Universitaria',
    professional: 'Elena C.',
    duration: '8 min',
    summary: 'Una conversación sobre cuidado, prevención y trabajo cercano con las familias.',
    comments: [
      {
        author: 'Luna',
        reaction: 'Me enseñó algo que no sabía',
        text: 'No sabía cuánto trabajo preventivo se hace fuera del hospital.',
      },
      { author: 'Tilo', reaction: 'Muy completa' },
    ],
  },
  'legend-animation': {
    career: 'Animación Digital',
    path: 'Técnica',
    professional: 'Diego S.',
    duration: '7 min',
    summary: 'Un recorrido por la creación de personajes, la narrativa y el trabajo colaborativo.',
    comments: [
      {
        author: 'Mar',
        reaction: 'Me dieron ganas de investigar más',
        text: 'Quiero conocer cómo se construye un portafolio.',
      },
    ],
  },
}
export const LEGEND_REACTIONS_REQUIRED = 10
export const suggestedQuestions = [
  '¿Cómo es un día normal en tu trabajo?',
  '¿Qué estudiaste para llegar a donde estás?',
  '¿Qué consejo le darías a alguien de mi edad?',
]
export const legendIds = new Set(['demo-industrial-design', 'legend-community-health', 'legend-animation'])
export const demoOccupationByVideo: Record<string, string> = {
  'demo-environmental-engineering': 'agricultural-engineer',
  'demo-industrial-design': 'graphic-designer',
  'demo-culinary-arts': 'cook',
  'demo-electrical-tech': 'electrician',
  'legend-community-health': 'paramedic',
  'legend-animation': 'illustrator',
}
// DATO DE PRUEBA: Aliados de ejemplo; los reemplazará el servidor.
export function getAllies(occupationId: string) {
  const start = [...occupationId].reduce((sum, c) => sum + c.charCodeAt(0), 0) % classroomAliases.length
  return [classroomAliases[start], classroomAliases[(start + 1) % classroomAliases.length]]
}
// DATO DE PRUEBA: Nivel de investigación ficticio; lo reemplazará el servidor.
export function demoLevel(alias: string) {
  return {
    number: (alias.length % 3) + 1,
    label: ['Observador del horizonte', 'Recolector de pistas', 'Cartógrafo de posibilidades'][
      alias.length % 3
    ],
  }
}
// DATO DE PRUEBA: Reacciones de ejemplo; las reemplazará el servidor.
export function receivedReactions(videoId: string) {
  const comments = interviewDetails[videoId]?.comments ?? []
  return {
    learned: comments.filter((c) => c.text).length,
    liked: comments.length,
    texts: comments.filter((c) => c.text).slice(0, 3),
  }
}
