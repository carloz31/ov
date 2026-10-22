// F03: páginas del libro de Helena en api, leídas del avance y los resultados del servidor.
// Orden: I Partida y llegada, II Intereses, III Inteligencias, IV Habilidades (estas dos siguen de ejemplo).
import { actividadServidor, resultadoHelenaCompleto } from '@/lib/servidor/adaptadores'
import {
  APLICACION_LLEGADA,
  APLICACION_PARTIDA,
  APLICACION_RIASEC,
  avanceAplicacion,
  estadoAplicacion,
  reinicioUsado,
  zonaEnPalabras,
} from '@/lib/servidor/adaptadoresInstrumentos'
import type { HelenaPage } from '@/types/profile'
import type {
  AvanceInstrumento,
  ComparacionItem,
  BloqueActividades,
  ComparacionAutopercepcion,
  ResultadoHistorico,
  ResultadoPublico,
} from '@/types/servidor'
import type { InstrumentPageId } from '@/types/discovery'
import type { ResumenPagina } from '../types'
import { getHelenaPagesApi } from './helenaPages'

export type LibroServidor = {
  avance: AvanceInstrumento[] | null
  resultados: Record<string, ResultadoPublico>
  comparacion: ComparacionAutopercepcion | null
  historialRiasec: ResultadoHistorico[] | null
}

// Lo propio de una página en api: qué aplicación revela el sello, la misión que falta y, en partida y
// llegada, el segundo sello y la comparación.
export type ExtrasPaginaApi = {
  aplicacionSello?: { instrumento: string; aplicacion: string }
  faltante?: { titulo: string; href: string }
  selloLlegada: boolean
  conComparacion: boolean
  puedeReiniciar: boolean
}

export function hrefActividad(bloques: BloqueActividades[] | null, codigo: string) {
  const enCiudad = bloques?.some((b) => b.codigo === 'CIUDAD' && b.actividades.some((a) => a.codigo === codigo))
  return `${enCiudad ? '/student/exploration' : '/student/missions'}?actividad=${encodeURIComponent(codigo)}`
}

// La primera misión que falta de una aplicación, con el título del servidor.
function faltanteDe(bloques: BloqueActividades[] | null, libro: LibroServidor, aplicacion: string) {
  const codigo = avanceAplicacion(libro.avance, aplicacion)?.actividades.faltantes[0]
  if (!codigo) return undefined
  return { titulo: actividadServidor(bloques, codigo)?.titulo ?? codigo, href: hrefActividad(bloques, codigo) }
}

function misiones(libro: LibroServidor, aplicacion: string) {
  const fila = avanceAplicacion(libro.avance, aplicacion)
  return { done: fila?.actividades.completadas ?? 0, total: fila?.actividades.total ?? 0 }
}

export function paginaPartidaLlegada(
  bloques: BloqueActividades[] | null,
  libro: LibroServidor,
): HelenaPage & ExtrasPaginaApi {
  const partida = estadoAplicacion(libro.avance, libro.resultados, APLICACION_PARTIDA.aplicacion)
  const llegada = estadoAplicacion(libro.avance, libro.resultados, APLICACION_LLEGADA.aplicacion)
  const resultado = libro.resultados[APLICACION_PARTIDA.aplicacion]
  return {
    id: 'partida-llegada',
    numeral: 'I',
    title: 'Tu punto de partida y llegada',
    subtitle: 'Cómo te sientes frente a tu futuro',
    required: true,
    state: partida,
    missions: misiones(libro, APLICACION_PARTIDA.aplicacion),
    teaser: 'Esta página guarda cómo te sentías al empezar el camino.',
    demo: false,
    result: partida === 'revealed' && resultado ? resultadoHelenaCompleto(resultado, 'COMPARACION') : undefined,
    aplicacionSello: partida === 'ready' ? APLICACION_PARTIDA : llegada === 'ready' ? APLICACION_LLEGADA : undefined,
    faltante: faltanteDe(bloques, libro, APLICACION_PARTIDA.aplicacion),
    selloLlegada: partida === 'revealed' && llegada === 'ready',
    conComparacion: !!libro.comparacion,
    puedeReiniciar: false,
  }
}

