import type {
  BandaSeguridad,
  ColumnaInteres,
  DesgloseFormacion,
  EtiquetaCuestionario,
  GestionPanel,
  TipoFormacion,
} from '@/types/servidor'

// Ajuste panel-salon · Textos del panel del salón armados con lo que llega del servidor (funciones puras).

// «Camila Rojas» → «Camila R.»; un nombre de una sola palabra queda entero.
export function nombreCorto(nombre: string) {
  const [primero, segundo] = nombre.trim().split(/\s+/)
  return segundo ? `${primero} ${segundo[0].toLocaleUpperCase('es')}.` : (primero ?? '')
}

// «1 o 2», «3», «de 2 a 4», con los límites de los parámetros.
export function textoBanda(banda: Pick<BandaSeguridad, 'desde' | 'hasta'>) {
  if (banda.desde === banda.hasta) return String(banda.desde)
  if (banda.hasta - banda.desde === 1) return `${banda.desde} o ${banda.hasta}`
  return `de ${banda.desde} a ${banda.hasta}`
}

export const nombresFormacion: Record<TipoFormacion, string> = {
  UNIVERSIDAD: 'Universitaria',
  INSTITUTO: 'Técnica',
  FFAA_POLICIA: 'Fuerzas Armadas o Policía',
}
export const nombresTipoInstitucionPanel: Record<TipoFormacion, string> = {
  UNIVERSIDAD: 'Universidad',
  INSTITUTO: 'Instituto',
  FFAA_POLICIA: 'Fuerzas Armadas y Policía',
}

function gestionConcordada(tipo: TipoFormacion, gestion: GestionPanel) {
  const femenino = tipo === 'UNIVERSIDAD'
  if (gestion === 'PUBLICA') return femenino ? 'pública' : 'público'
  return femenino ? 'privada' : 'privado'
}

// «Universidad pública», «Instituto privado», «Fuerzas Armadas y Policía».
export function textoInstitucion(tipo: TipoFormacion, gestion: GestionPanel | null) {
  const nombre = nombresTipoInstitucionPanel[tipo]
  return gestion && tipo !== 'FFAA_POLICIA' ? `${nombre} ${gestionConcordada(tipo, gestion)}` : nombre
}

// «3 en universidad pública · 3 en privada · 1 sin institución»: el tipo se nombra la primera vez.
export function textoDesglose(desglose: DesgloseFormacion[]) {
  const nombrados = new Set<TipoFormacion>()
  return desglose
    .map(({ tipo, gestion, cantidad }) => {
      if (!tipo) return `${cantidad} sin institución`
      if (nombrados.has(tipo) && gestion) return `${cantidad} en ${gestionConcordada(tipo, gestion)}`
      nombrados.add(tipo)
      return `${cantidad} en ${textoInstitucion(tipo, gestion).toLocaleLowerCase('es')}`
    })
    .join(' · ')
}

export const etiquetasCuestionario: Record<EtiquetaCuestionario, string> = {
  REQUISITO: 'Requisito del salón',
  REQUISITO_ALGUNOS: 'Requisito en algunos salones',
  CAMINO: 'Parte del camino',
  OPCIONAL: 'Opcional',
}

// «2026-11-13» → «viernes 13 de noviembre» (la fecha de Lima que manda el servidor, sin zona).
export function fechaPanel(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(anio, mes - 1, dia)))
}

// Orden de las tablas de intereses: `<columna>` ascendente, `-<columna>` descendente.
export const ORDEN_INICIAL_INTERESES = '-en_planes'
const COLUMNAS: ColumnaInteres[] = ['nombre', 'en_planes', 'plan_a', 'solo_favoritos', 'total']
export function ordenValido(orden: string | null) {
  return orden && COLUMNAS.includes(orden.replace(/^-/, '') as ColumnaInteres)
    ? orden
    : ORDEN_INICIAL_INTERESES
}
export function columnaDe(orden: string) {
  return { columna: orden.replace(/^-/, '') as ColumnaInteres, descendente: orden.startsWith('-') }
}
// Pulsar una cabecera ordena por ella (números de mayor a menor, nombre de la A a la Z); otra vez, invierte.
export function alternarOrden(actual: string, columna: ColumnaInteres) {
  const { columna: activa } = columnaDe(actual)
  if (activa === columna) return actual.startsWith('-') ? columna : `-${columna}`
  return columna === 'nombre' ? 'nombre' : `-${columna}`
}
