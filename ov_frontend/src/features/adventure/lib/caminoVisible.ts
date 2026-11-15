import type { StudentMapPoint } from './mapPoints'

// Ajuste lumi-mensajes (§15, solo api): el camino aparece de a poco. Se ven las requeridas completadas, las
// disponibles o empezadas, una sola requerida bloqueada (la primera en el orden del servidor) y las opcionales
// como hasta ahora (aparecen al desbloquearse). Un punto agrupado de una secuencia cuenta como uno.
export function puntosVisiblesCamino(puntos: StudentMapPoint[]): StudentMapPoint[] {
  let bloqueadaVista = false
  return puntos.filter((p) => {
    if (p.opcional || p.status !== 'locked') return true
    if (bloqueadaVista) return false
    bloqueadaVista = true
    return true
  })
}

// Un `?punto=` que apunta a una misión del camino todavía oculta (p. ej. desde el libro de Helena) enfoca la
// única requerida bloqueada visible, cuyo detalle dice qué falta. Si el id no es del camino, no hay sustituto.
export function puntoSustitutoCamino(
  todos: StudentMapPoint[],
  visibles: StudentMapPoint[],
  id: string | undefined,
): StudentMapPoint | undefined {
  if (!id || visibles.some((p) => p.id === id) || !todos.some((p) => p.id === id)) return undefined
  return visibles.find((p) => !p.opcional && p.status === 'locked')
}
