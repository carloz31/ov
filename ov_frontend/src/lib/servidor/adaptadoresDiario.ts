// F05: del contrato del diario y del check-in a los modelos de las vistas. Solo importa tipos y `fechas.ts`.
import type { JournalEntry, ReadinessCheckIn } from '@/types/adventure'
import type {
  AmistadAsistente,
  BandejaCarta,
  CheckInsCuenta,
  EntradaDiarioPublica,
  OrigenEntrada,
  PreguntaDiarioEstado,
} from '@/types/servidor'
import { diaLima, fechaServidor } from './fechas'

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
    etiqueta: etiquetasOrigen[e.origen],
    editada: e.actualizada_en !== null,
  }))
}

// Ajuste del diario (F05): una carta de Lumi como la pinta el buzón. `sellada`: personalizada aún sin redactar
// (sin pregunta: «Abrir» la redacta); `lista`: con su pregunta. Las fechas y el remitente solo existen en api.
export type CartaLumi = {
  codigo: string
  nombre: string
  texto: string | null
  estado: 'sellada' | 'lista'
  bandeja: BandejaCarta
  recibidaEn: string | null
  remitente: { codigo: string; titulo: string } | null
  entrada: number | null
  respondidaEn: string | null
  archivadaEn: string | null
}
const recibida = (p: PreguntaDiarioEstado) => p.estado === 'DISPONIBLE' && p.bandeja !== null
// Las cartas recibidas, de la más reciente a la más antigua. Las bloqueadas no se listan ni se cuentan.
export function cartasDiario(preguntas: PreguntaDiarioEstado[] | null): CartaLumi[] {
  return (preguntas ?? [])
    .filter(recibida)
    .map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      texto: p.redactada ? p.texto : null,
      estado: p.personalizada && !p.redactada ? ('sellada' as const) : ('lista' as const),
      bandeja: p.bandeja!,
      recibidaEn: p.recibida_en,
      remitente: p.actividad,
      entrada: p.entrada,
      respondidaEn: p.respondida_en,
      archivadaEn: p.archivada_en,
    }))
    .sort((a, b) => (b.recibidaEn ?? '').localeCompare(a.recibidaEn ?? ''))
}
// La carta que abrió una actividad (drawer del mapa).
export const cartaDeActividad = (cartas: CartaLumi[], actividad: string) =>
  cartas.find((c) => c.remitente?.codigo === actividad)

// «hoy», «ayer» o «hace N días», por fecha de calendario en Lima (la del servidor y la de ahora).
export function fechaRelativa(iso: string, ahora: Date): string {
  const dia = (fecha: Date) => Date.parse(diaLima(fecha))
  const dias = Math.round((dia(ahora) - dia(fechaServidor(iso))) / 86_400_000)
  return dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
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
