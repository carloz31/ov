import type { HelenaDimension, HelenaPage, HelenaResult, TipoResultadoHelena } from '@/types/profile'
import type { InstrumentPageId } from '@/types/discovery'
import type { HallazgoPagina, IconoPagina, ResumenPagina, ResumenResultado } from '../types'
import { posicionZona } from './partidaLlegada'

export function resumenPagina(
  page: Pick<HelenaPage, 'state' | 'perfilPlano'> & { tipoResultado?: TipoResultadoHelena; id?: InstrumentPageId },
  resultado?: HelenaResult & {
    coincidencias?: unknown[] | null
    carreras_recomendadas?: unknown[] | null
    familias?: unknown[] | null
  },
  // F03: en api, el perfil plano invita a repetir las misiones en lugar de revisar los encuentros con Mara.
  opciones: { textoPlano?: string } = {},
): ResumenPagina {
  const vacio: ResumenPagina = { rotulo: '', filas: [], cierre: '', contenidos: [] }
  if (page.state !== 'revealed' || !page.tipoResultado || !resultado) return vacio
  const intereses = page.tipoResultado === 'COINCIDENCIAS'
  const habilidades = page.id === 'habilidades'
  const cantidad = (resultado.dimensiones ?? resultado.areas).length
  const contenidos: ResumenPagina['contenidos'] = [
    {
      icono: 'perfil',
      texto: intereses
        ? `Tu perfil en los ${cantidad} tipos de interés`
        : habilidades
          ? `Tu perfil en las ${cantidad} habilidades sociales`
          : `Tu perfil en las ${cantidad} inteligencias`,
    },
  ]
  if (intereses && page.perfilPlano)
    return {
      rotulo: 'Tu código de interés',
      filas: [],
      titulo: 'Tus respuestas no marcaron un interés por encima de otro',
      cierre:
        opciones.textoPlano ??
        'Respondiste de forma muy parecida a todos los tipos de actividad. Revisa tus encuentros con Mara pensando en lo que de verdad disfrutas.',
      contenidos,
    }
  const principales = intereses ? resultado.areas : (resultado.destacadas ?? resultado.areas)
  if (intereses) {
    if (resultado.coincidencias?.length)
      contenidos.push({ icono: 'ocupaciones', texto: `${resultado.coincidencias.length} ocupaciones afines` })
    // Ajuste resultados-intereses: en api, el resultado recomienda familias de carreras, no carreras.
    if (resultado.familias?.length)
      contenidos.push({ icono: 'carreras', texto: `${resultado.familias.length} familias de carreras que llevan a ellas` })
    else if (resultado.carreras_recomendadas?.length)
      contenidos.push({
        icono: 'carreras',
        texto: `${resultado.carreras_recomendadas.length} carreras que conducen a ellas`,
      })
  } else contenidos.push({ icono: 'ideas', texto: 'Ideas para aprovecharlo con tu familia y tu diario' })
  return {
    rotulo: intereses
      ? `Tu código de interés · ${principales.map((d) => d.code).join('')}`
      : habilidades
        ? principales.length === 1
          ? 'Tu habilidad social más desarrollada hoy'
          : 'Tus habilidades sociales más desarrolladas hoy'
        : principales.length === 1
          ? 'Tu inteligencia más desarrollada'
          : 'Tus inteligencias más desarrolladas',
    filas: principales.map((d) => ({
      codigo: d.code,
      nombre: d.name,
      descripcion: d.description,
      marcador: intereses ? 'letra' : 'inteligencia',
    })),
    cierre: intereses
      ? 'Ninguno es mejor que otro: son pistas para explorar.'
      : habilidades
        ? 'Las que quedaron abajo no son una carencia: en la guía encontrarás por dónde empezar.'
        : principales.length === 1
        ? 'Es la que más usas hoy para aprender y resolver. Todas se pueden desarrollar.'
        : 'Destacan por igual. Ninguna es mejor que otra: describen cómo te gusta aprender y resolver.',
    contenidos,
  }
}

// Ajuste perfil-capitulos: el hallazgo de una página en el perfil. Decide solo por `tipoResultado` y los datos,
// nunca por el instrumento ni por el id de la página.
export const TEXTO_ROMPER_SELLO = 'Helena terminó de leer · Romper el sello →'
const MAXIMO_ETIQUETAS = 2

const RESPALDO_ICONO: Record<TipoResultadoHelena, IconoPagina> = {
  COMPARACION: 'Flag',
  COINCIDENCIAS: 'Compass',
  DESTACADAS: 'Sparkles',
}
export function iconoPagina(pagina: { icono?: IconoPagina; tipoResultado?: TipoResultadoHelena }): IconoPagina {
  return pagina.icono ?? (pagina.tipoResultado && RESPALDO_ICONO[pagina.tipoResultado]) ?? 'Sparkles'
}

