import { useEffect, useSyncExternalStore } from 'react'
import * as apiPanel from '@/services/api/panel'
import type { FiltrosListaPanel } from '@/services/api/panel'
import type {
  ConjuntoPanel,
  ErrorServidor,
  EstudiantePanel,
  FilaArea,
  FilaInstitucion,
  PaginaAreasPanel,
  PaginaInstitucionesPanel,
  RespuestaServidor,
  TipoFormacion,
} from '@/types/servidor'
import { consultarCuentaSesion, sesionServidor } from './sesion'

// Ajuste panel-salon · Panel del salón de la orientadora. Lo cambian las cuentas de sus estudiantes, así que cada
// lectura se revalida al montar su vista y al cambiar de salón u orden (regla 4): se muestra lo ya cargado de esa
// misma llave mientras llega lo nuevo. Un turno por llave descarta las respuestas viejas.
export const LIMITE_LISTA_PANEL = 20
export type CargaPanel<T> = {
  estado: 'cargando' | 'listo' | 'error'
  datos: T | null
  error: ErrorServidor | null
}
export type ListaPanel<F> = {
  estado: 'cargando' | 'listo' | 'mas' | 'error'
  items: F[]
  total: number
  tipos: TipoFormacion[]
  planASinInstitucion: number
  error: ErrorServidor | null
}

const cargas = new Map<string, CargaPanel<unknown>>()
const listas = new Map<string, ListaPanel<unknown>>()
const turnos = new Map<string, number>()
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
  cargas.clear()
  listas.clear()
  turnos.clear()
}
function nuevoTurno(llave: string) {
  const turno = (turnos.get(llave) ?? 0) + 1
  turnos.set(llave, turno)
  return turno
}

export async function cargarPanel<T>(
  llave: string,
  pedir: (cuenta: string) => Promise<RespuestaServidor<T>>,
) {
  vigente()
  const turno = nuevoTurno(llave)
  const actual = cargas.get(llave)
  if (!actual?.datos) cargas.set(llave, { estado: 'cargando', datos: null, error: null })
  avisar()
  const respuesta = await consultarCuentaSesion(pedir)
  if (turnos.get(llave) !== turno) return
  cargas.set(
    llave,
    respuesta.tipo === 'ok'
      ? { estado: 'listo', datos: respuesta.datos, error: null }
      : { estado: 'error', datos: cargas.get(llave)?.datos ?? null, error: respuesta },
  )
  avisar()
}

function useCarga<T>(llave: string, pedir: (cuenta: string) => Promise<RespuestaServidor<T>>) {
  const carga = useSyncExternalStore(suscribir, () => cargas.get(`${sesionServidor()}:${llave}`))
  useEffect(() => {
    void cargarPanel(`${sesionServidor()}:${llave}`, pedir)
    // La llave resume los parámetros de `pedir`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave])
  const reintentar = () => void cargarPanel(`${sesionServidor()}:${llave}`, pedir)
  return { carga: (carga as CargaPanel<T> | undefined) ?? null, reintentar }
}

export const llaveSeguimiento = (salon: string) => `seguimiento:${salon}`
export const llaveIntereses = (salon: string, areas: string, instituciones: string) =>
  `intereses:${salon}:${areas}:${instituciones}`

export function useSeguimientoPanel(salon: string) {
  return useCarga(llaveSeguimiento(salon), (cuenta) => apiPanel.obtenerSeguimiento(cuenta, salon))
}

export function useInteresesPanel(salon: string, ordenAreas: string, ordenInstituciones: string) {
  return useCarga(llaveIntereses(salon, ordenAreas, ordenInstituciones), (cuenta) =>
    apiPanel.obtenerIntereses(cuenta, salon, ordenAreas, ordenInstituciones),
  )
}

export function useEstudiantesPanel(salon: string, conjunto: ConjuntoPanel | null, valor: string) {
  const llave = conjunto ? `estudiantes:${salon}:${conjunto}:${valor}` : 'estudiantes:ninguno'
  const carga = useSyncExternalStore(suscribir, () => cargas.get(`${sesionServidor()}:${llave}`))
  useEffect(() => {
    if (conjunto)
      void cargarPanel(`${sesionServidor()}:${llave}`, (cuenta) =>
        apiPanel.obtenerEstudiantes(cuenta, salon, conjunto, valor),
      )
  }, [llave, salon, conjunto, valor])
  return conjunto ? ((carga as CargaPanel<EstudiantePanel[]> | undefined) ?? null) : null
}

// --- Listas completas de áreas e instituciones, con «Mostrar más» ---------------------------------------

type TipoLista = 'areas' | 'instituciones'
type Filas = { areas: FilaArea; instituciones: FilaInstitucion }

export async function cargarListaPanel(tipo: TipoLista, filtros: FiltrosListaPanel, mas = false) {
  vigente()
  const llave = `${sesionServidor()}:${tipo}:${JSON.stringify(filtros)}`
  const actual = listas.get(llave)
  if (mas && (actual?.estado !== 'listo' || actual.items.length >= actual.total)) return
  const turno = nuevoTurno(llave)
  const previos = mas && actual ? actual.items : []
  if (mas && actual) listas.set(llave, { ...actual, estado: 'mas', error: null })
  else if (!actual?.items.length)
    listas.set(llave, {
      estado: 'cargando',
      items: [],
      total: 0,
      tipos: [],
      planASinInstitucion: 0,
      error: null,
    })
  avisar()
  const respuesta = await consultarCuentaSesion<PaginaAreasPanel | PaginaInstitucionesPanel>((cuenta) =>
    tipo === 'areas'
      ? apiPanel.listarAreas(cuenta, filtros, LIMITE_LISTA_PANEL, previos.length)
      : apiPanel.listarInstituciones(cuenta, filtros, LIMITE_LISTA_PANEL, previos.length),
  )
  if (turnos.get(llave) !== turno) return
  const base = listas.get(llave)!
  listas.set(
    llave,
    respuesta.tipo === 'ok'
      ? {
          estado: 'listo',
          items: [...previos, ...(respuesta.datos.items as unknown[])],
          total: respuesta.datos.total,
          tipos: respuesta.datos.tipos,
          planASinInstitucion:
            'plan_a_sin_institucion' in respuesta.datos ? respuesta.datos.plan_a_sin_institucion : 0,
          error: null,
        }
      : { ...base, estado: 'error', error: respuesta },
  )
  avisar()
}

export function useListaPanel<T extends TipoLista>(tipo: T, filtros: FiltrosListaPanel) {
  const clave = JSON.stringify(filtros)
  const lista = useSyncExternalStore(suscribir, () => listas.get(`${sesionServidor()}:${tipo}:${clave}`))
  useEffect(() => {
    void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel)
  }, [tipo, clave])
  return {
    lista: (lista as ListaPanel<Filas[T]> | undefined) ?? null,
    mostrarMas: () => void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel, true),
    reintentar: () => void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel),
  }
}
