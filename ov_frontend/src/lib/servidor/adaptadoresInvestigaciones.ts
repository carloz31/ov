import type {
  ErrorServidor,
  InvestigacionEnCurso,
  LogrosCuenta,
  MotivoReporte,
  PreguntaBasePublica,
  PreguntaGuionPublica,
  TipoReaccionPublico,
} from '@/types/servidor'
import { fechaServidor } from './fechas'

// F09: Investigaciones en api (estudiante y orientadora). Solo importa tipos: las pruebas lo cargan aislado.

// Paso del asistente que abre «Ver mi guion» o «Iniciar»: sin investigación, lo que pienso; en curso, las
// preguntas; con la guía lista, la guía.
export function pasoInvestigacion(enCurso: InvestigacionEnCurso | null): 1 | 2 | 3 {
  if (!enCurso) return 1
  return enCurso.estado === 'GUIA_LISTA' ? 3 : 2
}

export const MINIMO_IDEAL_PREGUNTAS = 6
export const MAXIMO_IDEAL_PREGUNTAS = 8
export const AVISO_PREGUNTAS = 10

// Numeración continua: las base son 1–3 y las del estudiante siguen.
export function numerarGuion(base: PreguntaBasePublica[], preguntas: PreguntaGuionPublica[]) {
  return {
    base: base.map((p, i) => ({ numero: i + 1, texto: p.texto })),
    propias: preguntas.map((p, i) => ({ ...p, numero: base.length + i + 1 })),
    total: base.length + preguntas.length,
  }
}
// Mínimo para terminar: las base y una del estudiante (su duda o una propia; una sugerida no basta).
export const puedeTerminarGuion = (preguntas: PreguntaGuionPublica[]) =>
  preguntas.some((p) => p.origen === 'DUDA' || p.origen === 'PROPIA')
export const avisoMuchasPreguntas = (total: number) => total > AVISO_PREGUNTAS

// Leyenda = destacada + N favoritos. El medidor promedia las dos condiciones (los favoritos hasta N).
export function medidorLeyenda(datos: {
  favoritos: number
  favoritosLeyenda: number
  destacada: boolean
  leyenda: boolean
}) {
  const requeridos = Math.max(1, datos.favoritosLeyenda)
  const favoritos = Math.min(datos.favoritos, requeridos)
  const porcentaje = datos.leyenda
    ? 100
    : Math.round(((favoritos / requeridos + (datos.destacada ? 1 : 0)) / 2) * 100)
  return {
    porcentaje,
    favoritos: datos.favoritos,
    requeridos: datos.favoritosLeyenda,
    destacada: datos.destacada,
  }
}

export const textoReacciones = (n: number) => `${n} ${n === 1 ? 'reacción' : 'reacciones'}`
// Pie de la tarjeta: sin desglose por tipo (decisión 9 de la spec).
export const lineaConteos = (reacciones: number, favoritos: number) =>
  `${textoReacciones(reacciones)} · Favoritos ${favoritos}`

// «Aprendí algo 2 · Me gustó cómo se realizó 3», en el orden del catálogo y solo los que tienen alguna.
export function desglosePorTipo(
  porTipo: Record<string, number> | null | undefined,
  tipos: TipoReaccionPublico[],
) {
  return tipos.filter((t) => (porTipo?.[t.codigo] ?? 0) > 0).map((t) => `${t.nombre} ${porTipo![t.codigo]}`)
}

// La etiqueta del comentario según el tipo (texto del front; un tipo nuevo cae en la pregunta del catálogo).
const ETIQUETAS: Record<string, string> = {
  APRENDI: 'Lo que aprendiste',
  ME_GUSTO: 'Lo que te gustó',
  CURIOSIDAD: 'Lo que le preguntarías',
  MI_CAMINO: 'Lo que te hizo pensar',
}
export const etiquetaComentario = (tipo: TipoReaccionPublico) => ETIQUETAS[tipo.codigo] ?? tipo.pregunta

