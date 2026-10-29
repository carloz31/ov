import { useEffect, useSyncExternalStore } from 'react'
import * as apiInvestigaciones from '@/services/api/investigaciones'
import type {
  EntrevistaDetalle,
  ErrorServidor,
  FilaPublicacion,
  FiltrosEntrevistas,
  FiltrosPublicaciones,
  PublicacionDetalle,
  RespuestaServidor,
  TarjetaEntrevista,
} from '@/types/servidor'
import { consultarCuenta, consultarCuentaSesion, sesionServidor } from './sesion'

// F09 · Listas de entrevistas (del estudiante: la vista activa y las de una ocupación; de la orientadora: su tabla)
// y detalles. Como el catálogo (F06), cada espacio guarda solo su combinación de filtros, se acumula con «Mostrar
// más» y un turno descarta las respuestas viejas. Lo que cambian otras cuentas (reacciones, favoritos, destacado)
// se revalida al montar la vista: se muestra lo cargado mientras llega lo nuevo (regla 4).
export const LIMITE_ENTREVISTAS = 20
type Espacios = {
  entrevistas: TarjetaEntrevista
  ocupacion: TarjetaEntrevista
  publicaciones: FilaPublicacion
}
export type EspacioLista = keyof Espacios
type Filtros<E extends EspacioLista> = E extends 'publicaciones' ? FiltrosPublicaciones : FiltrosEntrevistas
export type ListaEntrevistas<E extends EspacioLista = EspacioLista> = {
  estado: 'cargando' | 'listo' | 'mas' | 'error'
  items: Espacios[E][]
  total: number
  favoritosLeyenda: number
  error: ErrorServidor | null
}
type Entrada = ListaEntrevistas & { llave: string; revision: number }
export type DetalleCargado<T> = {
  estado: 'cargando' | 'listo' | 'error'
  datos: T | null
  error: ErrorServidor | null
}
type Detalles = { entrevista: EntrevistaDetalle; publicacion: PublicacionDetalle }

const listas = new Map<EspacioLista, Entrada>()
const turnos = new Map<EspacioLista, number>()
const peticiones = new Map<EspacioLista, AbortController>()
const detalles = new Map<string, DetalleCargado<unknown>>()
let revision = 0
let sesionCargada = -1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
function vigente() {
  if (sesionCargada === sesionServidor()) return
  sesionCargada = sesionServidor()
  listas.clear()
  peticiones.forEach((peticion) => peticion.abort())
  peticiones.clear()
  turnos.clear()
  detalles.clear()
}
function filtrosLimpios(filtros: object) {
  const limpios: Record<string, string | boolean> = {}
  for (const [nombre, valor] of Object.entries(filtros).sort(([a], [b]) => a.localeCompare(b))) {
    const texto = typeof valor === 'string' ? valor.trim() : valor
    if (texto !== undefined && texto !== '' && texto !== false) limpios[nombre] = texto
  }
  return limpios
}
const claveLista = (filtros: object) => `${sesionServidor()}:${JSON.stringify(filtrosLimpios(filtros))}`

function pedirPagina(espacio: EspacioLista, filtros: object, desde: number, senal: AbortSignal) {
  if (espacio === 'publicaciones')
    return consultarCuentaSesion((cuenta) =>
      apiInvestigaciones.listarPublicaciones(cuenta, filtros, LIMITE_ENTREVISTAS, desde, senal),
    )
  return consultarCuenta((cuenta) =>
    apiInvestigaciones.listarEntrevistas(
      cuenta,
      filtros as FiltrosEntrevistas,
      LIMITE_ENTREVISTAS,
      desde,
      senal,
    ),
  )
}

export async function cargarListaEntrevistas<E extends EspacioLista>(
  espacio: E,
  filtros: Filtros<E>,
  mas = false,
) {
  vigente()
  const llave = claveLista(filtros)
  const actual = listas.get(espacio)
  const misma = actual?.llave === llave
  if (!mas && misma && actual.estado !== 'error' && actual.revision === revision) return
  if (mas && (!misma || actual.estado !== 'listo' || actual.items.length >= actual.total)) return
  const turno = (turnos.get(espacio) ?? 0) + 1
  turnos.set(espacio, turno)
  peticiones.get(espacio)?.abort()
  const peticion = new AbortController()
  peticiones.set(espacio, peticion)
  // Al revalidar la misma lista, se sigue mostrando lo cargado hasta que llegue la primera página.
  const previos = mas && actual ? actual.items : []
  const revalida = !mas && misma && actual.items.length > 0
  const pedida = revision
  if (mas && actual) listas.set(espacio, { ...actual, estado: 'mas', error: null })
  else if (!revalida)
    listas.set(espacio, {
      estado: 'cargando',
      items: [],
      total: 0,
      favoritosLeyenda: 0,
      error: null,
      llave,
      revision,
    })
  avisar()
  const respuesta = await pedirPagina(espacio, filtrosLimpios(filtros), previos.length, peticion.signal)
  if (turnos.get(espacio) !== turno) return
  peticiones.delete(espacio)
  const base = listas.get(espacio)!
  listas.set(
    espacio,
    respuesta.tipo === 'ok'
      ? {
          estado: 'listo',
          items: [...previos, ...respuesta.datos.items],
          total: respuesta.datos.total,
          favoritosLeyenda: respuesta.datos.favoritos_leyenda,
          error: null,
          llave,
          revision: pedida,
        }
      : { ...base, estado: 'error', error: respuesta, llave, revision: pedida },
  )
  avisar()
}

