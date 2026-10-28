import type {
  ComplicacionEntrada,
  ElegidaEntrada,
  FrecuenciaGasto,
  GastoEntrada,
  GastoPublico,
  OpcionesTarjeta,
  PasoEntrada,
  PasosDatos,
  PlanCarrera,
  RealidadDatos,
} from '@/types/servidor'

// F07b: borradores de edición de REALIDAD y PASOS, la precarga de gastos y los totales en vivo (F07b-pantallas
// §7–§8). Solo importa tipos: las pruebas lo cargan aislado.

type Gestion = 'PUBLICA' | 'PRIVADA' | null
type Rubro = OpcionesTarjeta['rubros'][number]

export type GastoBorrador = {
  clave: number
  rubro: string | null
  otro: string
  monto: number
  frecuencia: FrecuenciaGasto
}
export type ComplicacionBorrador = ({ opcion: string } | { otro: string }) & { numero?: number }
export type BorradorRealidad = {
  institucion: string | null
  camino: ElegidaEntrada | null
  gastos: GastoBorrador[]
  financiamiento: ElegidaEntrada[]
  complicaciones: ComplicacionBorrador[]
  // Mientras dura la primera edición (sección por empezar), la pensión sigue a la gestión si no se tocó.
  precargando: boolean
}

let siguienteClave = 1
const clave = () => siguienteClave++
const elegida = (e: { opcion: string | null; otro: string | null }): ElegidaEntrada =>
  e.otro !== null ? { otro: e.otro } : { opcion: e.opcion! }
const prepara = (camino: ElegidaEntrada | null, opciones: OpcionesTarjeta) =>
  !!camino &&
  'opcion' in camino &&
  !!opciones.caminos.find((c) => c.codigo === camino.opcion)?.incluye_preparacion
const montoInicial = (rubro: Rubro, gestion: Gestion) =>
  rubro.cero_si_publica && gestion === 'PUBLICA' ? 0 : (rubro.monto_referencia ?? 0)
const filaDe = (rubro: Rubro, gestion: Gestion): GastoBorrador => ({
  clave: clave(),
  rubro: rubro.codigo,
  otro: '',
  monto: montoInicial(rubro, gestion),
  frecuencia: rubro.frecuencia_recomendada ?? 'MENSUAL',
})

// Precarga: los rubros con referencia, Preparación solo si el camino la incluye; Alimentación y Vivienda (sin
// referencia) nunca. Pensión en 0 con institución pública; sin gestión, su referencia.
export function gastosPrecargados(
  opciones: OpcionesTarjeta,
  gestion: Gestion,
  camino: ElegidaEntrada | null,
) {
  return opciones.rubros
    .filter((r) => r.frecuencia_recomendada !== null && r.monto_referencia !== null)
    .filter((r) => !r.solo_si_camino_prepara || prepara(camino, opciones))
    .map((r) => filaDe(r, gestion))
}

export function borradorRealidad(plan: PlanCarrera, opciones: OpcionesTarjeta): BorradorRealidad {
  const camino = plan.camino && elegida(plan.camino)
  const porEmpezar = plan.secciones.find((s) => s.codigo === 'REALIDAD')?.estado === 'POR_EMPEZAR'
  return {
    institucion: plan.institucion?.codigo ?? null,
    camino,
    gastos: porEmpezar
      ? gastosPrecargados(opciones, plan.institucion?.gestion ?? null, camino)
      : plan.gastos.map((g: GastoPublico) => ({
          clave: clave(),
          rubro: g.rubro,
          otro: g.otro ?? '',
          monto: g.monto,
          frecuencia: g.frecuencia,
        })),
    financiamiento: plan.financiamiento.map(elegida),
    complicaciones: plan.complicaciones.map((c) => ({ ...elegida(c), numero: c.numero })),
    precargando: porEmpezar,
  }
}

