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

// F07b: borradores de edición de REALIDAD y PASOS, los gastos propuestos y los totales en vivo (F07b-pantallas
// §7–§8, con el ajuste de «Cuánto costaría»). Solo importa tipos: las pruebas lo cargan aislado.

type Gestion = 'PUBLICA' | 'PRIVADA' | null
type Rubro = OpcionesTarjeta['rubros'][number]

// `monto` nulo: la fila está, pero el estudiante todavía no escribe cuánto cuesta (no se envía).
export type GastoBorrador = {
  clave: number
  rubro: string | null
  otro: string
  monto: number | null
  frecuencia: FrecuenciaGasto
}
export type ComplicacionBorrador = ({ opcion: string } | { otro: string }) & { numero?: number }
export type BorradorRealidad = {
  institucion: string | null
  camino: ElegidaEntrada | null
  gastos: GastoBorrador[]
  financiamiento: ElegidaEntrada[]
  complicaciones: ComplicacionBorrador[]
}

let siguienteClave = 1
const clave = () => siguienteClave++
const elegida = (e: { opcion: string | null; otro: string | null }): ElegidaEntrada =>
  e.otro !== null ? { otro: e.otro } : { opcion: e.opcion! }
const prepara = (camino: ElegidaEntrada | null, opciones: OpcionesTarjeta) =>
  !!camino &&
  'opcion' in camino &&
  !!opciones.caminos.find((c) => c.codigo === camino.opcion)?.incluye_preparacion
// El único monto escrito de antemano: Pensión en 0 con institución pública.
const montoInicial = (rubro: Rubro | undefined, gestion: Gestion) =>
  rubro?.cero_si_publica && gestion === 'PUBLICA' ? 0 : null
const filaDe = (rubro: Rubro, gestion: Gestion): GastoBorrador => ({
  clave: clave(),
  rubro: rubro.codigo,
  otro: '',
  monto: montoInicial(rubro, gestion),
  frecuencia: rubro.frecuencia_recomendada ?? 'MENSUAL',
})
// Orden de la tabla: los rubros de la lista en su orden, y los «Otro» al final en el orden en que se agregaron.
const orden = (g: GastoBorrador, opciones: OpcionesTarjeta) => {
  const i = opciones.rubros.findIndex((r) => r.codigo === g.rubro)
  return i < 0 ? opciones.rubros.length : i
}
const ordenar = (gastos: GastoBorrador[], opciones: OpcionesTarjeta) =>
  gastos
    .map((g, i) => ({ g, i }))
    .sort((a, b) => orden(a.g, opciones) - orden(b.g, opciones) || a.i - b.i)
    .map(({ g }) => g)

// Predeterminados: los rubros con frecuencia recomendada, con Preparación solo si el camino la incluye;
// Alimentación y Vivienda (sin frecuencia) nunca.
export const predeterminados = (opciones: OpcionesTarjeta, camino: ElegidaEntrada | null) =>
  opciones.rubros
    .filter((r) => r.frecuencia_recomendada !== null)
    .filter((r) => !r.solo_si_camino_prepara || prepara(camino, opciones))
// Agrega, vacíos, los predeterminados que falten, sin tocar las filas que ya están.
const completar = (
  gastos: GastoBorrador[],
  opciones: OpcionesTarjeta,
  camino: ElegidaEntrada | null,
  gestion: Gestion,
) =>
  ordenar(
    [
      ...gastos,
      ...predeterminados(opciones, camino)
        .filter((r) => !gastos.some((g) => g.rubro === r.codigo))
        .map((r) => filaDe(r, gestion)),
    ],
    opciones,
  )

// En cada edición: los gastos guardados más los predeterminados que falten, con el monto vacío.
export function borradorRealidad(plan: PlanCarrera, opciones: OpcionesTarjeta): BorradorRealidad {
  const camino = plan.camino && elegida(plan.camino)
  const guardados = plan.gastos.map((g: GastoPublico) => ({
    clave: clave(),
    rubro: g.rubro,
    otro: g.otro ?? '',
    monto: g.monto,
    frecuencia: g.frecuencia,
  }))
  return {
    institucion: plan.institucion?.codigo ?? null,
    camino,
    gastos: completar(guardados, opciones, camino, plan.institucion?.gestion ?? null),
    financiamiento: plan.financiamiento.map(elegida),
    complicaciones: plan.complicaciones.map((c) => ({ ...elegida(c), numero: c.numero })),
  }
}

// Cambiar el camino rehace el conjunto: Preparación entra (vacía) o sale; lo escrito en los demás se conserva.
export function cambiarCamino(
  b: BorradorRealidad,
  camino: ElegidaEntrada | null,
  opciones: OpcionesTarjeta,
  gestion: Gestion,
) {
  const soloSiPrepara = opciones.rubros.filter((r) => r.solo_si_camino_prepara)
  const faltan = soloSiPrepara.filter((r) => !b.gastos.some((g) => g.rubro === r.codigo))
  const gastos = prepara(camino, opciones)
    ? ordenar([...b.gastos, ...faltan.map((r) => filaDe(r, gestion))], opciones)
    : b.gastos.filter((g) => !soloSiPrepara.some((r) => r.codigo === g.rubro))
  return { ...b, camino, gastos }
}

