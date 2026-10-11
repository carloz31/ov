import type { HelenaDimension, HelenaPage, HelenaResult, TipoResultadoHelena } from '@/types/profile'
import type { ResumenPagina, ResumenResultado } from '../types'

export function resumenPagina(
  page: Pick<HelenaPage, 'state' | 'perfilPlano'> & { tipoResultado?: TipoResultadoHelena },
  resultado?: HelenaResult & { coincidencias?: unknown[] | null; carreras_recomendadas?: unknown[] | null },
): ResumenPagina {
  const vacio: ResumenPagina = { rotulo: '', filas: [], cierre: '', contenidos: [] }
  if (page.state !== 'revealed' || !page.tipoResultado || !resultado) return vacio
  const intereses = page.tipoResultado === 'COINCIDENCIAS'
  const cantidad = (resultado.dimensiones ?? resultado.areas).length
  const contenidos: ResumenPagina['contenidos'] = [
    {
      icono: 'perfil',
      texto: intereses
        ? `Tu perfil en los ${cantidad} tipos de interés`
        : `Tu perfil en las ${cantidad} inteligencias`,
    },
  ]
  if (intereses && page.perfilPlano)
    return {
      rotulo: 'Tu código de interés',
      filas: [],
      titulo: 'Tus respuestas no marcaron un interés por encima de otro',
      cierre:
        'Respondiste de forma muy parecida a todos los tipos de actividad. Revisa tus encuentros con Mara pensando en lo que de verdad disfrutas.',
      contenidos,
    }
  const principales = intereses ? resultado.areas : (resultado.destacadas ?? resultado.areas)
  if (intereses) {
    if (resultado.coincidencias?.length)
      contenidos.push({ icono: 'ocupaciones', texto: `${resultado.coincidencias.length} ocupaciones afines` })
    if (resultado.carreras_recomendadas?.length)
      contenidos.push({
        icono: 'carreras',
        texto: `${resultado.carreras_recomendadas.length} carreras que conducen a ellas`,
      })
  } else contenidos.push({ icono: 'ideas', texto: 'Ideas para aprovecharlo con tu familia y tu diario' })
  return {
    rotulo: intereses
      ? `Tu código de interés · ${principales.map((d) => d.code).join('')}`
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
      : principales.length === 1
        ? 'Es la que más usas hoy para aprender y resolver. Todas se pueden desarrollar.'
        : 'Destacan por igual. Ninguna es mejor que otra: describen cómo te gusta aprender y resolver.',
    contenidos,
  }
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
  opciones: { perfilPlano?: boolean; hayEmpate?: boolean; ejemplos?: Record<string, string> } = {},
): ResumenResultado {
  const dimensiones = (resultado.dimensiones ?? resultado.areas).map((d) => ({
    ...d,
    ejemplos: opciones.ejemplos?.[d.code],
  }))
  const coincidencias = tipoResultado === 'COINCIDENCIAS'
  const perfilPlano = coincidencias && !!opciones.perfilPlano
  const principales = perfilPlano
    ? []
    : coincidencias
      ? resultado.areas
      : (resultado.destacadas ?? dimensionesDestacadas(dimensiones))
  return {
    tipoResultado,
    dimensiones,
    ordenadas: ordenarDimensiones(dimensiones),
    protagonistas: principales.map((d) => ({ ...d, ejemplos: opciones.ejemplos?.[d.code] })),
    perfilPlano,
    hayEmpate: !!opciones.hayEmpate,
    secciones: {
      ocupaciones: coincidencias && !perfilPlano,
      carreras: coincidencias && !perfilPlano,
      siguientesPasos: !coincidencias,
    },
  }
}
