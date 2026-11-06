// HU-096: textos del aviso de velocidad. Lumi avisa siempre; si ella misma conduce la misión (`companero`), habla de
// sus preguntas, y si no, de las del personaje que conduce.
const LUMI = 'companero'

export function textoAvisoVelocidad(numero: number, hablanteId: string, personaje: string) {
  if (hablanteId === LUMI)
    return numero === 1
      ? 'Parece que vas con algo de prisa. ¿Qué tal si nos tomamos un momento para pensar en mis preguntas? Quizá te ayuden a descubrir algo nuevo sobre ti.'
      : 'Ya llevas buen camino. Si seguimos con calma, lo que descubras será más tuyo. Y si en algún momento necesitas un respiro, aquí estaré.'
  return numero === 1
    ? `Parece que vas con algo de prisa. ¿Qué tal si nos tomamos un momento para pensar en las preguntas de ${personaje}? Quizá te ayuden a descubrir algo nuevo sobre ti.`
    : `Ya llevas buen camino con ${personaje}. Si seguimos con calma, lo que descubras será más tuyo. Y si en algún momento necesitas un respiro, ${personaje} te esperará.`
}