// La institución solo toca la pensión: vacía pasa a 0 si la nueva es pública, y en 0 vuelve a vacía si no lo es.
export function cambiarInstitucion(
  b: BorradorRealidad,
  codigo: string | null,
  gestion: Gestion,
  opciones: OpcionesTarjeta,
) {
  const gastos = b.gastos.map((g) => {
    const rubro = opciones.rubros.find((r) => r.codigo === g.rubro)
    if (!rubro?.cero_si_publica) return g
    if (gestion === 'PUBLICA' && g.monto === null) return { ...g, monto: 0 }
    if (gestion !== 'PUBLICA' && g.monto === 0) return { ...g, monto: null }
    return g
  })
  return { ...b, institucion: codigo, gastos }
}

// Un rubro de la lista (vacío, salvo Pensión pública) u «Otro» con su texto; la «✕» lo devuelve a los chips.
export function agregarGasto(
  b: BorradorRealidad,
  rubro: string | null,
  opciones: OpcionesTarjeta,
  gestion: Gestion,
) {
  const deLista = opciones.rubros.find((r) => r.codigo === rubro)
  const fila: GastoBorrador = deLista
    ? filaDe(deLista, gestion)
    : { clave: clave(), rubro: null, otro: '', monto: null, frecuencia: 'MENSUAL' }
  return { ...b, gastos: ordenar([...b.gastos, fila], opciones) }
}
export const quitarGasto = (b: BorradorRealidad, fila: number) => ({
  ...b,
  gastos: b.gastos.filter((g) => g.clave !== fila),
})
// «Restablecer predeterminados»: repone los que falten, sin borrar montos escritos.
export const restablecerGastos = (b: BorradorRealidad, opciones: OpcionesTarjeta, gestion: Gestion) => ({
  ...b,
  gastos: completar(b.gastos, opciones, b.camino, gestion),
})
export const rubrosSinFila = (b: BorradorRealidad, opciones: OpcionesTarjeta) =>
  opciones.rubros.filter((r) => !b.gastos.some((g) => g.rubro === r.codigo))
export const faltanPredeterminados = (b: BorradorRealidad, opciones: OpcionesTarjeta) =>
  predeterminados(opciones, b.camino).some((r) => !b.gastos.some((g) => g.rubro === r.codigo))

// La pista bajo un rubro: «0 por ser pública», su referencia o, sin ella, que se consulta en la institución.
export type PistaGasto = { referencia: number } | { texto: string } | null
export function pistaGasto(g: GastoBorrador, opciones: OpcionesTarjeta, gestion: Gestion): PistaGasto {
  const rubro = opciones.rubros.find((r) => r.codigo === g.rubro)
  if (!rubro || rubro.frecuencia_recomendada === null) return null
  if (rubro.cero_si_publica && gestion === 'PUBLICA' && g.monto === 0) return { texto: '0 por ser pública' }
  return rubro.monto_referencia !== null
    ? { referencia: rubro.monto_referencia }
    : { texto: 'Consúltalo en su página' }
}

// Una fila con el monto vacío no se envía (el servidor exige un entero ≥ 0).
export function datosRealidad(b: BorradorRealidad): RealidadDatos {
  const gastos: GastoEntrada[] = b.gastos.flatMap((g): GastoEntrada[] => {
    if (g.monto === null) return []
    const monto = Math.max(0, Math.round(g.monto))
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
// carrera, exacta y redondeada al final (mitad hacia arriba), solo con la duración en ciclos. Suman solo lo
// escrito; `faltan` cuenta las filas con el monto vacío.
export function totalesGastos(
  gastos: { monto: number | null; frecuencia: FrecuenciaGasto }[],
  ciclosPorAnio: number,
  duracionCiclos: number | null,
) {
  const suma = { UNICA: 0, MENSUAL: 0, POR_CICLO: 0, ANUAL: 0 }
  for (const g of gastos) if (g.monto !== null) suma[g.frecuencia] += Math.max(0, Math.round(g.monto))
  const primerAnio = suma.UNICA + 12 * suma.MENSUAL + ciclosPorAnio * suma.POR_CICLO + suma.ANUAL
  let carrera: number | null = null
  if (duracionCiclos !== null) {
    const c = ciclosPorAnio,
      n = duracionCiclos
    const numerador = suma.UNICA * c + n * (suma.MENSUAL * 12 + suma.POR_CICLO * c) + suma.ANUAL * n
    carrera = Math.floor((2 * numerador + c) / (2 * c))
  }
  const anios = duracionCiclos === null ? null : duracionCiclos / ciclosPorAnio
  const faltan = gastos.filter((g) => g.monto === null).length
  return { primerAnio, alMes: Math.round(primerAnio / 12), carrera, anios, faltan }
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
