import type {
  ClaseDimension,
  ConteoDetalle,
  DestinoPerfil,
  DimensionPartida,
  EstadoTestPanel,
  EcoLinea,
  ApoderadoCabecera,
  PartidaResumen,
  TramoEstudiante,
  ZonaPerfil,
} from '@/types/servidor'
import { fechaServidor, ZONA_SERVIDOR } from './fechas'

// Ajuste panel-estudiantes · Palabras de la lista y el perfil del estudiante (funciones puras): zonas, cambios,
// niveles y estados en palabras, nunca en números ni porcentajes. Solo importa tipos y `fechas`.

export const textosTest: Record<EstadoTestPanel, string> = {
  LISTO: 'Listo',
  POR_REVISAR: 'Por revisar',
  EN_CURSO: 'En curso',
  SIN_EMPEZAR: 'Sin empezar',
}
export const textosZona: Record<ZonaPerfil, string> = {
  FUERTE: 'Fuerte',
  EN_CAMINO: 'En camino',
  POR_TRABAJAR: 'Por trabajar',
}
// Ajuste partida-llegada-liviano §4.1: el conteo del detalle como una frase, en piezas con su tono («aviso» o «exito»):
// «1 dimensión bajó, 1 sigue por trabajar y 3 subieron.», «2 dimensiones por trabajar, 2 en camino y 1 fuerte.» o, si
// todas van en el mismo grupo, «Las 5 dimensiones subieron.». Los ceros no llegan del servidor.
export type PiezaConteo = { texto: string; tono?: 'aviso' | 'exito' }
const VERBOS_CONTEO: Record<ZonaPerfil | ClaseDimension, [string, string]> = {
  BAJO: ['bajó', 'bajaron'],
  SIGUE_POR_TRABAJAR: ['sigue por trabajar', 'siguen por trabajar'],
  SUBIO: ['subió', 'subieron'],
  IGUAL: ['sigue igual', 'siguen igual'],
  POR_TRABAJAR: ['por trabajar', 'por trabajar'],
  EN_CAMINO: ['en camino', 'en camino'],
  FUERTE: ['fuerte', 'fuertes'],
}
const TONO_CONTEO: Partial<Record<ZonaPerfil | ClaseDimension, 'aviso' | 'exito'>> = {
  BAJO: 'aviso',
  SIGUE_POR_TRABAJAR: 'aviso',
  SUBIO: 'exito',
  POR_TRABAJAR: 'aviso',
}
export function fraseConteo(conteo: ConteoDetalle[]): PiezaConteo[] {
  const total = conteo.reduce((suma, c) => suma + c.cantidad, 0)
  if (!total) return []
  if (conteo.length === 1 && total > 1) {
    const { codigo } = conteo[0]
    const zona = codigo === 'POR_TRABAJAR' || codigo === 'EN_CAMINO' || codigo === 'FUERTE'
    const verbo = codigo === 'FUERTE' ? 'son fuertes' : zona ? `están ${VERBOS_CONTEO[codigo][1]}` : VERBOS_CONTEO[codigo][1]
    return [{ texto: `Las ${total} dimensiones ${verbo}`, tono: TONO_CONTEO[codigo] }, { texto: '.' }]
  }
  return conteo.flatMap((c, i) => {
    const uno = c.cantidad === 1
    const sustantivo = i === 0 ? (uno ? ' dimensión' : ' dimensiones') : ''
    const union = i === 0 ? '' : i === conteo.length - 1 ? ' y ' : ', '
    return [
      ...(union ? [{ texto: union }] : []),
      { texto: `${c.cantidad}${sustantivo} ${VERBOS_CONTEO[c.codigo][uno ? 0 : 1]}`, tono: TONO_CONTEO[c.codigo] },
      ...(i === conteo.length - 1 ? [{ texto: '.' }] : []),
    ]
  })
}
// «Partida respondida el 28 oct. Aún no responde la llegada.» o «… y llegada el 4 dic.»
export function lineaFechasPartida(partida: string, llegada: string | null) {
  return llegada
    ? `Partida respondida el ${fechaCorta(partida)} y llegada el ${fechaCorta(llegada)}.`
    : `Partida respondida el ${fechaCorta(partida)}. Aún no responde la llegada.`
}
// La explicación de «Respuesta baja», con el número del parámetro.
export function textoRespuestaBaja(opcionesBajas: number) {
  const cuantas =
    opcionesBajas === 1
      ? 'la opción menos favorable'
      : `una de las ${opcionesBajas === 2 ? 'dos' : opcionesBajas} opciones menos favorables`
  return `es ${cuantas}, con las afirmaciones en sentido contrario ya consideradas.`
}
export const textosApoderado: Record<ApoderadoCabecera['estado'], string> = {
  AUN_NO_INGRESA: 'aún no ingresa',
  INGRESO: 'ingresó',
  TERMINO_RUTA: 'terminó su ruta',
}
// Pestaña a la que lleva un aviso o tema y el texto de su enlace.
export const pestanaDestino: Record<DestinoPerfil, string> = {
  TESTS: 'tests',
  PLANES: 'planes',
  RESPUESTAS: 'respuestas',
  AVANCE: 'avance',
}
export const enlaceDestino: Record<DestinoPerfil, string> = {
  TESTS: 'Ver test',
  PLANES: 'Ver plan',
  RESPUESTAS: 'Ver respuesta',
  AVANCE: 'Ver avance',
}