export const MOTIVOS_REPORTE: { motivo: MotivoReporte; texto: string; corto: string }[] = [
  { motivo: 'OFENSIVO', texto: 'Es ofensivo o se burla de alguien', corto: 'ofensivo' },
  { motivo: 'VIDEO', texto: 'El video no abre o no corresponde a la entrevista', corto: 'video' },
  {
    motivo: 'DATOS_PRIVADOS',
    texto: 'Muestra datos privados de la persona entrevistada',
    corto: 'datos privados',
  },
  { motivo: 'OTRO', texto: 'Otro motivo', corto: 'otro motivo' },
]
// «Reportado: ofensivo · por 2 estudiantes» (el motivo más frecuente; nunca quién).
export function lineaReportes(motivos: MotivoReporte[]) {
  if (!motivos.length) return null
  const cuenta = new Map<MotivoReporte, number>()
  motivos.forEach((m) => cuenta.set(m, (cuenta.get(m) ?? 0) + 1))
  const principal = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const corto = MOTIVOS_REPORTE.find((m) => m.motivo === principal)?.corto ?? principal
  return `Reportado: ${corto} · por ${motivos.length} ${motivos.length === 1 ? 'estudiante' : 'estudiantes'}`
}

// El mismo patrón que valida el servidor (watch, youtu.be, shorts, embed o live, con el id de 11 caracteres).
const YOUTUBE =
  /^https?:\/\/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#]\S*)?$/
export const esEnlaceYoutube = (enlace: string) => YOUTUBE.test(enlace.trim())
export const idYoutube = (enlace: string) => YOUTUBE.exec(enlace.trim())?.[1] ?? null
export const embedYoutube = (enlace: string) => {
  const id = idYoutube(enlace)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

export const iniciales = (nombre: string) => {
  const limpio = nombre.trim()
  return limpio.slice(0, 1).toUpperCase() + limpio.slice(1, 2).toLowerCase() || '?'
}
// «Nivel 2 · Recolector de pistas»; sin nivel (cuenta inactiva), nada.
export const lineaNivel = (nivel: { numero: number; titulo: string } | null, conTitulo = true) =>
  nivel ? (conTitulo ? `Nivel ${nivel.numero} · ${nivel.titulo}` : `Nivel ${nivel.numero}`) : ''

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
// Las fechas del servidor van sin zona, en hora de Lima: se leen con `fechaServidor`.
const LIMA = -5 * 60 * 60000
const leer = fechaServidor
// Año, mes y día en Lima de un instante (con getUTC* sobre el instante corrido a Lima).
const enLima = (fecha: Date) => new Date(fecha.getTime() + LIMA)
export const fechaCorta = (iso: string) => {
  const fecha = enLima(leer(iso))
  return `${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]}`
}
export const fechaNumerica = (iso: string) => {
  const fecha = enLima(leer(iso))
  return `${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}/${fecha.getUTCFullYear()}`
}
// «hace 2 h», «ayer», «hace 3 días»; más de una semana, la fecha corta. Los días se cuentan en Lima.
export function fechaRelativa(iso: string, ahora: Date) {
  const fecha = leer(iso)
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const dia = (d: Date) => Math.floor(enLima(d).getTime() / 86400000)
  const dias = dia(ahora) - dia(fecha)
  if (dias <= 0) return `hace ${Math.floor(minutos / 60)} h`
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return fechaCorta(iso)
}
// «Iniciada hace 3 días» / «Iniciada hoy».
export function haceDias(iso: string, ahora: Date) {
  const relativa = fechaRelativa(iso, ahora)
  const mismoDia = (relativa.startsWith('hace') && relativa.endsWith(' h')) || relativa.endsWith('min')
  if (mismoDia || relativa === 'ahora') return 'hoy'
  return /^\d/.test(relativa) ? `el ${relativa}` : relativa
}

// Autores de la tarjeta y del detalle: «Tú» primero si es propia.
export function ordenarAutores<T extends { codigo: string }>(autores: T[], cuenta: string | null) {
  return [...autores].sort((a, b) => Number(b.codigo === cuenta) - Number(a.codigo === cuenta))
}

// Los sellos de la vitrina de un compañero, con el nombre que el estudiante conoce (sus propios logros). Una secreta
// que no tiene llega enmascarada en sus logros: se nombra «Sello secreto».
export function sellosVitrina(codigos: string[], logros: LogrosCuenta | null) {
  return codigos.map((codigo) => ({
    codigo,
    nombre: logros?.insignias.find((i) => i.codigo === codigo)?.nombre ?? 'Sello secreto',
  }))
}

// Una entrevista retirada o eliminada responde 404 a todos (también a sus autores): el texto para decirlo.
export const noDisponible = (error: ErrorServidor | null) =>
  error?.tipo === 'http' && error.estado === 404
    ? 'Esta entrevista ya no está disponible: se retiró o se eliminó.'
    : null
