const phrases = {
  greeting: [
    'Tu presencia también orienta.',
    'Acompañar empieza por escuchar.',
    'Tu mirada puede abrir una conversación.',
    'También hay espacio para tus preguntas.',
    'Este recorrido se construye en familia.',
  ],
  activities: [
    'Cada paso te ayuda a reconocer tu rol.',
    'Una pausa para reflexionar también es avanzar.',
    'Escuchar con curiosidad es una forma de acompañar.',
    'Puedes continuar a tu propio ritmo.',
    'Tus preguntas también tienen un lugar aquí.',
  ],
  conversations: [
    'Cada conversación les ayuda a pensar juntos su futuro.',
    'Una conversación puede empezar con una pregunta sencilla.',
    'Escuchar primero abre espacio para conocerse.',
    'No necesitan resolver todo en una sola conversación.',
    'Pueden darse tiempo para pensar juntos.',
  ],
} as const
export function parentMotivation(block: keyof typeof phrases, date = new Date()) {
  const day = date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const index = [...day].reduce((sum, character) => sum + character.charCodeAt(0), 0) % phrases[block].length
  return phrases[block][index]
}
