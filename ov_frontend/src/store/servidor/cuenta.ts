import { sesionActual } from '@/store/accesoStore'
import type { RolCuenta } from '@/types/servidor'

// B17: la cuenta activa sale de la sesión (ov.acceso.v1); ya no se elige de GET /cuentas.
function cuentaDeRol(rol: RolCuenta) {
  const cuenta = sesionActual()?.cuenta
  return cuenta?.rol === rol ? cuenta.codigo : null
}
export const cuentaActiva = () => cuentaDeRol('ESTUDIANTE')
export const cuentaApoderado = () => cuentaDeRol('APODERADO')

// Ajuste catalogo-apoderado: lo que sirve a cualquier rol (el catálogo) usa la cuenta y el rol de la sesión.
export const cuentaSesion = () => sesionActual()?.cuenta?.codigo ?? null
export const rolSesion = (): RolCuenta | null => sesionActual()?.cuenta?.rol ?? null