export const letraPlan = (prioridad: number) => `Plan ${'ABC'[prioridad - 1] ?? prioridad}`
export const textoEnAreas = (dentro: boolean) =>
  dentro ? 'Entre sus áreas sugeridas' : 'No está entre sus áreas sugeridas'
// «hoy», «ayer», «hace N días» o «Nunca ingresó».
export function textoIngreso(dias: number | null) {
  if (dias === null) return 'Nunca ingresó'
  return dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
}

// «Por dónde va» de la lista: el tramo, «Sin empezar» o «Terminó».
export function textoTramo(tramo: TramoEstudiante) {
  if (tramo.codigo === 'SIN_EMPEZAR') return 'Sin empezar'
  if (tramo.codigo === 'TERMINO') return 'Terminó'
  return tramo.nombre ?? tramo.codigo
}

// El dato de avance de la cabecera del perfil: una línea pequeña y el nombre.
export function avanceCabecera(tramo: TramoEstudiante): { linea: string | null; nombre: string } {
  if (tramo.codigo === 'SIN_EMPEZAR') return { linea: null, nombre: 'Aún no empieza' }
  if (tramo.codigo === 'TERMINO') return { linea: null, nombre: 'Terminó el camino' }
  return { linea: `Va en el tramo ${tramo.numero} de ${tramo.total}`, nombre: tramo.nombre ?? tramo.codigo }
}

// «28 oct» o, con `largo`, «28 de octubre», en hora de Lima.
export function fechaCorta(fecha: string, largo = false) {
  const texto = fechaServidor(fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: largo ? 'long' : 'short',
    timeZone: ZONA_SERVIDOR,
  })
  return largo ? texto : texto.replace('.', '')
}

// «Cómo empezó» del Resumen: las dimensiones agrupadas por zona (solo partida) o por cambio (con llegada), en el
// orden de la spec; un grupo vacío no se muestra.
export type GrupoDimensiones = { titulo: string; dimensiones: DimensionPartida[] }
export function gruposComoEmpezo(partida: PartidaResumen): GrupoDimensiones[] {
  const grupos: [string, (d: DimensionPartida) => boolean][] =
    partida.estado === 'CON_LLEGADA'
      ? [
          // Ajuste partida-llegada-liviano: por la clase que manda el servidor.
          ['Bajó', (d) => d.clase === 'BAJO'],
          ['Sigue por trabajar', (d) => d.clase === 'SIGUE_POR_TRABAJAR'],
          ['Subió', (d) => d.clase === 'SUBIO'],
          ['Se mantiene', (d) => d.clase === 'IGUAL'],
        ]
      : [
          ['Por trabajar', (d) => d.zona_partida === 'POR_TRABAJAR'],
          ['En camino', (d) => d.zona_partida === 'EN_CAMINO'],
          ['Fuerte', (d) => d.zona_partida === 'FUERTE'],
        ]
  return grupos
    .map(([titulo, cumple]) => ({ titulo, dimensiones: partida.dimensiones.filter(cumple) }))
    .filter((g) => g.dimensiones.length > 0)
}

