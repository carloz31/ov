import type { AchievementGroup } from '@/types/profile'
export type { AchievementIcon, Achievement, AchievementGroup } from '@/types/profile'
import { cityCases } from '@/data/content/adventure'
import type { AdventureState } from '@/types/adventure'
import { isCityUnlocked } from '@/store/adventureStore'

export function getAchievementPresentations(): AchievementGroup[] {
  return [
    {
      title: 'Descubrir mis propias pistas',
      description: 'Insignias que cuentan cómo empezaste a observarte y a reconocer lo que te mueve.',
      icon: 'compass',
      items: [
        {
          code: 'I1',
          title: 'La primera chispa',
          message: 'Te animaste a comenzar sin necesitar todas las respuestas.',
          description: 'Completa la introducción de tu viaje.',
          metaphor: 'Encender una lámpara no revela todo el camino, pero sí permite ver el siguiente paso.',
          vocationalMeaning:
            'Iniciar tu orientación significa darte permiso para explorar antes de elegir. La curiosidad también es una forma de avanzar.',
          icon: 'campfire',
          done: false,
        },
        {
          code: 'I2',
          title: 'Coleccionista de pistas',
          message: 'Reuniste señales sobre tus gustos, fortalezas y preguntas.',
          description: 'Completa tres Misiones de Campo.',
          metaphor: 'Cada pista parece pequeña hasta que varias dibujan la forma de un mapa.',
          vocationalMeaning:
            'Reconocer patrones entre lo que disfrutas y lo que haces bien te ayuda a imaginar opciones que se parecen más a ti.',
          icon: 'compass',
          done: false,
        },
        {
          code: 'I3',
          title: 'La llave de la ciudad',
          message: 'Tus descubrimientos abrieron la puerta a nuevos escenarios.',
          description: 'Completa todas las Misiones de Campo.',
          metaphor: 'Una llave no decide qué puerta cruzar; te da la libertad de abrirla y mirar dentro.',
          vocationalMeaning:
            'Ya reuniste una base de autoconocimiento con la que puedes explorar profesiones y situaciones reales con mejores preguntas.',
          icon: 'key',
          done: false,
        },
      ],
    },
    {
      title: 'Caminar con otros',
      description: 'Insignias por pedir nuevas miradas y convertir la conversación en parte de tu brújula.',
      icon: 'users',
      items: [
        {
          code: 'I4',
          title: 'Una invitación abre caminos',
          message: 'Invitaste a alguien a mirar el camino contigo.',
          description: 'Invita a un compañero a tu Crew.',
          metaphor: 'Una voz cercana puede señalar un paisaje que todavía no habías visto.',
          vocationalMeaning:
            'Compartir tus preguntas te permite descubrir cualidades que otras personas reconocen en ti y ampliar tus alternativas.',
          icon: 'send',
          done: false,
        },
        {
          code: 'I5',
          title: 'Nadie viaja solo',
          message: 'Formaste un equipo para acompañar la exploración.',
          description: 'Forma un Crew con un compañero que acepte tu invitación.',
          metaphor: 'Cuando dos brújulas se comparan, el rumbo se vuelve más fácil de conversar.',
          vocationalMeaning:
            'Tu Crew te acompaña, escucha tus ideas y te ayuda a contrastarlas. La decisión sigue siendo tuya, pero no tienes que construirla en soledad.',
          icon: 'people',
          done: false,
        },
        {
          code: 'I6',
          title: 'Una mesa para conversar',
          message: 'Convertiste una conversación familiar en una nueva pista.',
          description: 'Completen la primera conversación en familia.',
          metaphor: 'Algunas rutas aparecen cuando las historias familiares se sientan a la misma mesa.',
          vocationalMeaning:
            'Escuchar expectativas y experiencias de tu familia puede darte contexto, apoyo y preguntas nuevas sin reemplazar tu propia voz.',
          icon: 'message',
          done: false,
        },
      ],
    },
    {
      title: 'Probar posibilidades',
      description: 'Insignias por llevar tus ideas al mundo real, investigar y aprender de cada experiencia.',
      icon: 'key',
      items: [
        {
          code: 'I7',
          title: 'Aquí para ayudar',
          message: 'Usaste tus talentos para responder a un reto real.',
          description: 'Resuelve tu primer caso.',
          metaphor: 'Una habilidad se reconoce mejor cuando la pones al servicio de un desafío.',
          vocationalMeaning:
            'Resolver un caso te permite probar formas de pensar y trabajar antes de comprometerte con una carrera.',
          icon: 'shield',
          done: false,
        },
        {
          code: 'I8',
          title: 'Historias que inspiran',
          message: 'Investigaste una profesión y compartiste lo aprendido.',
          description: 'Publica una misión de investigación.',
          metaphor: 'Mirar por un telescopio acerca mundos que parecían demasiado lejanos.',
          vocationalMeaning:
            'Investigar personas y profesiones reales ayuda a reemplazar suposiciones por información concreta sobre cada opción.',
          icon: 'telescope',
          done: false,
        },
        {
          code: 'I9',
          title: 'Una ciudad que sonríe',
          message: 'Completaste todos los retos y construiste tu propia lectura de la ciudad.',
          description: 'Resuelve todos los llamados de la Central de casos.',
          metaphor:
            'Después de recorrer una ciudad, sus calles dejan de ser ajenas y comienzan a contar tu historia.',
          vocationalMeaning:
            'Comparaste distintos problemas, profesiones y maneras de aportar. Esa experiencia te permite decidir con más perspectiva.',
          icon: 'sparkles',
          done: false,
        },
      ],
    },
  ]
}

export function getAchievementGroups(state: AdventureState): AchievementGroup[] {
  const done: Record<string, boolean> = {
    I1: state.completedMissionIds.includes('welcome'),
    I2: state.completedMissionIds.filter((id) => id !== 'welcome').length >= 3,
    I3: isCityUnlocked(state),
    I4: state.crewInvitations.length > 0,
    I5: state.crewInvitations.some((item) => item.status === 'accepted'),
    I6: state.conversations.some((item) => item.completedAt),
    I7: state.solvedCaseIds.length > 0,
    I8: state.videos.length > 0,
    I9: cityCases.every((item) => state.solvedCaseIds.includes(item.id)),
  }
  return getAchievementPresentations().map((g) => ({
    ...g,
    items: g.items.map((b) => ({ ...b, done: done[b.code] })),
  }))
}
