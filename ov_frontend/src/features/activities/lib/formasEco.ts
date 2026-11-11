import type { EcoMostrado } from '@/types/servidor'
import { IDEAS_ORIGEN } from '@/lib/servidor/adaptadoresPlanes'
import { ECOS } from './textosRegistro'

// Ajuste front de registros (lote 2, §6): los ecos de un ítem (`ecos` de la lectura) en bloques con una de seis
// formas: plan, proyecto, texto, elección (con o sin su texto) y resultado de test; «Hoy» (b5-3) se arma con dos
// planes y una elección. Cada bloque se llena con lo que el eco traiga: un dato que no viene no deja hueco, y un eco
// sin datos no se muestra. Lógica pura.

export type PlanEco = {
  rotulo: string
  carrera: string
  institucion?: string
  motivos: string[]
  idea?: string
  relato?: string
}
export type PasoEco = { texto: string; hecho: boolean }
export type TextoEco = { lineas: string[]; origen?: string }
export type EleccionEco = { forma: 'eleccion'; valor: string; texto?: string[]; origen?: string }
export type BloqueEco =
  | { forma: 'plan'; plan: PlanEco }
  | { forma: 'planes'; planes: PlanEco[] }
  | { forma: 'proyecto'; rotulo: string; carrera: string; institucion?: string; camino?: string; pasos?: PasoEco[] }
  | { forma: 'textos'; textos: TextoEco[] }
  | EleccionEco
  | { forma: 'resultado'; nombre?: string; linea: string; dimensiones: string[] }
  | { forma: 'hoy'; planes: PlanEco[]; eleccion?: EleccionEco }

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
const textos = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [v])
    .map((x) => (x && typeof x === 'object' ? (x as { texto?: unknown }).texto : x))
    .filter((x): x is string => typeof x === 'string' && !!x.trim())

// «La idea fue mía», «La idea fue de mi familia»…: el rótulo de la idea que ya usa Mis planes, en minúscula.
export function ideaDe(codigo: unknown): string | undefined {
  const rotulo = IDEAS_ORIGEN.find(([c]) => c === codigo)?.[1]
  return rotulo && `${ECOS.ideaFue} ${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`
}

// Un texto citado va entre «»; si ya llega con comillas, tal cual.
export const citado = (linea: string) => (/^«.*»$/s.test(linea.trim()) ? linea.trim() : `«${linea.trim()}»`)

function plan(rotulo: string, datos: Record<string, unknown>): PlanEco | undefined {
  const carrera = texto(datos.carrera)
  if (!carrera) return undefined
  return {
    rotulo,
    carrera,
    institucion: texto(datos.institucion),
    motivos: textos(datos.motivos),
    idea: ideaDe(datos.idea_origen),
    relato: texto(datos.relato),
  }
}

function planesDe(eco: EcoMostrado) {
  const lista = Array.isArray(eco.planes) ? (eco.planes as Record<string, unknown>[]) : []
  return lista
    .slice(0, 2)
    .map((p, i) => plan(ECOS.planes[i], p))
    .filter((p): p is PlanEco => !!p)
}

function eleccion(valores: string[], origen: unknown, conTexto?: string[]): EleccionEco | undefined {
  if (!valores.length) return undefined
  return { forma: 'eleccion', valor: valores.join(' · '), texto: conTexto?.length ? conTexto : undefined,
    origen: texto(origen) }
}

function bloqueDe(eco: EcoMostrado): BloqueEco | 'pasos' | undefined {
  const nombre = texto(eco.nombre)
  switch (eco.forma) {
    case 'cabecera':
    case 'carrera': {
      const p = plan(nombre ?? ECOS.planes[0], eco)
      return p && { forma: 'plan', plan: p }
    }
    case 'carrera_institucion': {
      const p = plan(nombre ?? ECOS.planes[0], { carrera: eco.texto })
      return p && { forma: 'plan', plan: p }
    }
    case 'plan_a_b': {
      const planes = planesDe(eco)
      if (planes.length === 1) return { forma: 'plan', plan: planes[0] }
      return planes.length ? { forma: 'planes', planes } : undefined
    }
    case 'hoy': {
      const planes = planesDe(eco)
      return planes.length ? { forma: 'hoy', planes } : undefined
    }
    case 'proyecto': {
      const carrera = texto(eco.carrera)
      return carrera
        ? { forma: 'proyecto', rotulo: nombre ?? ECOS.proyecto, carrera, institucion: texto(eco.institucion),
            camino: texto(eco.camino) }
        : undefined
    }
    case 'pasos':
      return 'pasos'
    case 'primera':
      return eleccion(textos(eco.texto), nombre)
  }
  // Ecos de ítems anteriores de la misma actividad: elección, texto o las dos.
  if (eco.origen === 'ITEM') {
    const lineas = textos(eco.texto)
    if (eco.eleccion) return eleccion(textos(eco.eleccion), nombre, lineas)
    return lineas.length ? { forma: 'textos', textos: [{ lineas, origen: nombre }] } : undefined
  }
  if (eco.tipo === 'PLAN') {
    const p = plan(ECOS.planes[0], { carrera: eco.texto, motivos: eco.opciones })
    return p && { forma: 'plan', plan: p }
  }
  if (eco.tipo === 'RESULTADO') {
    const dimensiones = textos(eco.opciones)
    return dimensiones.length
      ? { forma: 'resultado', nombre, linea: ECOS.lineaResultado(nombre), dimensiones }
      : undefined
  }
  const opciones = textos(eco.opciones)
  if (opciones.length || eco.tipo === 'ELECCION' || eco.tipo === 'CHECK_IN_PRIMERO')
    return eleccion(opciones.length ? opciones : textos(eco.texto), nombre)
  const lineas = Array.isArray(eco.lineas) && eco.lineas.length ? textos(eco.lineas) : textos(eco.texto)
  return lineas.length ? { forma: 'textos', textos: [{ lineas, origen: nombre }] } : undefined
}

