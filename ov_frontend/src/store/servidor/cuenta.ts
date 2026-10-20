import { sesionActual } from '@/store/accesoStore'
import type { RolCuenta } from '@/types/servidor'

// B17: la cuenta activa sale de la sesión (ov.acceso.v1); ya no se elige de GET /cuentas.
function cuentaDeRol(rol: RolCuenta) {
  const cuenta = sesionActual()?.cuenta
  return cuenta?.rol === rol ? cuenta.codigo : null
}
export const cuentaActiva = () => cuentaDeRol('ESTUDIANTE')
export const cuentaApoderado = () => cuentaDeRol('APODERADO')
