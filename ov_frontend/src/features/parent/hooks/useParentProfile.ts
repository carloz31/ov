import { modoApi } from '@/config/env'
import { useSesionAcceso } from '@/store/accesoStore'
import { parentProfile } from '../data/parentPortal'

// En api, el nombre es el de la cuenta con sesión; el parentesco sigue siendo de demostración (F08).
export function useParentProfile() {
  const sesion = useSesionAcceso()
  if (!modoApi) return parentProfile
  const name = sesion?.cuenta.nombre ?? ''
  return { ...parentProfile, name, firstName: name.split(' ')[0] }
}
