import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import {
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
  getForestFireCaseStatus,
} from '@/features/cases/lib/forestFireCaseLogic'
import { progresoCaso, type ProgresoCaso } from '@/lib/servidor/adaptadoresCasos'
import { marcarCargaDrawer } from '@/store/cargaDrawerStore'
import { consultarCasos } from '@/store/servidor/casos'
import type { AdventureState } from '@/types/adventure'
import type { CasoCuenta } from '@/types/servidor'

// Bloque del caso en el drawer: en api, umbral, máximo y mejor puntaje de `GET casos` (ajustes Central, 6);
// en local, el caso forest-fire del estado local, como antes.
export function useProgresoCaso(
  adventure: Pick<AdventureState, 'solvedCaseIds' | 'caseBestScores'>,
  actividad?: string,
): ProgresoCaso | undefined {
  const [caso, setCaso] = useState<CasoCuenta>()
  useEffect(() => {
    if (!modoApi || !actividad) return
    let vigente = true
    const clave = `caso/${actividad}`
    marcarCargaDrawer(clave, true)
    void consultarCasos().then((respuesta) => {
      if (!vigente) return
      marcarCargaDrawer(clave, false)
      if (respuesta.tipo === 'ok') setCaso(respuesta.datos.find((c) => c.actividad === actividad))
    })
    return () => {
      vigente = false
      marcarCargaDrawer(clave, false)
    }
  }, [actividad])
  if (modoApi) return caso ? progresoCaso(caso) : undefined
  const { score, passed } = getForestFireCaseStatus(adventure)
  return {
    minimo: FOREST_FIRE_PASS_SCORE,
    maximo: FOREST_FIRE_MAX_SATISFACTION,
    mejor: score,
    superado: passed,
    invitaReintento: false,
  }
}
