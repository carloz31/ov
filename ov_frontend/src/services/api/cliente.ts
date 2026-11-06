import { urlApi } from '@/config/env'
import type { DetalleError, RespuestaServidor } from '@/types/servidor'

// B17: cliente.ts no guarda estado de sesión; main.tsx le entrega cómo leer el token y qué hacer ante un 401.
type Acceso = { obtenerToken: () => string | null; alVencer: () => void }
let acceso: Acceso = { obtenerToken: () => null, alVencer: () => {} }
const rutaIngreso = '/sesion/ingresar'

export function configurarAcceso(siguiente: Acceso) {
  acceso = siguiente
}

// Sin token, las opciones quedan como antes de B17 (GET sin opciones y DELETE sin cabeceras).
function conToken(opciones: RequestInit | undefined): RequestInit | undefined {
  const token = acceso.obtenerToken()
  if (!token) return opciones
  return { ...opciones, headers: { ...(opciones?.headers as Record<string, string>), Authorization: `Bearer ${token}` } }
}

async function solicitar<T>(
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  ruta: string,
  cuerpo?: unknown,
  senal?: AbortSignal,
): Promise<RespuestaServidor<T>> {
  let respuesta: Response
  try {
    respuesta = await fetch(
      `${urlApi}${ruta}`,
      conToken(
        metodo === 'GET'
          ? senal && { signal: senal }
          : metodo === 'DELETE'
            ? { method: 'DELETE' }
            : {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo),
              },
      ),
    )
  } catch {
    return { tipo: 'sin_conexion' }
  }
  if (respuesta.status === 401 && ruta !== rutaIngreso) acceso.alVencer()
  if (respuesta.status === 204) return { tipo: 'ok', datos: undefined as T }
  let datos: unknown
  try {
    datos = await respuesta.json()
  } catch {
    return { tipo: 'http', estado: respuesta.status, detalle: 'Respuesta del servidor no válida.' }
  }
  if (respuesta.ok) return { tipo: 'ok', datos: datos as T }
  const detalle = datos && typeof datos === 'object' && 'detail' in datos ? datos.detail : datos
  if (respuesta.status === 409)
    return {
      tipo: 'bloqueado',
      detalle:
        typeof detalle === 'object' && detalle !== null
          ? (detalle as DetalleError)
          : { mensaje: String(detalle) },
    }
  return { tipo: 'http', estado: respuesta.status, detalle }
}

// GET: consultar un recurso sin enviar cuerpo. Con `senal`, quien la pidió puede cancelarla (una consulta
// cancelada responde como sin conexión; quien la canceló ya no la espera).
export function obtener<T>(ruta: string, senal?: AbortSignal): Promise<RespuestaServidor<T>> {
  return solicitar<T>('GET', ruta, undefined, senal)
}

// POST: crear recursos o ejecutar acciones.
export function enviar<T>(ruta: string, cuerpo: unknown): Promise<RespuestaServidor<T>> {
  return solicitar<T>('POST', ruta, cuerpo)
}

// PATCH: cambiar parcialmente un recurso existente.
export function actualizar<T>(ruta: string, cuerpo: unknown): Promise<RespuestaServidor<T>> {
  return solicitar<T>('PATCH', ruta, cuerpo)
}

// DELETE: eliminar un recurso sin enviar cuerpo.
export function eliminar<T>(ruta: string): Promise<RespuestaServidor<T>> {
  return solicitar<T>('DELETE', ruta)
}