// «Respondió «Sí» a N de M preguntas» y «N abiertas · M resueltas».
export const textoConoce = (si: number, total: number) => `Respondió “Sí” a ${si} de ${total} preguntas`
export function textoDudas(abiertas: number, resueltas: number) {
  const partes = [
    abiertas ? `${abiertas} ${abiertas === 1 ? 'abierta' : 'abiertas'}` : null,
    resueltas ? `${resueltas} ${resueltas === 1 ? 'resuelta' : 'resueltas'}` : null,
  ].filter(Boolean)
  return partes.length ? partes.join(' · ') : 'Sin dudas'
}
export const textoSoles = (monto: number) => `S/ ${monto.toLocaleString('es-PE').replace(/,/g, ' ')}`

// «Además completó N misiones opcionales de la ciudad y superó M casos de la Central.» sin la parte en cero.
export function textoOpcionales(opcionales: number, casos: number) {
  const partes = [
    opcionales
      ? `completó ${opcionales} ${opcionales === 1 ? 'misión opcional' : 'misiones opcionales'} de la ciudad`
      : null,
    casos ? `superó ${casos} ${casos === 1 ? 'caso' : 'casos'} de la Central` : null,
  ].filter(Boolean)
  return partes.length ? `Además ${partes.join(' y ')}.` : null
}

