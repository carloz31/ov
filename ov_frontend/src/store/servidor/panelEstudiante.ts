import { useEffect, useSyncExternalStore } from 'react'
import * as api from '@/services/api/panelEstudiante'
import type { FiltrosListaEstudiantes } from '@/services/api/panelEstudiante'
import type {
  ErrorServidor,
  NotaPerfil,
  PaginaEstudiantes,
  PerfilEstudiante,
  RespuestaServidor,
} from '@/types/servidor'
import { consultarCuentaSesion, sesionServidor } from './sesion'

// Ajuste panel-estudiantes · Lista y perfil del estudiante de la orientadora. Lo cambia la cuenta del estudiante,
// así que todo se revalida al abrir su vista (regla 4), mostrando lo ya cargado mientras llega lo nuevo.
// - Un solo perfil a la vez: abrir otro estudiante o salir del perfil lo descarta con todas sus pestañas.
// - Cada sección del perfil (pestaña, plan, registro, resultado) se pide al abrirla y una sola vez por visita.
// - De la lista solo se guardan las páginas del filtro y orden actuales: otro filtro la reemplaza.
// Nada se copia a otro almacén ni al navegador.
export type CargaPerfil<T> = {
  estado: 'cargando' | 'listo' | 'error'
  datos: T | null
  error: ErrorServidor | null
}
export type ListaEstudiantes = {
  estado: 'cargando' | 'listo' | 'mas' | 'error'
  pagina: PaginaEstudiantes | null
  error: ErrorServidor | null
}

// Una visita dura lo que el perfil está abierto: al salir se descarta, así que volver lo pide de nuevo.
type Perfil = {
  sesion: number
  estudiante: string
  secciones: Map<string, CargaPerfil<unknown>>
  turnos: Map<string, number>
}

let perfil: Perfil | null = null
let lista: { sesion: number; llave: string; turno: number; valor: ListaEstudiantes } | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

// --- Perfil ---------------------------------------------------------------------------------------------

function perfilDe(estudiante: string) {
  if (perfil?.estudiante === estudiante && perfil.sesion === sesionServidor()) return perfil
  perfil = { sesion: sesionServidor(), estudiante, secciones: new Map(), turnos: new Map() }
  return perfil
}

export function descartarPerfil(estudiante: string) {
  if (perfil?.estudiante !== estudiante) return
  perfil = null
  avisar()
}

export async function cargarSeccion<T>(
  estudiante: string,
  llave: string,
  pedir: (cuenta: string) => Promise<RespuestaServidor<T>>,
  forzar = false,
) {
  const actual = perfilDe(estudiante)
  const previo = actual.turnos.get(llave)
  if (!forzar && previo !== undefined) return
  const turno = (previo ?? 0) + 1
  actual.turnos.set(llave, turno)
  const cargada = actual.secciones.get(llave)
  actual.secciones.set(llave, { estado: 'cargando', datos: cargada?.datos ?? null, error: null })
  avisar()
  const respuesta = await consultarCuentaSesion(pedir)
  if (perfil !== actual || actual.turnos.get(llave) !== turno) return
  actual.secciones.set(
    llave,
    respuesta.tipo === 'ok'
      ? { estado: 'listo', datos: respuesta.datos, error: null }
      : { estado: 'error', datos: cargada?.datos ?? null, error: respuesta },
  )
  avisar()
}

function leer<T>(estudiante: string, llave: string) {
  if (perfil?.estudiante !== estudiante || perfil.sesion !== sesionServidor()) return null
  return (perfil.secciones.get(llave) as CargaPerfil<T> | undefined) ?? null
}

