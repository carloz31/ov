import { useEffect, useSyncExternalStore } from 'react'
import * as apiAcciones from '@/services/api/acciones'
import * as apiCatalogo from '@/services/api/catalogo'
import type { ClaseCatalogo, DetalleCatalogo, FiltrosCatalogo, ResumenCatalogo } from '@/services/api/catalogo'
import type { ErrorServidor, FamiliaPublica, UbicacionPublica } from '@/types/servidor'
import { accionConRefresco } from './refresco'
import { consultarCuenta, sesionServidor } from './sesion'

export type { ClaseCatalogo, FiltrosCatalogo } from '@/services/api/catalogo'
export const LIMITE_CATALOGO = 20

// La hoja de vida de la Central pide su ocupación al abrirse.
export function consultarOcupacion(codigo: string) {
  return consultarCuenta((cuenta) => apiCatalogo.obtenerOcupacion(cuenta, codigo))
}

// F06 · Listas del catálogo: una por clase y filtros, pedida al mostrarse y acumulada con «Mostrar más». Cada
// combinación de filtros tiene su propia entrada, así que la respuesta de «psi» nunca pisa la de «psico»; dentro
// de una entrada, solo cuenta la última petición.
export type ListaCatalogo<C extends ClaseCatalogo = ClaseCatalogo> = {
  estado: 'cargando' | 'listo' | 'mas' | 'error'
  items: ResumenCatalogo[C][]
  total: number
  error: ErrorServidor | null
}
type Detalle<C extends ClaseCatalogo = ClaseCatalogo> = {
  estado: 'cargando' | 'listo' | 'error'
  datos: DetalleCatalogo[C] | null
  error: ErrorServidor | null
}
type Opciones = { familias: FamiliaPublica[]; ubicaciones: UbicacionPublica[] } | null

const listas = new Map<string, ListaCatalogo>()
const turnos = new Map<string, number>()
const detalles = new Map<string, Detalle>()
const opciones = new Map<number, Opciones>()
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function filtrosLimpios(filtros: FiltrosCatalogo): FiltrosCatalogo {
  const limpios: Record<string, string | boolean> = {}
  for (const nombre of Object.keys(filtros).sort()) {
    const valor = filtros[nombre as keyof FiltrosCatalogo]
    const texto = typeof valor === 'string' ? valor.trim() : valor
    if (texto !== undefined && texto !== '' && texto !== false) limpios[nombre] = texto
  }
  return limpios
}
const claveLista = (clase: ClaseCatalogo, filtros: FiltrosCatalogo) =>
  `${sesionServidor()}:${clase}:${JSON.stringify(filtrosLimpios(filtros))}`
const claveDetalle = (clase: ClaseCatalogo, codigo: string) => `${sesionServidor()}:${clase}:${codigo}`

export async function cargarLista(clase: ClaseCatalogo, filtros: FiltrosCatalogo, mas = false) {
  const llave = claveLista(clase, filtros)
  const actual = listas.get(llave)
  if (!mas && actual && actual.estado !== 'error') return
  if (mas && (!actual || actual.estado === 'cargando' || actual.estado === 'mas' || actual.items.length >= actual.total))
    return
  const turno = (turnos.get(llave) ?? 0) + 1
  turnos.set(llave, turno)
  const previos = mas && actual ? actual.items : []
  listas.set(llave, mas && actual ? { ...actual, estado: 'mas', error: null } : vacia('cargando'))
  avisar()
  const respuesta = await consultarCuenta((cuenta) =>
    apiCatalogo.buscarCatalogo(cuenta, clase, filtrosLimpios(filtros), LIMITE_CATALOGO, previos.length),
  )
  if (turnos.get(llave) !== turno) return
  listas.set(
    llave,
    respuesta.tipo === 'ok'
      ? { estado: 'listo', items: [...previos, ...respuesta.datos.items], total: respuesta.datos.total, error: null }
      : { estado: 'error', items: previos, total: actual?.total ?? 0, error: respuesta },
  )
  avisar()
}
const vacia = (estado: ListaCatalogo['estado']): ListaCatalogo => ({ estado, items: [], total: 0, error: null })

// Tras un error, reintenta lo que faltó: la primera página o la siguiente.
export function reintentarLista(clase: ClaseCatalogo, filtros: FiltrosCatalogo) {
  const actual = listas.get(claveLista(clase, filtros))
  if (actual?.estado !== 'error') return
  if (!actual.items.length) return cargarLista(clase, filtros)
  listas.set(claveLista(clase, filtros), { ...actual, estado: 'listo' })
  return cargarLista(clase, filtros, true)
}