export function reintentarListaEntrevistas<E extends EspacioLista>(espacio: E, filtros: Filtros<E>) {
  const actual = listas.get(espacio)
  if (actual?.estado !== 'error' || actual.llave !== claveLista(filtros)) return
  if (!actual.items.length) return cargarListaEntrevistas(espacio, filtros)
  listas.set(espacio, { ...actual, estado: 'listo' })
  return cargarListaEntrevistas(espacio, filtros, true)
}

// La lista del espacio con sus filtros, pedida mientras `activa`; con otros filtros en camino, `undefined`. Se
// revalida al montar y cada vez que una acción la vence.
export function useListaEntrevistas<E extends EspacioLista>(
  espacio: E,
  filtros: Filtros<E>,
  activa: boolean,
) {
  const llave = claveLista(filtros)
  const entrada = useSyncExternalStore(suscribir, () => listas.get(espacio))
  const actual = useSyncExternalStore(suscribir, () => revision)
  const lista = entrada?.llave === llave ? (entrada as unknown as ListaEntrevistas<E>) : undefined
  useEffect(() => {
    if (activa)
      void cargarListaEntrevistas(espacio, JSON.parse(llave.slice(llave.indexOf('{'))) as Filtros<E>)
  }, [activa, espacio, llave, actual])
  useEffect(() => {
    // Solo al montar, si ya estaba cargada: lo que cambiaron otras cuentas.
    if (activa && listas.get(espacio)?.llave === claveLista(filtros)) vencerEntrevistas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, espacio])
  return lista
}

// Una acción vence todo lo cargado: las listas y los detalles montados se vuelven a pedir, conservando lo que
// muestran; los demás, al montarse.
export function vencerEntrevistas() {
  revision++
  avisar()
}

// Cambios confirmados sobre una entrevista (vista, favorito) se aplican a lo cargado sin volver a pedirlo.
export function actualizarEntrevista(
  codigo: string,
  cambio: (t: TarjetaEntrevista) => Partial<TarjetaEntrevista>,
) {
  for (const espacio of ['entrevistas', 'ocupacion'] as const) {
    const lista = listas.get(espacio)
    if (!lista) continue
    const items = (lista.items as TarjetaEntrevista[]).map((t) =>
      t.codigo === codigo ? { ...t, ...cambio(t) } : t,
    )
    listas.set(espacio, { ...lista, items })
  }
  const detalle = detalles.get(`entrevista:${codigo}`) as DetalleCargado<EntrevistaDetalle> | undefined
  if (detalle?.datos)
    detalles.set(`entrevista:${codigo}`, {
      ...detalle,
      datos: { ...detalle.datos, ...cambio(detalle.datos) },
    })
  avisar()
}

function pedirDetalle<C extends keyof Detalles>(
  clase: C,
  codigo: string,
): Promise<RespuestaServidor<Detalles[C]>> {
  if (clase === 'publicacion')
    return consultarCuentaSesion((cuenta) =>
      apiInvestigaciones.obtenerPublicacion(cuenta, codigo),
    ) as Promise<RespuestaServidor<Detalles[C]>>
  return consultarCuenta((cuenta) => apiInvestigaciones.obtenerEntrevista(cuenta, codigo)) as Promise<
    RespuestaServidor<Detalles[C]>
  >
}

// El detalle se pide al abrirlo y cada vez que se vuelve a montar; mientras, se ve el ya cargado.
export function cargarDetalleEntrevista<C extends keyof Detalles>(clase: C, codigo: string) {
  vigente()
  const llave = `${clase}:${codigo}`
  const actual = detalles.get(llave)
  detalles.set(
    llave,
    actual?.datos ? { ...actual, error: null } : { estado: 'cargando', datos: null, error: null },
  )
  avisar()
  const sesion = sesionServidor()
  return pedirDetalle(clase, codigo).then((respuesta) => {
    if (sesion !== sesionServidor()) return respuesta
    detalles.set(
      llave,
      respuesta.tipo === 'ok'
        ? { estado: 'listo', datos: respuesta.datos, error: null }
        : { estado: 'error', datos: actual?.datos ?? null, error: respuesta },
    )
    avisar()
    return respuesta
  })
}

export function useDetalleEntrevista<C extends keyof Detalles>(clase: C, codigo: string | undefined) {
  const detalle = useSyncExternalStore(suscribir, () =>
    codigo && sesionCargada === sesionServidor() ? detalles.get(`${clase}:${codigo}`) : undefined,
  ) as DetalleCargado<Detalles[C]> | undefined
  const actual = useSyncExternalStore(suscribir, () => revision)
  useEffect(() => {
    if (codigo) void cargarDetalleEntrevista(clase, codigo)
  }, [clase, codigo, actual])
  return detalle
}

// F09: cuántas publicaciones de sus salones tienen reportes pendientes (el filtro «Con reportes · N»).
export async function contarConReportes() {
  const respuesta = await consultarCuentaSesion((cuenta) =>
    apiInvestigaciones.listarPublicaciones(cuenta, { con_reportes: true }, 1, 0),
  )
  return respuesta.tipo === 'ok' ? respuesta.datos.total : null
}
// La revisión de lo cargado: cambia cada vez que una acción lo vence.
export const useRevisionEntrevistas = () => useSyncExternalStore(suscribir, () => revision)
