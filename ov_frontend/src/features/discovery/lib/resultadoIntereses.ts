import { textoBanda } from '@/lib/servidor/adaptadores'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import type {
  AreaOcupaciones,
  FamiliaRecomendadaPublica,
  OcupacionAfinPublica,
  PreparacionOcupacion,
} from '@/types/servidor'

// Ajuste resultados-intereses: lo que el resultado de intereses muestra con los datos del servidor. Las reglas
// (umbral, bandas, familias) son del backend; aquí solo se filtra, agrupa y redacta.

export type FiltroPreparacion = PreparacionOcupacion | 'TODAS'
export type VistaOcupaciones = 'lista' | 'area'

export const etiquetaAfinidad = (o: Pick<OcupacionAfinPublica, 'banda' | 'parecido'>) =>
  `${textoBanda(o.banda)} · ${o.parecido} %`

// Corrección del ajuste: el filtro por la preparación que suele pedir el trabajo. Es solo del front, sobre las
// ocupaciones ya devueltas; la posición sigue siendo la del orden global.
export function conteoPreparacion(ocupaciones: OcupacionAfinPublica[]): Record<FiltroPreparacion, number> {
  return {
    AMPLIA: ocupaciones.filter((o) => o.preparacion === 'AMPLIA').length,
    INTERMEDIA: ocupaciones.filter((o) => o.preparacion === 'INTERMEDIA').length,
    TODAS: ocupaciones.length,
  }
}

export const filtrarPreparacion = (ocupaciones: OcupacionAfinPublica[], filtro: FiltroPreparacion) =>
  filtro === 'TODAS' ? ocupaciones : ocupaciones.filter((o) => o.preparacion === filtro)

// Por defecto, Amplia; si no tiene ninguna, Todas.
export const filtroInicial = (ocupaciones: OcupacionAfinPublica[]): FiltroPreparacion =>
  ocupaciones.some((o) => o.preparacion === 'AMPLIA') ? 'AMPLIA' : 'TODAS'

export const pieAfinidad = (persona: 'tuyo' | 'suyo') =>
  `Afinidad: cuánto se parece el perfil de intereses de la ocupación al ${persona} («muy afín» desde 70 %). ` +
  'Preparación amplia: suele pedir grado universitario o posgrado; intermedia: formación técnica, capacitación ' +
  'o experiencia práctica. Es una referencia internacional; en el Perú la ruta exacta está en su familia de ' +
  'carreras. Fuente: O*NET Interest Profiler, adaptado a ocupaciones con formación en el Perú.'

// Las letras de la ocupación que están en el código de interés del estudiante.
export const letrasCompartidas = (riasec: string[], codigo: string) =>
  riasec.filter((l) => codigo.includes(l))

// Los grupos por área en el orden del servidor, solo con las ocupaciones que pasan el filtro.
export function agruparPorArea(ocupaciones: OcupacionAfinPublica[], areas: AreaOcupaciones[]) {
  const visibles = new Map(ocupaciones.map((o) => [o.codigo, o]))
  return areas
    .map((a) => ({
      codigo: a.area_codigo,
      nombre: a.area_nombre,
      ocupaciones: a.ocupaciones.flatMap((c) => (visibles.has(c) ? [visibles.get(c)!] : [])),
    }))
    .filter((a) => a.ocupaciones.length)
}

const MAXIMO_POR_QUE = 3

// «Diseñador gráfico (88 %), Animador digital (84 %), Diseñador de interiores (79 %) y 2 más».
export function ocupacionesDeFamilia(familia: Pick<FamiliaRecomendadaPublica, 'ocupaciones'>) {
  const nombres = familia.ocupaciones.map((o) => `${o.titulo} (${o.parecido} %)`)
  if (nombres.length === 1) return nombres[0]
  if (nombres.length <= MAXIMO_POR_QUE) return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
  return `${nombres.slice(0, MAXIMO_POR_QUE).join(', ')} y ${nombres.length - MAXIMO_POR_QUE} más`
}

export const verboLlegar = (familia: Pick<FamiliaRecomendadaPublica, 'ocupaciones'>) =>
  familia.ocupaciones.length === 1 ? 'aquí llega' : 'aquí llegan'

export const nombresTipos = (familia: Pick<FamiliaRecomendadaPublica, 'tipos'>) =>
  familia.tipos.map((t) => ({ tipo: t, nombre: nombresTipoCarrera[t] }))

export const textoCarreras = (total: number, sufijo = '') =>
  `${total} ${total === 1 ? 'carrera' : 'carreras'}${sufijo}`

export const textoVerOcupaciones = (total: number) =>
  total === 1 ? 'Ver su ocupación' : `Ver sus ${total} ocupaciones`

// La posición de una dimensión en la tarjeta de la guía («Tu más fuerte», «Segunda»…).
const ORDINALES = ['Segund', 'Tercer', 'Cuart', 'Quint', 'Sext', 'Séptim', 'Octav']
export function posicionDimension(indice: number, femenino: boolean) {
  if (indice === 0) return 'Tu más fuerte'
  return `${ORDINALES[indice - 1] ?? ''}${femenino ? 'a' : 'o'}`
}
