// F05: del contrato del diario y del check-in a los modelos de las vistas. Solo importa tipos.
import type { JournalEntry, ReadinessCheckIn } from '@/types/adventure'
import type {
  AmistadAsistente,
  CheckInsCuenta,
  EntradaDiarioPublica,
  OrigenEntrada,
  PreguntaDiarioEstado,
} from '@/types/servidor'

export type EntradaDiarioVista = JournalEntry & {
  numero: number
  origen: OrigenEntrada
  // El título propio de la entrada (el que se edita); `title` es el que se muestra.
  tituloPropio: string | null
  editada: boolean
}
const tipos: Record<OrigenEntrada, JournalEntry['kind']> = {
  GUIADA: 'prompted',
  RECOMENDACION_DIA: 'dynamic',
  LIBRE: 'open',
}
export const etiquetasOrigen: Record<OrigenEntrada, string> = {
  GUIADA: 'Carta de Lumi',
  RECOMENDACION_DIA: 'Pregunta del día',
  LIBRE: 'Libre',
}
export const idEntradaServidor = (numero: number) => `servidor-${numero}`

// Sin etiquetas temáticas: el servidor no las tiene.
export function entradasDiario(entradas: EntradaDiarioPublica[] | null): EntradaDiarioVista[] {
  return (entradas ?? []).map((e) => ({
    id: idEntradaServidor(e.numero),
    title: e.titulo_mostrado,
    body: e.texto,
    kind: tipos[e.origen],
    createdAt: e.fecha_hora,
    promptShown: e.pregunta ?? undefined,
    topicTags: [],
    numero: e.numero,
    origen: e.origen,
    tituloPropio: e.titulo,
    editada: e.actualizada_en !== null,
  }))
}

export type CartaLumi = { codigo: string; nombre: string; porRedactar: boolean }
// Cartas: las DISPONIBLE sin responder. Las bloqueadas solo se cuentan (no se adelanta su nombre).
export function cartasDiario(preguntas: PreguntaDiarioEstado[] | null): {
  cartas: CartaLumi[]
  porDescubrir: number
} {
  const lista = preguntas ?? []
  return {
    cartas: lista
      .filter((p) => p.estado === 'DISPONIBLE' && !p.respondida)
      .map((p) => ({ codigo: p.codigo, nombre: p.nombre, porRedactar: p.personalizada && !p.redactada })),
    porDescubrir: lista.filter((p) => p.estado === 'BLOQUEADA').length,
  }
}

// Nombres de nivel del front para los niveles 0–5 del servidor; el 0 (sin puntos) comparte el primero.
export const nivelesAmistad = [
  'Conociéndonos',
  'Ganando confianza',
  'Compañeras de ruta',
  'Amistad de viaje',
  'Lumi te conoce de verdad',
] as const
export function amistadDiario(amistad: AmistadAsistente) {
  const indice = Math.max(0, Math.min(amistad.nivel, nivelesAmistad.length) - 1)
  return {
    puntos: amistad.puntos,
    nivel: nivelesAmistad[indice],
    indiceNivel: indice,
    // Un recuerdo por nivel alcanzado.
    recuerdosAbiertos: amistad.nivel,
    siguienteEn: amistad.siguiente_en ?? undefined,
  }
}

export const ESCALA_CHECK_IN = 5
// La serie del servidor como señales del front, en la escala 1–5.
export function senalesServidor(checkIns: CheckInsCuenta | null): ReadinessCheckIn[] {
  return (checkIns?.check_ins ?? []).map((c) => ({
    id: `servidor-${c.fecha}`,
    createdAt: `${c.fecha}T12:00:00`,
    value: c.nivel_seguridad as ReadinessCheckIn['value'],
  }))
}
export function senalDeHoy(checkIns: CheckInsCuenta | null): ReadinessCheckIn | undefined {
  return checkIns?.registrado_hoy ? senalesServidor(checkIns).at(-1) : undefined
}