const etiquetas = (nombres: string[]): HallazgoPagina => ({
  forma: 'etiquetas',
  nombres: nombres.slice(0, MAXIMO_ETIQUETAS),
  resto: Math.max(nombres.length - MAXIMO_ETIQUETAS, 0),
})
// Los conteos en cero no se dicen.
const frase = (conteos: [number, string, string][]) =>
  conteos
    .filter(([n]) => n > 0)
    .map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`)
    .join(' · ')
function fraseZonas(zonas: NonNullable<HelenaResult['zonas']>, conLlegada: boolean) {
  const cuantas = (cumple: (z: (typeof zonas)[number]) => boolean) => zonas.filter(cumple).length
  if (!conLlegada)
    return frase([
      [cuantas((z) => z.partida === 'FUERTE'), 'fuerte', 'fuertes'],
      [cuantas((z) => z.partida === 'EN_CAMINO'), 'en camino', 'en camino'],
      [cuantas((z) => z.partida === 'POR_TRABAJAR'), 'por trabajar', 'por trabajar'],
    ])
  const cambio = (z: (typeof zonas)[number]) => posicionZona(z.llegada!) - posicionZona(z.partida)
  return frase([
    [cuantas((z) => cambio(z) > 0), 'subió', 'subieron'],
    [cuantas((z) => cambio(z) === 0), 'se mantuvo', 'se mantuvieron'],
    [cuantas((z) => cambio(z) < 0), 'bajó', 'bajaron'],
  ])
}

export function hallazgoPagina(
  pagina: { tipoResultado?: TipoResultadoHelena; perfilPlano?: boolean; selloLlegada?: boolean },
  resultado?: HelenaResult,
): HallazgoPagina | null {
  if (!resultado) return null
  if (pagina.tipoResultado === 'COINCIDENCIAS') {
    if (pagina.perfilPlano) return { forma: 'parejo' }
    if (!resultado.areas.length) return null
    const nombres = resultado.areas.map((d) => d.name)
    return resultado.areas.every((d) => [...d.code].length === 1)
      ? { forma: 'letras', letras: resultado.areas.map((d) => d.code), nombres }
      : etiquetas(nombres)
  }
  if (pagina.tipoResultado === 'DESTACADAS')
    return resultado.destacadas?.length ? etiquetas(resultado.destacadas.map((d) => d.name)) : null
  if (pagina.tipoResultado === 'COMPARACION') {
    const zonas = resultado.zonas
    if (!zonas?.length) return null
    const conLlegada = zonas.every((z) => z.llegada)
    return {
      forma: 'zonas',
      partida: zonas.map((z) => z.partida),
      llegada: conLlegada ? zonas.map((z) => z.llegada!) : null,
      frase: fraseZonas(zonas, conLlegada),
      llegadaLista: !conLlegada && !!pagina.selloLlegada,
    }
  }
  return null
}

export function ordenarDimensiones<T extends HelenaDimension>(dimensiones: T[]): T[] {
  return [...dimensiones].sort((a, b) => b.score - a.score)
}
export function dimensionesDestacadas<T extends HelenaDimension>(dimensiones: T[]): T[] {
  const maximo = Math.max(...dimensiones.map((d) => d.score))
  return dimensiones.filter((d) => d.score === maximo)
}
export function ordenarCarreras<T extends { via: unknown[] }>(carreras: T[]): T[] {
  return [...carreras].sort((a, b) => b.via.length - a.via.length)
}
export function filtrarPorAjuste<T extends { ajuste: string }>(ocupaciones: T[], ajuste: string): T[] {
  return ajuste === 'Todas' ? ocupaciones : ocupaciones.filter((o) => o.ajuste === ajuste)
}
export function resumirResultado(
  tipoResultado: TipoResultadoHelena,
  resultado: HelenaResult,
  opciones: {
    perfilPlano?: boolean
    hayEmpate?: boolean
    ejemplos?: Record<string, string>
    puntajeVisual?: boolean
    pagina?: InstrumentPageId
  } = {},
): ResumenResultado {
  const conEjemplos = <T extends HelenaDimension>(d: T) => ({ ...d, ejemplos: d.ejemplos ?? opciones.ejemplos?.[d.code] })
  const dimensiones = (resultado.dimensiones ?? resultado.areas).map(conEjemplos)
  const coincidencias = tipoResultado === 'COINCIDENCIAS'
  const perfilPlano = coincidencias && !!opciones.perfilPlano
  const principales = perfilPlano
    ? []
    : coincidencias
      ? resultado.areas
      : (resultado.destacadas ?? dimensionesDestacadas(dimensiones))
  return {
    tipoResultado,
    pagina: opciones.pagina,
    lectura: resultado.lectura,
    mensaje: resultado.mensaje,
    guiaAbierta: !!resultado.guiaAbierta,
    puntajeVisual: !!opciones.puntajeVisual,
    dimensiones,
    ordenadas: ordenarDimensiones(dimensiones),
    protagonistas: principales.map(conEjemplos),
    perfilPlano,
    hayEmpate: !!opciones.hayEmpate,
    secciones: {
      ocupaciones: coincidencias && !perfilPlano,
      carreras: coincidencias && !perfilPlano,
      siguientesPasos: !coincidencias,
    },
  }
}
