import { useEffect } from 'react'

import { modoApi } from '@/config/env'
import { areasRiasec } from '@/lib/servidor/adaptadores'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { catalog, tipActivityIds } from '@/data/activities/content'
import { calculateResult, applyCompletion } from '@/lib/activities/logic'
import type { Actividad } from '@/types/activities'
import { updateJourney, useJourney } from '@/store/journeyStore'

export function useInstrumentResult(activity: Actividad, instrumentId: string) {
  const state = useJourney()
  const servidor = useEstadoServidor()
  const instrument = catalog.instrumentos.find((item) => item.id === instrumentId)
  const result = state.results.find((result) => result.instrumentoId === instrumentId)
  useEffect(() => {
    if (modoApi || !instrument || result) return
    const calculated = calculateResult(instrument, state, tipActivityIds)
    if (calculated)
      updateJourney((current) =>
        applyCompletion(activity, { ...current, results: [...current.results, calculated] }),
      )
  }, [activity, instrument, result, state])

  return {
    instrument,
    result,
    resultado: modoApi
      ? {
          error:
            servidor.estadoResultado === 'error' ? mensajeErrorServidor(servidor.errorResultado) : undefined,
          datos: servidor.resultadoRiasec,
          areas: servidor.resultadoRiasec ? areasRiasec(servidor.resultadoRiasec) : [],
          reintentar: cargarResultadoRiasec,
        }
      : undefined,
  }
}
