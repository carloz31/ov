import { useEffect, useSyncExternalStore } from 'react'
import * as apiAcciones from '@/services/api/acciones'
import * as apiCatalogo from '@/services/api/catalogo'
import type {
  ClaseCatalogo,
  DetalleCatalogo,
  FiltrosCatalogo,
  ResumenCatalogo,
} from '@/services/api/catalogo'
import type { ErrorServidor, FamiliaPublica, GrupoPublico, UbicacionPublica } from '@/types/servidor'
import { accionConRefresco } from './refresco'
import { consultarCuenta, sesionServidor } from './sesion'

export type {
  ClaseCatalogo,
  DetalleCatalogo,
  FiltrosCatalogo,
  ResumenCatalogo,
} from '@/services/api/catalogo'
export const LIMITE_CATALOGO = 20
// Ajuste catalogo-datos-reales (F6): detalles abiertos que se conservan en memoria.
export const LIMITE_DETALLES = 20

// La hoja de vida de la Central pide su ocupación al abrirse.
export function consultarOcupacion(codigo: string) {
  return consultarCuenta((cuenta) => apiCatalogo.obtenerOcupacion(cuenta, codigo))
}

// F06 · Listas del catálogo, pedidas al mostrarse y acumuladas con «Mostrar más». Ajuste catalogo-datos-reales:
// cada clase guarda solo su combinación de filtros activa; cambiar de búsqueda o filtro descarta las páginas
// acumuladas. Un turno por clase descarta las respuestas viejas («psi» no pisa a «psico»).
export type ListaCatalogo<C extends ClaseCatalogo = ClaseCatalogo> = {
  estado: 'cargando' | 'listo' | 'mas' | 'error'
  items: ResumenCatalogo[C][]
  total: number
  error: ErrorServidor | null
}
type Entrada = ListaCatalogo & { llave: string }
type Detalle<C extends ClaseCatalogo = ClaseCatalogo> = {
  estado: 'cargando' | 'listo' | 'error'
  datos: DetalleCatalogo[C] | null
  error: ErrorServidor | null
}
export type OpcionesCatalogo = {
  familias: FamiliaPublica[]
  ubicaciones: UbicacionPublica[]
  grupos: GrupoPublico[]
} | null

const listas = new Map<ClaseCatalogo, Entrada>()
const turnos = new Map<ClaseCatalogo, number>()
// Total de cada clase sin filtros (la cabecera), del último listado recibido.
const dominios = new Map<ClaseCatalogo, number>()
const detalles = new Map<string, Detalle>()
let opciones: OpcionesCatalogo = null
let opcionesEnCurso = false
// Lo cargado es de una sesión de cuenta: al cambiar (cerrar sesión, otra cuenta) se vacía.
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
  turnos.clear()
  dominios.clear()
  detalles.clear()
  opciones = null
  opcionesEnCurso = false
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
const claveLista = (filtros: FiltrosCatalogo) =>
  `${sesionServidor()}:${JSON.stringify(filtrosLimpios(filtros))}`
const claveDetalle = (clase: ClaseCatalogo, codigo: string) => `${clase}:${codigo}`
const vacia = (estado: ListaCatalogo['estado'], llave: string): Entrada => ({
  estado,
  items: [],
  total: 0,
  error: null,
  llave,
})

export async function cargarLista(clase: ClaseCatalogo, filtros: FiltrosCatalogo, mas = false) {
  vigente()
  const llave = claveLista(filtros)
  const actual = listas.get(clase)
  const misma = actual?.llave === llave
  if (!mas && misma && actual.estado !== 'error') return
  if (
    mas &&
    (!misma || actual.estado === 'cargando' || actual.estado === 'mas' || actual.items.length >= actual.total)
  )
    return
  const turno = (turnos.get(clase) ?? 0) + 1
  turnos.set(clase, turno)
  const previos = mas && actual ? actual.items : []
  listas.set(clase, mas && actual ? { ...actual, estado: 'mas', error: null } : vacia('cargando', llave))
  avisar()
  const respuesta = await consultarCuenta((cuenta) =>
    apiCatalogo.buscarCatalogo(cuenta, clase, filtrosLimpios(filtros), LIMITE_CATALOGO, previos.length),
  )
  if (turnos.get(clase) !== turno) return
  if (respuesta.tipo === 'ok') dominios.set(clase, respuesta.datos.total_dominio)
  listas.set(
    clase,
    respuesta.tipo === 'ok'
      ? {
          estado: 'listo',
          items: [...previos, ...respuesta.datos.items],
          total: respuesta.datos.total,
          error: null,
          llave,
        }
      : { estado: 'error', items: previos, total: actual?.total ?? 0, error: respuesta, llave },
  )
  avisar()
}

// Tras un error, reintenta lo que faltó: la primera página o la siguiente.
export function reintentarLista(clase: ClaseCatalogo, filtros: FiltrosCatalogo) {
  const actual = listas.get(clase)
  if (actual?.estado !== 'error' || actual.llave !== claveLista(filtros)) return
  if (!actual.items.length) return cargarLista(clase, filtros)
  listas.set(clase, { ...actual, estado: 'listo' })
  return cargarLista(clase, filtros, true)
}

