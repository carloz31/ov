const phrases = {
  greeting: [
    'Su presencia también orienta.',
    'Acompañar empieza por escuchar.',
    'Su mirada puede abrir una conversación.',
    'También hay espacio para sus preguntas.',
    'Este recorrido se construye en familia.',
  ],
  activities: [
    'Cada paso le ayuda a reconocer su rol.',
    'Una pausa para reflexionar también es avanzar.',
    'Escuchar con curiosidad es una forma de acompañar.',
    'Puede continuar a su propio ritmo.',
    'Sus preguntas también tienen un lugar aquí.',
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
