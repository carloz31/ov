// Casos, colección y testimonios del servidor (F04). Aparte de adaptadores.ts por tamaño; solo importa tipos.
import type { CasoCuenta, OcupacionColeccion, TestimonioEstado } from '@/types/servidor'

// Ajustes Central (6): el puntaje es en puntos de satisfacción; el umbral y el máximo son propios del caso.
const textoPuntos = (puntaje: number, caso: Pick<CasoCuenta, 'puntaje_maximo'>) =>
  `${puntaje} de ${caso.puntaje_maximo}`
export const superaCaso = (puntaje: number, caso: Pick<CasoCuenta, 'puntaje_minimo'>) =>
  puntaje >= caso.puntaje_minimo
export const textoPuntajeCaso = (
  puntaje: number,
  caso: Pick<CasoCuenta, 'puntaje_minimo' | 'puntaje_maximo'>,
) => `Puntaje: ${textoPuntos(puntaje, caso)} · mínimo ${caso.puntaje_minimo}`
// El bloque del caso en el drawer; `mejor` falta si no hay intentos.
export type ProgresoCaso = {
  minimo: number
  maximo: number
  mejor?: number
  superado: boolean
  invitaReintento: boolean
}
export const progresoCaso = (caso: CasoCuenta): ProgresoCaso => ({
  minimo: caso.puntaje_minimo,
  maximo: caso.puntaje_maximo,
  ...(caso.intentos && caso.mejor_puntaje !== null ? { mejor: caso.mejor_puntaje } : {}),
  superado: caso.superado,
  invitaReintento: true,
})
// Mismos rótulos que el estado local de la Central de Casos.
export function estadoCaso(caso: CasoCuenta | undefined) {
  const passed = !!caso?.superado,
    intentado = !!caso?.intentos
  return {
    passed,
    badge: passed ? 'Superado' : intentado ? 'En progreso' : 'Disponible',
    actionLabel: passed ? 'Jugar de nuevo' : intentado ? 'Intentar de nuevo' : 'Iniciar',
    intentos:
      caso && caso.intentos
        ? `Intentos: ${caso.intentos} · Mejor puntaje: ${textoPuntos(caso.mejor_puntaje ?? 0, caso)}`
        : null,
  }
}
export const ocupacionesObtenidas = (coleccion: OcupacionColeccion[] | null) =>
  new Set((coleccion ?? []).map((o) => o.ocupacion))
// Bloqueado: la pista si la tiene; si no, el mensaje de bloqueo se consulta aparte.
export const pistaTestimonio = (testimonio: TestimonioEstado) =>
  testimonio.estado === 'BLOQUEADA' ? testimonio.pista : null
// Ajuste testimonios: el video se abre en YouTube desde el segundo de inicio del tramo.
export const urlYoutubeTestimonio = (testimonio: Pick<TestimonioEstado, 'video_id' | 'inicio'>) =>
  testimonio.video_id ? `https://youtu.be/${testimonio.video_id}?t=${testimonio.inicio ?? 0}` : undefined
// El embed arranca en el inicio y termina en el fin, si lo hay.
export const urlEmbedTestimonio = (testimonio: Pick<TestimonioEstado, 'video_id' | 'inicio' | 'fin'>) =>
  testimonio.video_id
    ? `https://www.youtube-nocookie.com/embed/${testimonio.video_id}?start=${testimonio.inicio ?? 0}${
        testimonio.fin !== null ? `&end=${testimonio.fin}` : ''
      }`
    : undefined