// Elegir o cambiar el camino agrega la fila de Preparación (con su referencia) si falta, o la quita.
export function cambiarCamino(b: BorradorRealidad, camino: ElegidaEntrada | null, opciones: OpcionesTarjeta) {
  const conPreparacion = prepara(camino, opciones)
  const rubros = opciones.rubros.filter((r) => r.solo_si_camino_prepara)
  const faltan = conPreparacion ? rubros.filter((r) => !b.gastos.some((g) => g.rubro === r.codigo)) : []
  const gastos = conPreparacion
    ? [...faltan.map((r) => filaDe(r, null)), ...b.gastos]
    : b.gastos.filter((g) => !rubros.some((r) => r.codigo === g.rubro))
  return { ...b, camino, gastos }
}

// Cambiar de institución no toca los montos; solo en la primera edición, la pensión precargada sigue a la gestión
// mientras el estudiante no la cambie.
export function cambiarInstitucion(
  b: BorradorRealidad,
  codigo: string | null,
  gestion: Gestion,
  opciones: OpcionesTarjeta,
) {
  if (!b.precargando) return { ...b, institucion: codigo }
  const gastos = b.gastos.map((g) => {
    const rubro = opciones.rubros.find((r) => r.codigo === g.rubro)
    const precargado = rubro?.cero_si_publica && (g.monto === 0 || g.monto === rubro.monto_referencia)
    return rubro && precargado ? { ...g, monto: montoInicial(rubro, gestion) } : g
  })
  return { ...b, institucion: codigo, gastos }
}

// Un rubro de la lista (con su referencia si la tiene) u «Otro» con su texto, al final de la tabla.
export function agregarGasto(
  b: BorradorRealidad,
  rubro: string | null,
  opciones: OpcionesTarjeta,
  gestion: Gestion,
) {
  const deLista = opciones.rubros.find((r) => r.codigo === rubro)
  const fila: GastoBorrador = deLista
    ? filaDe(deLista, gestion)
    : { clave: clave(), rubro: null, otro: '', monto: 0, frecuencia: 'MENSUAL' }
  return { ...b, gastos: [...b.gastos, fila] }
}
export const rubrosSinFila = (b: BorradorRealidad, opciones: OpcionesTarjeta) =>
  opciones.rubros.filter((r) => !b.gastos.some((g) => g.rubro === r.codigo))

// La nota bajo un rubro de la tabla: por qué está Preparación y por qué la pensión va en 0.
export function notaGasto(
  g: GastoBorrador,
  b: BorradorRealidad,
  opciones: OpcionesTarjeta,
  gestion: Gestion,
) {
  const rubro = opciones.rubros.find((r) => r.codigo === g.rubro)
  if (rubro?.solo_si_camino_prepara && b.camino && 'opcion' in b.camino) {
    const texto =
      opciones.caminos.find((c) => c.codigo === (b.camino as { opcion: string }).opcion)?.texto ?? ''
    return `porque eliges ${texto.charAt(0).toLowerCase()}${texto.slice(1).replace(/^(\S*?)me\b/, '$1te')}`
  }
  if (rubro?.cero_si_publica && gestion === 'PUBLICA' && g.monto === 0) return '0 por ser pública'
  return null
}

export function datosRealidad(b: BorradorRealidad): RealidadDatos {
  const gastos: GastoEntrada[] = b.gastos.flatMap((g): GastoEntrada[] => {
    const monto = Math.max(0, Math.round(Number(g.monto) || 0))
    if (g.rubro) return [{ rubro: g.rubro, monto, frecuencia: g.frecuencia }]
    return g.otro.trim() ? [{ otro: g.otro.trim(), monto, frecuencia: g.frecuencia }] : []
  })
  const camino = b.camino && 'otro' in b.camino && !b.camino.otro.trim() ? null : b.camino
  const complicaciones: ComplicacionEntrada[] = b.complicaciones.map((c) =>
    c.numero !== undefined ? { numero: c.numero } : 'otro' in c ? { otro: c.otro } : { opcion: c.opcion },
  )
  return { institucion: b.institucion, camino, gastos, financiamiento: b.financiamiento, complicaciones }
}

