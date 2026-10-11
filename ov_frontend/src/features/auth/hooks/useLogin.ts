import { useNavigate } from 'react-router'

import { useDemoAccess, startDemoAccess } from '@/features/auth/lib/demoAccess'
import { appPaths } from '@/routes/paths'
import { modoApi } from '@/config/env'
import { guardarUsuarioIngreso } from '@/store/servidor/cuenta'
import { prepararIngreso } from '@/store/servidor/operaciones'

export function useLogin() {
  const navigate = useNavigate()
  const active = useDemoAccess()
  function enter(usuario: string) {
    if (modoApi) {
      guardarUsuarioIngreso(usuario)
      prepararIngreso()
    }
    startDemoAccess()
    navigate(appPaths.roleSelection, { replace: true })
  }
  return { active, enter }
}