export function paginaInteresesApi(
  bloques: BloqueActividades[] | null,
  libro: LibroServidor,
): HelenaPage & ExtrasPaginaApi {
  const estado = estadoAplicacion(libro.avance, libro.resultados, APLICACION_RIASEC.aplicacion)
  const resultado = libro.resultados[APLICACION_RIASEC.aplicacion]
  return {
    id: 'intereses',
    numeral: 'II',
    title: 'Lo que te atrae hacer',
    subtitle: 'Tus intereses',
    required: true,
    state: estado,
    missions: misiones(libro, APLICACION_RIASEC.aplicacion),
    teaser: 'Esta página aún guarda pistas sobre lo que te atrae hacer.',
    demo: false,
    perfilPlano: resultado?.perfil_plano,
    result: estado === 'revealed' && resultado ? resultadoHelenaCompleto(resultado, 'COINCIDENCIAS') : undefined,
    aplicacionSello: estado === 'ready' ? APLICACION_RIASEC : undefined,
    faltante: faltanteDe(bloques, libro, APLICACION_RIASEC.aplicacion),
    selloLlegada: false,
    conComparacion: false,
    puedeReiniciar: !!resultado?.perfil_plano && !reinicioUsado(libro.historialRiasec),
  }
}

// Resumen de partida y llegada: una fila por dimensión (su temática) con la zona en palabras; con la
// llegada revelada, «partida → llegada». Sin puntajes.
export function resumenPartidaLlegada(libro: LibroServidor): ResumenPagina {
  const partida = libro.resultados[APLICACION_PARTIDA.aplicacion]
  const llegada = libro.resultados[APLICACION_LLEGADA.aplicacion]
  if (!partida) return { rotulo: '', filas: [], cierre: '', contenidos: [] }
  return {
    rotulo: llegada ? 'Tu partida y tu llegada' : 'Tu punto de partida',
    filas: partida.dimensiones.map((d) => {
      const final = llegada?.dimensiones.find((l) => l.codigo === d.codigo)
      return {
        codigo: d.tematica ?? d.codigo,
        nombre: d.nombre,
        descripcion: '',
        marcador: 'letra',
        zona: final
          ? `${zonaEnPalabras(d.zona)} → ${zonaEnPalabras(final.zona)}`
          : zonaEnPalabras(d.zona),
      }
    }),
    cierre: '',
    contenidos: [],
  }
}

// Las cuatro páginas del libro en api; las de ejemplo conservan su revelado local.
export function paginasLibroApi(
  bloques: BloqueActividades[] | null,
  libro: LibroServidor,
  reveladasEjemplo: InstrumentPageId[],
) {
  const servidor = [paginaPartidaLlegada(bloques, libro), paginaInteresesApi(bloques, libro)]
  const extras = (id: string) => servidor.find((p) => p.id === id)
  return getHelenaPagesApi(servidor, reveladasEjemplo).map((p) => ({ ...p, ...extras(p.id) }))
}

// Vista explicada de partida y llegada (HU-094): por dimensión, su temática y su zona (o «partida →
// llegada»); con la comparación, primero los ítems que cambiaron y aparte los que se mantuvieron. Un cambio
// nunca se marca como mejor o peor.
export type DimensionComparada = {
  codigo: string
  nombre: string
  descripcion: string
  tematica: string
  zona: string
  cambiaron: ComparacionItem[]
  mantenidos: ComparacionItem[]
}
export function comparacionVista(libro: LibroServidor): DimensionComparada[] {
  const resumen = resumenPartidaLlegada(libro)
  const partida = libro.resultados[APLICACION_PARTIDA.aplicacion]
  return (partida?.dimensiones ?? []).map((d, i) => {
    const items = libro.comparacion?.dimensiones.find((c) => c.codigo === d.codigo)?.items ?? []
    return {
      codigo: d.codigo,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tematica: d.tematica ?? d.codigo,
      zona: resumen.filas[i]?.zona ?? '',
      cambiaron: items.filter((item) => item.cambio),
      mantenidos: items.filter((item) => !item.cambio),
    }
  })
}
