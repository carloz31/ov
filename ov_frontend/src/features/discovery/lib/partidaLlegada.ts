// Ajuste de F03: modelo de la tarjeta y la vista explicada de partida y llegada, en sus dos estados (solo
// partida; partida + llegada). Las zonas llegan como código y aquí se ordenan; nunca se leen puntajes.
import { APLICACION_LLEGADA, APLICACION_PARTIDA, zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { ItemPublico, RespuestaPublica, ZonaDimension } from '@/types/servidor'
import type { LibroServidor } from './helenaPagesApi'

// Orden fijo de izquierda a derecha: Por trabajar → En camino → Fuerte.
export const ZONAS: ZonaDimension[] = ['POR_TRABAJAR', 'EN_CAMINO', 'FUERTE']
export const posicionZona = (zona: ZonaDimension) => ZONAS.indexOf(zona)

export type ItemPartidaLlegada = { item: string; enunciado: string; partida: string; llegada?: string }
export type DimensionPartidaLlegada = {
  codigo: string
  nombre: string
  descripcion: string
  zonaPartida: ZonaDimension
  // Solo con la llegada revelada.
  zonaLlegada?: ZonaDimension
  actividades?: number
  // Completo: los que cambiaron y los que se mantuvieron. Solo partida: todos en `items`.
  cambiaron: ItemPartidaLlegada[]
  mantenidos: ItemPartidaLlegada[]
  items: ItemPartidaLlegada[]
}
export type ModeloPartidaLlegada = {
  completo: boolean
  dimensiones: DimensionPartidaLlegada[]
  // Nombres de las dimensiones cuya zona de llegada es mayor que la de partida.
  avanzaron: string[]
  // Solo partida: cuántas dimensiones hay en cada zona, de la más alta a la más baja, sin las vacías.
  conteoZonas: { zona: ZonaDimension; cantidad: number }[]
}

export const subio = (d: DimensionPartidaLlegada) =>
  !!d.zonaLlegada && posicionZona(d.zonaLlegada) > posicionZona(d.zonaPartida)
export const bajo = (d: DimensionPartidaLlegada) =>
  !!d.zonaLlegada && posicionZona(d.zonaLlegada) < posicionZona(d.zonaPartida)

// «Claridad», «Claridad y Decisión propia», «A, B y C».
export function listaNombres(nombres: string[]) {
  return nombres.length < 2 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

export function conteoZonaEnPalabras({ zona, cantidad }: { zona: ZonaDimension; cantidad: number }) {
  return `${cantidad} ${zonaEnPalabras(zona).toLowerCase()}`
}

// Ítems de partida agrupados por la dimensión de `/items`, en el orden del backend, con la etiqueta elegida.
function itemsPartida(items: ItemPublico[], respuestas: RespuestaPublica[], dimension: string) {
  const etiquetas = new Map(respuestas.map((r) => [r.item, r.opcion.etiqueta]))
  return items
    .filter((i) => i.dimension === dimension && etiquetas.has(i.codigo))
    .map((i) => ({ item: i.codigo, enunciado: i.enunciado, partida: etiquetas.get(i.codigo) ?? '' }))
}

export function modeloPartidaLlegada(
  libro: LibroServidor,
  respuestasPartida: { items: ItemPublico[]; respuestas: RespuestaPublica[] } = { items: [], respuestas: [] },
): ModeloPartidaLlegada | null {
  const partida = libro.resultados[APLICACION_PARTIDA.aplicacion]
  if (!partida) return null
  const comparacion = libro.resultados[APLICACION_LLEGADA.aplicacion] ? libro.comparacion : null
  const dimensiones: DimensionPartidaLlegada[] = comparacion
    ? comparacion.dimensiones.map((d) => {
        const items = d.items.map(({ item, enunciado, partida, llegada }) => ({ item, enunciado, partida, llegada }))
        return {
          codigo: d.codigo,
          nombre: d.nombre,
          descripcion: d.descripcion,
          zonaPartida: d.zona_partida,
          zonaLlegada: d.zona_llegada,
          actividades: d.actividades_completadas,
          cambiaron: items.filter((_, i) => d.items[i].cambio),
          mantenidos: items.filter((_, i) => !d.items[i].cambio),
          items,
        }
      })
    : partida.dimensiones
        .filter((d) => d.zona)
        .map((d) => ({
          codigo: d.codigo,
          nombre: d.nombre,
          descripcion: d.descripcion,
          zonaPartida: d.zona as ZonaDimension,
          cambiaron: [],
          mantenidos: [],
          items: itemsPartida(respuestasPartida.items, respuestasPartida.respuestas, d.codigo),
        }))
  return {
    completo: !!comparacion,
    dimensiones,
    avanzaron: dimensiones.filter(subio).map((d) => d.nombre),
    conteoZonas: [...ZONAS]
      .reverse()
      .map((zona) => ({ zona, cantidad: dimensiones.filter((d) => d.zonaPartida === zona).length }))
      .filter((c) => c.cantidad > 0),
  }
}
