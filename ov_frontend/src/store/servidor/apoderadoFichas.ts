import { useEffect, useSyncExternalStore } from 'react'
import { modoApi } from '@/config/env'
import * as apiAcciones from '@/services/api/acciones'
import { obtenerFicha, obtenerFichas } from '@/services/api/fichas'
import { obtenerEstadoApoderado } from './apoderado'
import type { Seccion } from './sesion'
import type { ErrorServidor, FichaCuenta, FichaDetalle } from '@/types/servidor'

// F08: las fichas del apoderado en Mis actividades. La lista trae solo lo del chip (código, título, si es nueva y
// la actividad que la da); el contenido se pide al pulsar el chip. Abrir la ficha registra VISTA_FICHA.
export type DetalleFichaApoderado = {
  estado: 'cargando' | 'listo' | 'error'
  datos: FichaDetalle | null
  error: ErrorServidor | null
}
type AlmacenFichasApoderado = {
  cuenta: string | null
  lista: Seccion<FichaCuenta[]>
  detalles: Record<string, DetalleFichaApoderado>
}
const inicial = (): AlmacenFichasApoderado => ({
  cuenta: null,
  lista: { datos: null, estado: 'sin_cargar', error: null },
  detalles: {},
})
let estado = inicial()
let revision = 0
const oyentes = new Set<() => void>()
function publicar(cambios: Partial<AlmacenFichasApoderado>) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
const useAlmacen = () =>
  useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => estado,
  )

// La cuenta del portal; si cambió la sesión, se descarta lo cargado.
function cuentaVigente() {
  const cuenta = obtenerEstadoApoderado().cuenta
  if (cuenta !== estado.cuenta) {
    revision++
    estado = { ...inicial(), cuenta }
  }
  return cuenta
}

// Se pide cada vez que se monta Mis actividades: completar una actividad (en otra vista) puede dar fichas.
export async function cargarFichasApoderado() {
  const cuenta = cuentaVigente()
  if (!modoApi || !cuenta) return
  const actual = ++revision
  publicar({ lista: { ...estado.lista, estado: estado.lista.datos ? 'vencido' : 'cargando', error: null } })
  const respuesta = await obtenerFichas(cuenta)
  if (actual !== revision) return
  publicar({
    lista:
      respuesta.tipo === 'ok'
        ? { datos: respuesta.datos, estado: 'listo', error: null }
        : { ...estado.lista, estado: 'error', error: respuesta },
  })
}

export function cargarFichaApoderado(codigo: string) {
  const cuenta = cuentaVigente()
  if (!modoApi || !cuenta) return
  const previo = estado.detalles[codigo]
  if (previo && previo.estado !== 'error') return
  const guardar = (detalle: DetalleFichaApoderado) =>
    publicar({ detalles: { ...estado.detalles, [codigo]: detalle } })
  guardar({ estado: 'cargando', datos: null, error: null })
  void obtenerFicha(cuenta, codigo).then((respuesta) => {
    if (cuenta !== estado.cuenta) return
    guardar(
      respuesta.tipo === 'ok'
        ? { estado: 'listo', datos: respuesta.datos, error: null }
        : { estado: 'error', datos: null, error: respuesta },
    )
  })
}

// Abrir la ficha: se pide su contenido y, si era nueva, se registra la vista (deja de ser «Nueva»).
export async function abrirFichaApoderado(codigo: string) {
  cargarFichaApoderado(codigo)
  const cuenta = estado.cuenta
  const ficha = estado.lista.datos?.find((f) => f.codigo === codigo)
  if (!modoApi || !cuenta || !ficha || ficha.visto) return
  const respuesta = await apiAcciones.verFicha(cuenta, codigo)
  if (respuesta.tipo !== 'ok' || !estado.lista.datos || cuenta !== estado.cuenta) return
  publicar({
    lista: {
      ...estado.lista,
      datos: estado.lista.datos.map((f) => (f.codigo === codigo ? { ...f, visto: true } : f)),
    },
  })
}

export const obtenerFichasApoderado = () => estado

export function useFichasApoderado(activo = true) {
  const almacen = useAlmacen()
  useEffect(() => {
    if (activo) void cargarFichasApoderado()
  }, [activo])
  return almacen
}
