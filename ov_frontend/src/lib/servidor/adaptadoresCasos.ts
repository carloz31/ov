// Casos, colección y testimonios del servidor (F04). Aparte de adaptadores.ts por tamaño; solo importa tipos.
import type { CasoCuenta, OcupacionColeccion, TestimonioEstado } from '@/types/servidor'

// Porcentaje del intento sobre la satisfacción máxima de la definición del caso, con un decimal.
export function puntajeCaso(satisfaccion: number, maxima: number) {
  if (maxima <= 0) return 0
  return Math.round((1000 * Math.min(Math.max(satisfaccion, 0), maxima)) / maxima) / 10
}
export const textoPorcentaje = (puntaje: number) => `${Math.round(puntaje)} %`
// El umbral es propio de cada caso y lo entrega el servidor.
export const superaCaso = (puntaje: number, caso: Pick<CasoCuenta, 'puntaje_minimo'>) =>
  puntaje >= caso.puntaje_minimo
export const textoPuntajeCaso = (puntaje: number, caso: Pick<CasoCuenta, 'puntaje_minimo'>) =>
  `Puntaje: ${textoPorcentaje(puntaje)} · mínimo ${textoPorcentaje(caso.puntaje_minimo)}`
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
        ? `Intentos: ${caso.intentos} · Mejor puntaje: ${textoPorcentaje(caso.mejor_puntaje ?? 0)}`
        : null,
  }
}
export const textoTiposCaso = (caso: Pick<CasoCuenta, 'dimensiones'>, nombres: Record<string, string>) =>
  `Tipo del caso: ${caso.dimensiones.map((d) => nombres[d] ?? d).join(' · ')}`
export const ocupacionesObtenidas = (coleccion: OcupacionColeccion[] | null) =>
  new Set((coleccion ?? []).map((o) => o.ocupacion))
// Bloqueado: la pista si la tiene; si no, el mensaje de bloqueo se consulta aparte.
export const pistaTestimonio = (testimonio: TestimonioEstado) =>
  testimonio.estado === 'BLOQUEADA' ? testimonio.pista : null
