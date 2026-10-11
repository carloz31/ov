import { ocupacionesResultadoServidor } from '@/lib/servidor/adaptadores'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { ResultadoPublico } from '@/types/servidor'
import type { InstrumentPageId } from '@/types/discovery'
import type { CarreraResultado, OcupacionResultado } from '../types'
import { careerCatalog } from '@/data/catalog/careersAndInstitutions'
import { careerDetails, occupationDetails } from './catalogDetails'
import { getFamily, isAffine } from './catalogSelectors'

export function ocupacionesResultado(
  resultado: ResultadoPublico | undefined,
  api: boolean,
  reveladas: InstrumentPageId[],
  letras: string[],
  favoritas: string[],
): OcupacionResultado[] {
  const afines = api
    ? ocupacionesResultadoServidor(resultado ?? null)
    : occupationDetails.flatMap((o) => {
        const ajuste = isAffine(o.id, reveladas)
        return ajuste ? [{ clave: o.onetCode, codigo: o.id, titulo: o.name, ajuste }] : []
      })
  return afines.slice(0, 10).map((o) => {
    const catalogo = occupationDetails.find((c) => c.id === o.codigo)
    return {
      ...o,
      favorita: !!o.codigo && favoritas.includes(o.codigo),
      descripcion: catalogo?.contentStatus !== 'pending' ? catalogo?.whatTheyDo : undefined,
      letras: catalogo?.highPoints,
      compartidas: catalogo?.highPoints.filter((l) => letras.includes(l)).length,
      href: catalogo ? discoveryPaths.occupation(catalogo.id) : undefined,
    }
  })
}

export function carrerasResultado(
  resultado: ResultadoPublico | undefined,
  api: boolean,
  ocupaciones: OcupacionResultado[],
): Omit<CarreraResultado, 'favorita' | 'plan'>[] {
  if (api)
    return (resultado?.carreras_recomendadas ?? []).map((c) => ({
      ...c,
      duracion: careerCatalog.find((entrada) => entrada.id === c.codigo)?.duration,
      familia: getFamily(c.familia)?.name ?? c.familia,
    }))
  return careerDetails.flatMap((c) => {
    const via = ocupaciones
      .filter((o) => o.codigo && c.occupationIds.includes(o.codigo))
      .map((o) => ({ codigo_onet: o.clave, titulo: o.titulo }))
    return via.length
      ? [
          {
            codigo: c.id,
            nombre: c.name,
            duracion: careerCatalog.find((entrada) => entrada.id === c.id)?.duration,
            familia: getFamily(c.familyId)?.name ?? c.familyId,
            via,
          },
        ]
      : []
  })
}