// La sección `llave` del perfil, pedida al montar con `activa` (al abrir su pestaña o su vista).
export function useSeccionPerfil<T>(
  estudiante: string,
  llave: string,
  pedir: (cuenta: string, estudiante: string) => Promise<RespuestaServidor<T>>,
  activa = true,
) {
  const carga = useSyncExternalStore(suscribir, () => leer<T>(estudiante, llave))
  useEffect(() => {
    if (activa) void cargarSeccion(estudiante, llave, (cuenta) => pedir(cuenta, estudiante))
    // La llave resume los parámetros de `pedir`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudiante, llave, activa])
  return {
    carga,
    reintentar: () => void cargarSeccion(estudiante, llave, (cuenta) => pedir(cuenta, estudiante), true),
  }
}

// El perfil (cabecera y Resumen): se pide al abrirlo; salir de él lo descarta con todas sus pestañas.
export function usePerfilEstudiante(estudiante: string) {
  useEffect(() => {
    void cargarSeccion(estudiante, 'perfil', (cuenta) => api.obtenerPerfil(cuenta, estudiante))
    return () => descartarPerfil(estudiante)
  }, [estudiante])
  const carga = useSyncExternalStore(suscribir, () => leer<PerfilEstudiante>(estudiante, 'perfil'))
  return {
    carga,
    reintentar: () =>
      void cargarSeccion(estudiante, 'perfil', (cuenta) => api.obtenerPerfil(cuenta, estudiante), true),
  }
}

// --- Notas: la acción confirmada actualiza el perfil cargado, sin volver a pedirlo ---------------------

function cambiarNotas(estudiante: string, cambio: (notas: NotaPerfil[]) => NotaPerfil[]) {
  const carga = leer<PerfilEstudiante>(estudiante, 'perfil')
  if (!perfil || !carga?.datos) return
  perfil.secciones.set('perfil', { ...carga, datos: { ...carga.datos, notas: cambio(carga.datos.notas) } })
  avisar()
}

export async function escribirNota(estudiante: string, texto: string) {
  const respuesta = await consultarCuentaSesion((cuenta) => api.enviarEscribirNota(cuenta, estudiante, texto))
  if (respuesta.tipo === 'ok') cambiarNotas(estudiante, (notas) => [respuesta.datos, ...notas])
  return respuesta
}

export async function editarNota(estudiante: string, nota: number, texto: string) {
  const respuesta = await consultarCuentaSesion((cuenta) =>
    api.enviarEditarNota(cuenta, estudiante, nota, texto),
  )
  if (respuesta.tipo === 'ok')
    cambiarNotas(estudiante, (notas) => notas.map((n) => (n.numero === nota ? respuesta.datos : n)))
  return respuesta
}

export async function borrarNota(estudiante: string, nota: number) {
  const respuesta = await consultarCuentaSesion((cuenta) => api.enviarBorrarNota(cuenta, estudiante, nota))
  if (respuesta.tipo === 'ok') cambiarNotas(estudiante, (notas) => notas.filter((n) => n.numero !== nota))
  return respuesta
}

// --- Lista ----------------------------------------------------------------------------------------------

export async function cargarListaEstudiantes(filtros: FiltrosListaEstudiantes, mas = false) {
  const llave = JSON.stringify(filtros)
  const vigente = lista?.llave === llave && lista.sesion === sesionServidor() ? lista : null
  if (mas && (!vigente?.valor.pagina || vigente.valor.estado !== 'listo')) return
  if (mas && vigente!.valor.pagina!.items.length >= vigente!.valor.pagina!.total) return
  const turno = (vigente?.turno ?? 0) + 1
  const previas = mas ? vigente!.valor.pagina!.items : []
  lista = {
    sesion: sesionServidor(),
    llave,
    turno,
    valor: { estado: mas ? 'mas' : 'cargando', pagina: vigente?.valor.pagina ?? null, error: null },
  }
  avisar()
  const respuesta = await consultarCuentaSesion((cuenta) =>
    api.obtenerListaEstudiantes(cuenta, filtros, previas.length),
  )
  if (lista?.llave !== llave || lista.turno !== turno) return
  lista.valor =
    respuesta.tipo === 'ok'
      ? {
          estado: 'listo',
          pagina: { ...respuesta.datos, items: [...previas, ...respuesta.datos.items] },
          error: null,
        }
      : { estado: 'error', pagina: lista.valor.pagina, error: respuesta }
  lista = { ...lista }
  avisar()
}

// `activa` en falso (aún sin los salones de la sesión) no pide nada: así no se pide una lista que se descarta.
export function useListaEstudiantes(filtros: FiltrosListaEstudiantes, activa = true) {
  const llave = JSON.stringify(filtros)
  const actual = useSyncExternalStore(suscribir, () =>
    lista?.llave === llave && lista.sesion === sesionServidor() ? lista.valor : null,
  )
  useEffect(() => {
    if (activa) void cargarListaEstudiantes(JSON.parse(llave) as FiltrosListaEstudiantes)
  }, [llave, activa])
  return {
    lista: actual,
    mostrarMas: () => void cargarListaEstudiantes(JSON.parse(llave) as FiltrosListaEstudiantes, true),
    reintentar: () => void cargarListaEstudiantes(JSON.parse(llave) as FiltrosListaEstudiantes),
  }
}

// --- Secciones del perfil: cada una se pide al abrir su pestaña o su vista ---------------------------------

export const useTestsPerfil = (estudiante: string, activa = true) =>
  useSeccionPerfil(estudiante, 'tests', api.obtenerTests, activa)
export const usePartidaLlegadaPerfil = (estudiante: string, activa = true) =>
  useSeccionPerfil(estudiante, 'partida-llegada', api.obtenerPartidaLlegada, activa)
export const useResultadoPerfil = (estudiante: string, aplicacion: string) =>
  useSeccionPerfil(estudiante, `resultado:${aplicacion}`, (cuenta, e) =>
    api.obtenerResultado(cuenta, e, aplicacion),
  )
export const usePlanesPerfil = (estudiante: string, activa = true) =>
  useSeccionPerfil(estudiante, 'planes', api.obtenerPlanes, activa)
export const usePlanPerfil = (estudiante: string, prioridad: number) =>
  useSeccionPerfil(estudiante, `plan:${prioridad}`, (cuenta, e) => api.obtenerPlan(cuenta, e, prioridad))
export const useRespuestasPerfil = (estudiante: string, activa = true) =>
  useSeccionPerfil(estudiante, 'respuestas', api.obtenerRespuestas, activa)
export const useRegistroPerfil = (estudiante: string, actividad: string, activa: boolean) =>
  useSeccionPerfil(
    estudiante,
    `registro:${actividad}`,
    (cuenta, e) => api.obtenerRegistro(cuenta, e, actividad),
    activa,
  )
export const useAvancePerfil = (estudiante: string, activa = true) =>
  useSeccionPerfil(estudiante, 'avance', api.obtenerAvance, activa)
