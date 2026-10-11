import type { CuentaResumen } from '@/types/servidor'

const clave = 'ov.cuenta-servidor.v1'
type Sesion = { usuario: string; codigo: string | null }
let sesion: Sesion = leer()
function leer(): Sesion {
  try {
    const valor = JSON.parse(sessionStorage.getItem(clave) ?? 'null')
    if (typeof valor?.usuario === 'string' && (valor.codigo === null || typeof valor.codigo === 'string'))
      return valor
  } catch {
    /* El acceso de demostración puede abrirse sin almacenamiento. */
  }
  return { usuario: '', codigo: null }
}
function guardar() {
  try {
    sessionStorage.setItem(clave, JSON.stringify(sesion))
  } catch {
    /* Se conserva en esta sesión en memoria. */
  }
}
export function guardarUsuarioIngreso(usuario: string) {
  sesion = { usuario: usuario.trim(), codigo: null }
  guardar()
}
export function seleccionarCuenta(cuentas: CuentaResumen[]) {
  const codigo =
    cuentas.find((c) => c.rol === 'ESTUDIANTE' && c.codigo === sesion.usuario)?.codigo ?? 'est-ana'
  sesion = { ...sesion, codigo }
  guardar()
  return codigo
}
export const cuentaActiva = () => sesion.codigo
export const usuarioIngreso = () => sesion.usuario
