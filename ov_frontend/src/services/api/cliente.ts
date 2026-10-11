import { urlApi } from '@/config/env'
import type { DetalleError, RespuestaServidor } from '@/types/servidor'

async function solicitar<T>(
  metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  ruta: string,
  cuerpo?: unknown,
): Promise<RespuestaServidor<T>> {
  let respuesta: Response
  try {
    respuesta = await fetch(
      `${urlApi}${ruta}`,
      metodo === 'GET'
        ? undefined
        : metodo === 'DELETE'
          ? { method: 'DELETE' }
          : {
              method: metodo,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cuerpo),
            },
    )
  } catch {
    return { tipo: 'sin_conexion' }
  }
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

// GET: consultar un recurso sin enviar cuerpo.
export function obtener<T>(ruta: string): Promise<RespuestaServidor<T>> {
  return solicitar<T>('GET', ruta)
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