// Totales con la fórmula del servidor (planes.md): primer año = UNICA + 12·MENSUAL + c·POR_CICLO + ANUAL; la
// carrera, exacta y redondeada al final (mitad hacia arriba), solo con la duración en ciclos.
export function totalesGastos(
  gastos: { monto: number; frecuencia: FrecuenciaGasto }[],
  ciclosPorAnio: number,
  duracionCiclos: number | null,
) {
  const suma = { UNICA: 0, MENSUAL: 0, POR_CICLO: 0, ANUAL: 0 }
  for (const g of gastos) suma[g.frecuencia] += Math.max(0, Math.round(Number(g.monto) || 0))
  const primerAnio = suma.UNICA + 12 * suma.MENSUAL + ciclosPorAnio * suma.POR_CICLO + suma.ANUAL
  let carrera: number | null = null
  if (duracionCiclos !== null) {
    const c = ciclosPorAnio,
      n = duracionCiclos
    const numerador = suma.UNICA * c + n * (suma.MENSUAL * 12 + suma.POR_CICLO * c) + suma.ANUAL * n
    carrera = Math.floor((2 * numerador + c) / (2 * c))
  }
  const anios = duracionCiclos === null ? null : duracionCiclos / ciclosPorAnio
  return { primerAnio, alMes: Math.round(primerAnio / 12), carrera, anios }
}
export const textoAnios = (anios: number) =>
  `${String(anios).replace('.', ',')} ${anios === 1 ? 'año' : 'años'}`

// --- PASOS ----------------------------------------------------------------------------------------

export type PasoBorrador =
  | { numero: number; tipo: string; texto: string; origen: string | null }
  | { sugerencia: number; tipo: string; texto: string; origen: string }
  | { clave: number; tipo: string; texto: string }
export type BorradorPasos = { pasos: PasoBorrador[]; descartadas: number[] }

// Los pendientes se editan; los hechos se muestran aparte y no se envían (el servidor los conserva al final).
export function borradorPasos(plan: PlanCarrera, origenDe: (numero: number) => string | null): BorradorPasos {
  return {
    pasos: plan.pasos
      .filter((p) => p.estado === 'PENDIENTE')
      .map((p) => ({ numero: p.numero, tipo: p.tipo, texto: p.texto, origen: origenDe(p.numero) })),
    descartadas: [],
  }
}
// Las sugerencias pendientes que aún esperan decisión en el borrador (ni agregadas ni descartadas).
export const sugerenciasEnEspera = (plan: PlanCarrera, b: BorradorPasos) =>
  plan.sugerencias.filter(
    (s) =>
      s.estado === 'PENDIENTE' &&
      !b.descartadas.includes(s.numero) &&
      !b.pasos.some((p) => 'sugerencia' in p && p.sugerencia === s.numero),
  )
export function aceptarSugerencia(
  b: BorradorPasos,
  plan: PlanCarrera,
  numero: number,
  tipo?: string,
  texto?: string,
) {
  const s = plan.sugerencias.find((x) => x.numero === numero)
  if (!s) return b
  const paso: PasoBorrador = {
    sugerencia: numero,
    tipo: tipo ?? s.tipo,
    texto: texto ?? s.texto,
    origen: s.origen.texto,
  }
  return { ...b, pasos: [...b.pasos, paso] }
}
export const descartarSugerencia = (b: BorradorPasos, numero: number) => ({
  ...b,
  descartadas: [...b.descartadas, numero],
})
export const nuevoPaso = (tipo: string, texto: string): PasoBorrador => ({ clave: clave(), tipo, texto })

export function datosPasos(b: BorradorPasos): PasosDatos {
  const pasos: PasoEntrada[] = b.pasos.flatMap((p): PasoEntrada[] => {
    const texto = p.texto.trim()
    if ('numero' in p) return [{ numero: p.numero, tipo: p.tipo, texto: texto || p.texto }]
    if ('sugerencia' in p) return [{ sugerencia: p.sugerencia, tipo: p.tipo, texto: texto || p.texto }]
    return texto && p.tipo ? [{ tipo: p.tipo, texto }] : []
  })
  return { pasos, sugerencias_descartadas: b.descartadas }
}
