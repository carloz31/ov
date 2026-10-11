import { desarrollo } from '@/config/env'
import { cuentaActiva } from './cuenta'
import { sesionServidor } from './sesion'

let sesion = ''
const avisados = new Set<string>()
export function avisarContenidoFaltante(codigo: string, clave: string) {
  if (!desarrollo) return
  const actual = `${cuentaActiva()}/${sesionServidor()}`
  if (sesion !== actual) {
    sesion = actual
    avisados.clear()
  }
  if (avisados.has(codigo)) return
  avisados.add(codigo)
  console.warn(`Actividad sin contenido: ${codigo} → ${clave}`)
}
