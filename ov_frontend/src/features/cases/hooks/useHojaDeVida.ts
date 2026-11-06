import { modoApi } from '@/config/env'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import type { ForestFireProfessional } from '@/types/cases'

export type HojaDeVida = {
  ocupacion: string
  // Local: la etiqueta del catálogo del front para fichas pendientes.
  preparando: boolean
  queHacen: string
  conocimientos: string[]
  habilidades: string[]
}
type Estado = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'lista'; hoja: HojaDeVida }

// En api, la ocupación viene con el caso (ajuste carga-casos: `ocupaciones-caso`, pedida una vez al entrar); en
// local, del catálogo del front.
export function useHojaDeVida(professional: ForestFireProfessional): Estado | undefined {
  if (modoApi)
    return {
      tipo: 'lista',
      hoja: {
        ocupacion: professional.name,
        preparando: false,
        queHacen: professional.description,
        conocimientos: professional.knowledge ?? [],
        habilidades: professional.skills,
      },
    }
  const occupation = getOccupation(professional.occupationId)
  return occupation
    ? {
        tipo: 'lista',
        hoja: {
          ocupacion: occupation.name,
          preparando: occupation.contentStatus === 'pending',
          queHacen: occupation.whatTheyDo,
          conocimientos: occupation.knowledge,
          habilidades: occupation.skills,
        },
      }
    : undefined
}