// La lista de una clase con sus filtros, pedida mientras `activa` (la pestaña a la vista).
export function useListaCatalogo<C extends ClaseCatalogo>(
  clase: C,
  filtros: FiltrosCatalogo,
  activa: boolean,
): ListaCatalogo<C> | undefined {
  const llave = claveLista(clase, filtros)
  const lista = useSyncExternalStore(suscribir, () => listas.get(llave)) as ListaCatalogo<C> | undefined
  useEffect(() => {
    // `llave` resume los filtros (limpios), así que el efecto no depende de la identidad del objeto.
    if (activa && !lista) void cargarLista(clase, JSON.parse(llave.slice(llave.indexOf('{'))) as FiltrosCatalogo)
  }, [activa, clase, llave, lista])
  return lista
}

// El detalle se pide al abrirlo y se guarda por código; un error se puede reintentar.
export function cargarDetalle(clase: ClaseCatalogo, codigo: string, reintentar = false) {
  const llave = claveDetalle(clase, codigo)
  const actual = detalles.get(llave)
  if (actual && (actual.estado !== 'error' || !reintentar)) return
  detalles.set(llave, { estado: 'cargando', datos: null, error: null })
  avisar()
  void consultarCuenta((cuenta) => apiCatalogo.obtenerDetalleCatalogo(cuenta, clase, codigo)).then((respuesta) => {
    detalles.set(
      llave,
      respuesta.tipo === 'ok'
        ? { estado: 'listo', datos: respuesta.datos, error: null }
        : { estado: 'error', datos: null, error: respuesta },
    )
    avisar()
  })
}

export function useDetalleCatalogo<C extends ClaseCatalogo>(clase: C, codigo: string | undefined) {
  const detalle = useSyncExternalStore(suscribir, () =>
    codigo ? detalles.get(claveDetalle(clase, codigo)) : undefined,
  ) as Detalle<C> | undefined
  useEffect(() => {
    if (codigo) cargarDetalle(clase, codigo)
  }, [clase, codigo])
  return detalle
}

// Familias y ubicaciones de los filtros: una vez por sesión de cuenta.
let opcionesEnCurso: number | null = null
export function useOpcionesCatalogo(activas: boolean): Opciones {
  const sesion = sesionServidor()
  const actuales = useSyncExternalStore(suscribir, () => opciones.get(sesion) ?? null)
  useEffect(() => {
    if (!activas || opciones.has(sesion) || opcionesEnCurso === sesion) return
    opcionesEnCurso = sesion
    void Promise.all([
      consultarCuenta(apiCatalogo.obtenerFamilias),
      consultarCuenta(apiCatalogo.obtenerUbicaciones),
    ]).then(([familias, ubicaciones]) => {
      opcionesEnCurso = null
      if (familias.tipo !== 'ok' || ubicaciones.tipo !== 'ok') return
      opciones.set(sesion, { familias: familias.datos, ubicaciones: ubicaciones.datos })
      avisar()
    })
  }, [activas, sesion])
  return actuales
}

// Una acción de favorito confirmada se aplica a lo cargado: listas, detalles y lo que cada detalle lista.
// Las listas filtradas por favoritos de esa clase se descartan: se vuelven a pedir al mostrarse.
export function actualizarFavoritoCatalogo(clase: ClaseCatalogo, codigo: string, es_favorita: boolean) {
  const marcar = <T extends { codigo: string; es_favorita: boolean }>(items: T[]) =>
    items.map((item) => (item.codigo === codigo ? { ...item, es_favorita } : item))
  for (const [llave, lista] of listas) {
    if (llave.includes(`:${clase}:`) && llave.includes('"favoritos":true')) listas.delete(llave)
    else if (llave.includes(`:${clase}:`)) listas.set(llave, { ...lista, items: marcar(lista.items) })
  }
  for (const [llave, detalle] of detalles) {
    if (!detalle.datos) continue
    let datos = detalle.datos as DetalleCatalogo[ClaseCatalogo] & Partial<Record<ClaseCatalogo, unknown>>
    if (llave.endsWith(`:${clase}:${codigo}`)) datos = { ...datos, es_favorita }
    const anidados = datos[clase]
    if (Array.isArray(anidados)) datos = { ...datos, [clase]: marcar(anidados) }
    detalles.set(llave, { ...detalle, datos })
  }
  avisar()
}

// HU-042: el servidor elige la carrera u ocupación; es una lectura que no se guarda.
export function pedirInesperada(clase: 'carreras' | 'ocupaciones', excluir: string) {
  return consultarCuenta((cuenta) => apiCatalogo.obtenerInesperada(cuenta, clase, excluir))
}

// Abrir un detalle registra la vista; sus desbloqueos (t-explorar, insignias) llegan con el refresco.
export function verEnCatalogo(clase: ClaseCatalogo, codigo: string) {
  return accionConRefresco((cuenta) =>
    clase === 'carreras'
      ? apiAcciones.verCarrera(cuenta, codigo)
      : clase === 'ocupaciones'
        ? apiAcciones.verOcupacion(cuenta, codigo)
        : apiAcciones.verInstitucion(cuenta, codigo),
  )
}
