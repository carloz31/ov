import { modoApi } from '@/config/env'
import { useSesionAcceso } from '@/store/accesoStore'
import { counselorProfile } from '../data/counselorPortal'

// En api, el nombre es el de la cuenta con sesión; la sesión no trae correo. En local, el perfil de demostración.
export function useCounselorProfile() {
  const sesion = useSesionAcceso()
  if (!modoApi) return counselorProfile
  return { ...counselorProfile, name: sesion?.cuenta.nombre ?? '', email: '' }
}
