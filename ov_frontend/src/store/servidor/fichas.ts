import { useEffect, useSyncExternalStore } from 'react'
import * as apiAcciones from '@/services/api/acciones'
import { obtenerFicha } from '@/services/api/fichas'
import type { ErrorServidor, FichaCuenta, FichaDetalle } from '@/types/servidor'
import { consultarCuenta, obtenerEstadoServidor, publicar, sesionServidor } from './sesion'

// Ajuste mochila: una acción confirmada sobre una ficha (vista, favorita) se aplica a las fichas ya cargadas,
// sin volver a pedirlas: la respuesta 200 del servidor basta.
export function actualizarFicha(codigo: string, cambios: Partial<FichaCuenta>) {
  const fichas = obtenerEstadoServidor().fichas
  if (!fichas.datos) return
  publicar({ fichas: { ...fichas, datos: fichas.datos.map((f) => (f.codigo === codigo ? { ...f, ...cambios } : f)) } })
}

// El modal de ficha registra VISTA_FICHA al abrirse; con la respuesta, la ficha deja de ser «Nueva». Quien la
// llama no espera la respuesta.
export async function verFicha(ficha: string) {
  const respuesta = await consultarCuenta((cuenta) => apiAcciones.verFicha(cuenta, ficha))
  if (respuesta.tipo === 'ok') actualizarFicha(ficha, { visto: true })
  return respuesta
}

// El contenido de cada ficha se pide al abrir el modal, una sola vez por sesión de cuenta: el texto de una
// ficha no cambia. Un pedido en curso se comparte; un error se puede reintentar.
type DetalleFicha = { estado: 'cargando' | 'listo' | 'error'; datos: FichaDetalle | null; error: ErrorServidor | null }
const detalles = new Map<string, DetalleFicha>()
const oyentes = new Set<() => void>()
const clave = (codigo: string) => `${sesionServidor()}:${codigo}`
function guardar(llave: string, detalle: DetalleFicha) {
  detalles.set(llave, detalle)
  oyentes.forEach((oyente) => oyente())
}
export function cargarFicha(codigo: string) {
  const llave = clave(codigo)
  const actual = detalles.get(llave)
  if (actual && actual.estado !== 'error') return
  guardar(llave, { estado: 'cargando', datos: null, error: null })
  void consultarCuenta((cuenta) => obtenerFicha(cuenta, codigo)).then((respuesta) =>
    guardar(
      llave,
      respuesta.tipo === 'ok'
        ? { estado: 'listo', datos: respuesta.datos, error: null }
        : { estado: 'error', datos: null, error: respuesta },
    ),
  )
}
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
// El detalle de una ficha, pedido al montar con `codigo` (sin código, nada).
export function useFichaDetalle(codigo: string | undefined): DetalleFicha | undefined {
  const detalle = useSyncExternalStore(suscribir, () => (codigo ? detalles.get(clave(codigo)) : undefined))
  useEffect(() => {
    if (codigo) cargarFicha(codigo)
  }, [codigo])
  return detalle
}
