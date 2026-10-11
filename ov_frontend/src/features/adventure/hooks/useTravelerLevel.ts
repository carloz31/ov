import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'

import { getTravelerLevel } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'

export function useTravelerLevel(adventure: AdventureState) {
  const servidor = useEstadoServidor()
  const level = modoApi
    ? getTravelerLevel(adventure, servidor.resumen.datos?.nivel_actual ?? null)
    : getTravelerLevel(adventure)
  return {
    level,
    nombre: modoApi ? servidor.resumen.datos?.cuenta.nombre : 'Alex',
    progresoCiudad: modoApi ? 'interacción que completas.' : 'llamado que atiendes.',
  }
}