// «Tenía a la vista»: un eco mostrado (las formas que arma el servidor) en una línea, con la cita de lo que escribió
// y las opciones como chips. Un eco sin nada que decir no se muestra.
export type EcoLectura = { texto: string; cita: string | null; chips: string[] }
type Plan = { carrera?: string; institucion?: string | null }
const lista = (valor: unknown) => (Array.isArray(valor) ? valor.map(String) : [])
const plan = (p: Plan, letra: string) => [letra, p.carrera, p.institucion].filter(Boolean).join(' · ')
export function lineaEco(eco: Record<string, unknown>): EcoLectura | null {
  const nombre = typeof eco.nombre === 'string' ? eco.nombre : null
  const conNombre = (valor: string) => (nombre ? `${nombre}: ${valor}` : valor)
  const planes = (Array.isArray(eco.planes) ? eco.planes : []) as Plan[]
  if (eco.origen === 'ITEM') {
    const texto = lista(eco.texto)
    return {
      texto: `lo que ${texto.length ? 'escribió' : 'eligió'} antes en ${nombre ?? ''}`,
      cita: texto.length ? texto.join(' / ') : null,
      chips: lista(eco.eleccion),
    }
  }
  switch (eco.forma) {
    case 'plan_a_b':
    case 'hoy':
      return planes.length
        ? { texto: planes.map((p, i) => plan(p, `Plan ${'AB'[i]}`)).join(' — '), cita: null, chips: [] }
        : null
    case 'carrera':
      return { texto: conNombre(String(eco.carrera ?? '')), cita: null, chips: [] }
    case 'cabecera':
      return { texto: conNombre(String(eco.carrera ?? '')), cita: null, chips: lista(eco.motivos) }
    case 'proyecto':
      return {
        texto: conNombre([eco.carrera, eco.institucion, eco.camino].filter(Boolean).join(' · ')),
        cita: null,
        chips: [],
      }
    case 'pasos':
      return {
        texto: [
          lista(eco.pendientes).length ? `pasos pendientes: ${lista(eco.pendientes).join(', ')}` : null,
          lista(eco.hechos).length ? `hechos: ${lista(eco.hechos).join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        cita: null,
        chips: [],
      }
    default: {
      const texto = [eco.texto, ...lista(eco.lineas)].filter(Boolean).map(String)
      if (!texto.length && !lista(eco.opciones).length) return null
      return { texto: conNombre(texto.join(' / ')), cita: null, chips: lista(eco.opciones) }
    }
  }
}

// Ajuste respuestas-orientadora §3.4: la línea gris de un eco, ya resuelto por el servidor, en piezas (`fuerte` para la
// carrera, `cursiva` para la actividad) y, aparte, lo que cambió hoy. Si el eco no tiene nada que decir, `null`.
export type PiezaEco = { texto: string; estilo?: 'fuerte' | 'cursiva' }
export type LineaEcoPanel = { piezas: PiezaEco[]; hoy: PiezaEco[] }
const enumerar = (valores: (string | number)[]) =>
  valores.length < 2
    ? valores.join('')
    : `${valores.slice(0, -1).join(', ')} y ${valores[valores.length - 1]}`
function piezasPlanes(planes: EcoLinea['planes']): PiezaEco[] {
  return planes.flatMap((p, i) => [
    { texto: `${i ? ' · ' : ''}Plan ${p.letra} ` },
    { texto: p.carrera ?? '', estilo: 'fuerte' as const },
    ...(planes.length === 1 && p.institucion ? [{ texto: ` · ${p.institucion}` }] : []),
  ])
}
function piezasHoy(eco: EcoLinea): PiezaEco[] {
  const hoy = eco.hoy
  if (!hoy) return []
  if (hoy.planes?.length)
    return hoy.planes.flatMap((p) => [
      { texto: ` Hoy su Plan ${p.letra} es ` },
      { texto: p.carrera ?? '', estilo: 'fuerte' as const },
      { texto: '.' },
    ])
  if (hoy.cita) return [{ texto: ` Hoy dice: “${hoy.cita}”.` }]
  if (hoy.opciones?.length) return [{ texto: ` Hoy eligió: ${hoy.opciones.join(', ')}.` }]
  if (hoy.texto) return [{ texto: ' Hoy: ' }, { texto: hoy.texto, estilo: 'fuerte' }, { texto: '.' }]
  return []
}
export function lineaEcoPanel(eco: EcoLinea): LineaEcoPanel | null {
  const hoy = piezasHoy(eco)
  switch (eco.fuente) {
    case 'MISMO_REGISTRO':
      return eco.numeros.length
        ? {
            piezas: [
              {
                texto: `Respondió viendo ${eco.numeros.length === 1 ? 'su respuesta' : 'sus respuestas'} ${enumerar(eco.numeros)}.`,
              },
            ],
            hoy: [],
          }
        : null
    case 'TEXTO':
    case 'ELECCION': {
      const opciones = eco.opciones.length ? eco.opciones.join(', ') : null
      const valor = [opciones, eco.cita ? `“${eco.cita}”` : null].filter(Boolean).join('. ')
      if (!valor) return null
      return {
        piezas: [
          { texto: `Respondió viendo lo que ${eco.cita ? 'escribió' : 'eligió'} en ` },
          { texto: eco.actividad ?? '', estilo: 'cursiva' },
          { texto: `: ${valor}.` },
        ],
        hoy,
      }
    }
    case 'PLANES':
      return eco.planes.length
        ? { piezas: [{ texto: 'Respondió viendo: ' }, ...piezasPlanes(eco.planes), { texto: '.' }], hoy }
        : null
    default: {
      const linea = eco.eco ? lineaEco(eco.eco) : null
      if (!linea || !linea.texto) return null
      const extra = linea.chips.length ? ` (${linea.chips.join(', ')})` : ''
      return { piezas: [{ texto: `Respondió viendo: ${linea.texto}${extra}.` }], hoy }
    }
  }
}