// Los pasos (`forma: pasos`) van dentro del bloque de proyecto: primero los hechos y luego los pendientes, porque
// el backend los entrega en dos listas.
function pasosDe(eco: EcoMostrado): PasoEco[] {
  return [
    ...textos(eco.hechos).map((t) => ({ texto: t, hecho: true })),
    ...textos(eco.pendientes).map((t) => ({ texto: t, hecho: false })),
  ]
}

export function formasEco(ecos: EcoMostrado[] | null | undefined): BloqueEco[] {
  const bloques: BloqueEco[] = []
  const pasos = (ecos ?? []).filter((e) => e.forma === 'pasos')
  for (const eco of ecos ?? []) {
    const bloque = bloqueDe(eco)
    if (!bloque || bloque === 'pasos') continue
    const anterior = bloques[bloques.length - 1]
    // Varios ecos de texto seguidos van en un solo bloque, cada uno con su origen.
    if (bloque.forma === 'textos' && anterior?.forma === 'textos') anterior.textos.push(...bloque.textos)
    // «Hoy»: la elección que lo sigue va dentro, debajo de los planes.
    else if (bloque.forma === 'eleccion' && anterior?.forma === 'hoy' && !anterior.eleccion) anterior.eleccion = bloque
    else bloques.push(bloque)
  }
  const proyecto = bloques.find((b) => b.forma === 'proyecto')
  if (proyecto && pasos.length) proyecto.pasos = pasos.flatMap(pasosDe)
  return bloques
}

// Resumen de los pasos, siempre visible: «2 hechos · 3 pendientes».
export function resumenPasos(pasos: PasoEco[]) {
  const hechos = pasos.filter((p) => p.hecho).length
  const pendientes = pasos.length - hechos
  return `${hechos} ${hechos === 1 ? ECOS.hecho : ECOS.hechos} · ${pendientes} ${
    pendientes === 1 ? ECOS.pendiente : ECOS.pendientes}`
}

// Recorta un texto largo en un límite de palabras: la parte corta con «…» y si se recortó.
export function recortar(valor: string, maximo: number) {
  if (valor.length <= maximo) return { corto: valor, recortado: false }
  const corte = valor.slice(0, maximo)
  const espacio = corte.lastIndexOf(' ')
  return { corto: `${(espacio > maximo * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`, recortado: true }
}

// Lote 2 (§5): un ítem de piezas (b4-1, b5-3) es el que ofrece opciones con origen; solo las piezas lo traen.
export const esItemPiezas = (item: { opciones: { origen: string | null }[] }) => item.opciones.some((o) => !!o.origen)

// Cómo se ve una pieza: una elección tal cual; un texto ya llega entre «»; una pieza de dos líneas, una debajo de
// otra, cada una entre «». Nunca códigos.
export const lineasPieza = (pieza: { texto: string; lineas?: string[] }) =>
  pieza.lineas?.length ? pieza.lineas.map(citado) : [pieza.texto]

// Agrupa las piezas por `grupo`, en el orden en que llegan; las que no traen grupo van juntas, sin rótulo.
export function gruposPiezas<T extends { grupo: string | null }>(piezas: T[]) {
  const grupos: { grupo: string | null; piezas: T[] }[] = []
  for (const pieza of piezas) {
    const grupo = grupos.find((g) => g.grupo === pieza.grupo)
    if (grupo) grupo.piezas.push(pieza)
    else grupos.push({ grupo: pieza.grupo, piezas: [pieza] })
  }
  return grupos
}
