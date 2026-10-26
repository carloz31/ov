import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'

import { getTravelerLevel } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'

// En api, las iniciales salen del nombre de la cuenta; en local, las de la demostración.
export const inicialesViajero = (nombre?: string) =>
  modoApi ? (nombre ?? '').slice(0, 2).toUpperCase() : 'AL'

export function useTravelerLevel(adventure: AdventureState) {
  const servidor = useEstadoServidor()
  const level = modoApi
    ? getTravelerLevel(adventure, servidor.resumen.datos?.nivel_actual ?? null)
    : getTravelerLevel(adventure)
  return {
    level,
    nombre: modoApi ? servidor.resumen.datos?.cuenta.nombre : 'Alex',
    iniciales: inicialesViajero(servidor.resumen.datos?.cuenta.nombre),
  }
}
