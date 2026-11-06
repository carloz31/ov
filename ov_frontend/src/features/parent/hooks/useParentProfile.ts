import { modoApi } from '@/config/env'
import { datosSesion, useSesionAcceso } from '@/store/accesoStore'
import { parentProfile } from '../data/parentPortal'

const capital = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// En api, el nombre es el de la cuenta con sesión y el parentesco, el del primer vínculo de `GET /sesion` (F08).
export function useParentProfile() {
  const sesion = useSesionAcceso()
  if (!modoApi) return parentProfile
  const name = sesion?.cuenta.nombre ?? ''
  const parentesco = datosSesion().hijos[0]?.parentesco
  return {
    ...parentProfile,
    name,
    firstName: name.split(' ')[0],
    relationship: parentesco ? capital(parentesco) : 'Apoderado',
  }
}
