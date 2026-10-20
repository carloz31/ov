import { Navigate } from 'react-router'
import { useAcceso } from '@/features/auth/hooks/useAcceso'
import { appPaths, portalPorRol } from './paths'

/** `/profiles` era el selector de rol; queda como redirección al portal de la cuenta para no romper enlaces. */
export function PortalDeCuenta() {
  const { cuenta } = useAcceso()
  return <Navigate replace to={cuenta ? portalPorRol[cuenta.rol] : appPaths.login} />
}
