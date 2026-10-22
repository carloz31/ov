// F03: estado de las páginas del libro de Helena a partir del avance de instrumentos del servidor.
// Solo importa tipos: las pruebas lo cargan aislado.
import type {
  AvanceAplicacion,
  AvanceInstrumento,
  MotivoBloqueo,
  ResultadoHistorico,
  ResultadoPublico,
  ZonaDimension,
} from '@/types/servidor'

export type AplicacionInstrumento = { instrumento: string; aplicacion: string }
export const APLICACION_RIASEC: AplicacionInstrumento = { instrumento: 'TEST-RIASEC', aplicacion: 'APL-RIASEC' }
export const APLICACION_PARTIDA: AplicacionInstrumento = {
  instrumento: 'TEST-PARTIDA-LLEGADA',
  aplicacion: 'APL-PARTIDA',
}
export const APLICACION_LLEGADA: AplicacionInstrumento = {
  instrumento: 'TEST-PARTIDA-LLEGADA',
  aplicacion: 'APL-LLEGADA',
}
export const MAXIMO_REINICIOS_PERFIL_PLANO = 1

export type EstadoAplicacion = 'sealed' | 'ready' | 'revealed'

export function avanceAplicacion(
  avance: AvanceInstrumento[] | null | undefined,
  aplicacion: string,
): AvanceAplicacion | undefined {
  return avance?.flatMap((i) => i.aplicaciones).find((a) => a.aplicacion === aplicacion)
}

// Sellada mientras falten misiones; lista para revelar si está COMPLETADO sin resultado vigente; revelada
// cuando hay resultado vigente.
export function estadoAplicacion(
  avance: AvanceInstrumento[] | null | undefined,
  resultados: Record<string, ResultadoPublico>,
  aplicacion: string,
): EstadoAplicacion {
  const fila = avanceAplicacion(avance, aplicacion)
  if (fila?.hay_resultado_vigente && resultados[aplicacion]) return 'revealed'
  return fila?.estado === 'COMPLETADO' && !fila.hay_resultado_vigente ? 'ready' : 'sealed'
}

// Aplicaciones reveladas cuyo resultado hay que pedir.
export function aplicacionesReveladas(avance: AvanceInstrumento[]): AplicacionInstrumento[] {
  return avance.flatMap((i) =>
    i.aplicaciones
      .filter((a) => a.hay_resultado_vigente)
      .map((a) => ({ instrumento: i.instrumento, aplicacion: a.aplicacion })),
  )
}

// HU-095: el reinicio está usado si el historial trae un resultado anulado con perfil plano (B06).
export function reinicioUsado(historial: ResultadoHistorico[] | null | undefined) {
  return (
    (historial ?? []).filter((r) => r.anulado_en !== null && r.perfil_plano).length >=
    MAXIMO_REINICIOS_PERFIL_PLANO
  )
}

// F03: lo bloqueado espera un revelado (partida o cuestionarios prioritarios del salón, `R-T2`) si el
// servidor informa el evaluador `instrumentos_prioritarios` sin cumplir.
export function faltaRevelado(bloqueo: MotivoBloqueo[] | null | undefined) {
  return !!bloqueo?.some(
    (m) => m.evaluador_especial?.nombre === 'instrumentos_prioritarios' && !m.evaluador_especial.cumplido,
  )
}

export const ZONAS_EN_PALABRAS: Record<ZonaDimension, string> = {
  FUERTE: 'Zona fuerte',
  EN_CAMINO: 'En camino',
  POR_TRABAJAR: 'Por trabajar',
}
export function zonaEnPalabras(zona: ZonaDimension | null | undefined) {
  return zona ? ZONAS_EN_PALABRAS[zona] : ''
}
