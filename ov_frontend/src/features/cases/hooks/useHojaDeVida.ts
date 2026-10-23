import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { consultarOcupacion } from '@/store/servidor/catalogo'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
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

// En api, la ocupación sale del catálogo del servidor; en local, del catálogo del front.
export function useHojaDeVida(professional: ForestFireProfessional): Estado | undefined {
  const [servidor, setServidor] = useState<Estado>({ tipo: 'cargando' })
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    setServidor({ tipo: 'cargando' })
    void consultarOcupacion(professional.occupationId).then((respuesta) => {
      if (!vigente) return
      setServidor(
        respuesta.tipo === 'ok'
          ? {
              tipo: 'lista',
              hoja: {
                ocupacion: respuesta.datos.titulo,
                preparando: false,
                queHacen: respuesta.datos.descripcion ?? '',
                conocimientos: respuesta.datos.conocimientos,
                habilidades: respuesta.datos.habilidades,
              },
            }
          : { tipo: 'error', mensaje: mensajeErrorServidor(respuesta) },
      )
    })
    return () => {
      vigente = false
    }
  }, [professional.occupationId])
  if (modoApi) return servidor
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
