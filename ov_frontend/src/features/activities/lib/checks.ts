import type { NodoPregunta } from '@/types/activities'

export function evaluateStudentCheck(node: NodoPregunta, selected: string[], previousAttempts: number) {
  const correctIds = node.opciones.filter((o) => o.correcta).map((o) => o.id)
  const wrongIds = selected.filter((id) => !correctIds.includes(id))
  const correct = selected.length === correctIds.length && correctIds.every((id) => selected.includes(id))
  const final = correct || previousAttempts >= 1 || node.opciones.length === 2
  const multiple = node.formato === 'opcion_multiple'
  const title = final
    ? correct
      ? '¡Bien visto!'
      : multiple
        ? 'Estas eran las respuestas clave.'
        : `La respuesta clave era «${node.opciones.find((o) => o.correcta)?.texto}».`
    : multiple && selected.some((id) => correctIds.includes(id))
      ? wrongIds.length
        ? 'Vas por buen camino. Algunas frases no corresponden.'
        : 'Vas por buen camino, pero falta al menos una frase.'
      : 'Casi. Piénsalo una vez más.'
  const explanation = final
    ? node.explicacion
    : multiple
      ? wrongIds.length
        ? 'Las que no corresponden quedaron en naranja con su explicación. Revisa si falta alguna.'
        : 'Revisa tu selección una vez más.'
      : (node.opciones.find((o) => selected.includes(o.id))?.explicacion ??
        node.opciones.find((o) => selected.includes(o.id))?.retroalimentacion ??
        '')
  return { correct, final, wrongIds, title, explanation }
}