// La lista de una clase con sus filtros, pedida mientras `activa` (la pestaña a la vista). Mientras se piden
// otros filtros, devuelve `undefined`.
export function useListaCatalogo<C extends ClaseCatalogo>(
  clase: C,
  filtros: FiltrosCatalogo,
  activa: boolean,
): ListaCatalogo<C> | undefined {
  const llave = claveLista(filtros)
  const entrada = useSyncExternalStore(suscribir, () => listas.get(clase))
  const lista = entrada?.llave === llave ? (entrada as unknown as ListaCatalogo<C>) : undefined
  useEffect(() => {
    // `llave` resume los filtros (limpios), así que el efecto no depende de la identidad del objeto.
    if (activa && !lista)
      void cargarLista(clase, JSON.parse(llave.slice(llave.indexOf('{'))) as FiltrosCatalogo)
  }, [activa, clase, llave, lista])
  return lista
}

// Cuántos hay en todo el catálogo de la clase (cabecera y «N de M»); nulo hasta el primer listado.
export function useTotalDominio(clase: ClaseCatalogo) {
  return useSyncExternalStore(suscribir, () => dominios.get(clase) ?? null)
}

// El detalle se pide al abrirlo y se guarda por código, con los últimos LIMITE_DETALLES abiertos; un error se
// puede reintentar.
export function cargarDetalle(clase: ClaseCatalogo, codigo: string, reintentar = false) {
  vigente()
  const llave = claveDetalle(clase, codigo)
  const actual = detalles.get(llave)
  if (actual && (actual.estado !== 'error' || !reintentar)) {
    // Abierto otra vez: pasa a ser el más reciente.
    detalles.delete(llave)
    detalles.set(llave, actual)
    return
  }
  detalles.delete(llave)
  detalles.set(llave, { estado: 'cargando', datos: null, error: null })
  while (detalles.size > LIMITE_DETALLES) detalles.delete(detalles.keys().next().value!)
  avisar()
  const sesion = sesionServidor()
  void consultarCuenta((cuenta) => apiCatalogo.obtenerDetalleCatalogo(cuenta, clase, codigo)).then(
    (respuesta) => {
      if (sesion !== sesionServidor() || !detalles.has(llave)) return
      detalles.set(
        llave,
        respuesta.tipo === 'ok'
          ? { estado: 'listo', datos: respuesta.datos, error: null }
          : { estado: 'error', datos: null, error: respuesta },
      )
      avisar()
    },
  )
}

export function useDetalleCatalogo<C extends ClaseCatalogo>(clase: C, codigo: string | undefined) {
  const detalle = useSyncExternalStore(suscribir, () =>
    codigo && sesionCargada === sesionServidor() ? detalles.get(claveDetalle(clase, codigo)) : undefined,
  ) as Detalle<C> | undefined
  useEffect(() => {
    if (codigo) cargarDetalle(clase, codigo)
  }, [clase, codigo])
  return detalle
}

// Familias, ubicaciones y grupos de los filtros: una vez por sesión de cuenta.
export function useOpcionesCatalogo(activas: boolean): OpcionesCatalogo {
  const sesion = sesionServidor()
  const actuales = useSyncExternalStore(suscribir, () => (sesionCargada === sesion ? opciones : null))
  useEffect(() => {
    vigente()
    if (!activas || opciones || opcionesEnCurso) return
    opcionesEnCurso = true
    void Promise.all([
      consultarCuenta(apiCatalogo.obtenerFamilias),
      consultarCuenta(apiCatalogo.obtenerUbicaciones),
      consultarCuenta(apiCatalogo.obtenerGrupos),
    ]).then(([familias, ubicaciones, grupos]) => {
      if (sesion !== sesionServidor()) return
      opcionesEnCurso = false
      if (familias.tipo !== 'ok' || ubicaciones.tipo !== 'ok' || grupos.tipo !== 'ok') return
      opciones = { familias: familias.datos, ubicaciones: ubicaciones.datos, grupos: grupos.datos }
      avisar()
    })
  }, [activas, sesion])
  return actuales
}

// Una acción de favorito confirmada se aplica a lo cargado: listas, detalles y lo que cada detalle lista.
// La lista de favoritos de esa clase se descarta: se vuelve a pedir al mostrarse.
export function actualizarFavoritoCatalogo(clase: ClaseCatalogo, codigo: string, es_favorita: boolean) {
  const marcar = <T extends { codigo: string; es_favorita: boolean }>(items: T[]) =>
    items.map((item) => (item.codigo === codigo ? { ...item, es_favorita } : item))
  const lista = listas.get(clase)
  if (lista?.llave.includes('"favoritos":true')) listas.delete(clase)
  else if (lista) listas.set(clase, { ...lista, items: marcar(lista.items) })
  for (const [llave, detalle] of detalles) {
    if (!detalle.datos) continue
    let datos = detalle.datos as DetalleCatalogo[ClaseCatalogo] & Partial<Record<ClaseCatalogo, unknown>>
    if (llave === claveDetalle(clase, codigo)) datos = { ...datos, es_favorita }
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
