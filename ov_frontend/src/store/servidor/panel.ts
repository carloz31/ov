import { useEffect, useSyncExternalStore } from 'react'
import * as apiPanel from '@/services/api/panel'
import type { FiltrosListaPanel } from '@/services/api/panel'
import type {
  ConjuntoPanel,
  ErrorServidor,
  EstudiantePanel,
  FilaArea,
  FilaInstitucion,
  InteresesPanel,
  PaginaAreasPanel,
  PaginaInstitucionesPanel,
  RespuestaServidor,
  TipoFormacion,
} from '@/types/servidor'
import { descartarPerfilCargado } from './panelEstudiante'
import { consultarCuentaSesion, sesionServidor } from './sesion'

// Ajuste panel-salon · Panel del salón de la orientadora. Lo cambian las cuentas de sus estudiantes, así que cada
// lectura se revalida al montar su vista y al cambiar de salón u orden (regla 4): se muestra lo ya cargado de esa
// misma llave mientras llega lo nuevo. Un turno por llave descarta las respuestas viejas.
// Auditoría del panel: una lectura en camino no se vuelve a pedir salvo con «Reintentar» (F4); al revalidar una lista
// con «Mostrar más», se pide de una vez lo que ya mostraba (F3); y cada almacén guarda a lo más `MAXIMO_LLAVES`
// llaves: se descartan primero las que hace más que no se usan y ninguna que esté a la vista (F5).
export const LIMITE_LISTA_PANEL = 20
// El máximo de filas por petición que aceptan `areas` e `instituciones` (`LIMITE_MAXIMO_CATALOGO`).
export const LIMITE_MAXIMO_LISTA_PANEL = 50
export const MAXIMO_LLAVES = 30
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
// Turno de la petición en camino de cada llave y cuántas vistas montadas la leen.
const enCamino = new Map<string, number>()
const enUso = new Map<string, number>()
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
  enCamino.clear()
}
// Guarda al final del orden (la más reciente) y poda las más antiguas que nadie está mirando.
function guardar<V>(mapa: Map<string, V>, llave: string, valor: V) {
  mapa.delete(llave)
  mapa.set(llave, valor)
  for (const vieja of mapa.keys()) {
    if (mapa.size <= MAXIMO_LLAVES) break
    if (enUso.get(vieja) || enCamino.has(vieja)) continue
    mapa.delete(vieja)
    turnos.delete(vieja)
  }
}
function usar(llave: string) {
  enUso.set(llave, (enUso.get(llave) ?? 0) + 1)
  return () => {
    const quedan = (enUso.get(llave) ?? 1) - 1
    if (quedan > 0) enUso.set(llave, quedan)
    else enUso.delete(llave)
  }
}
function empezar(llave: string, forzar: boolean) {
  if (!forzar && enCamino.has(llave)) return null
  const turno = nuevoTurno(llave)
  enCamino.set(llave, turno)
  return turno
}
function terminar(llave: string, turno: number) {
  if (enCamino.get(llave) === turno) enCamino.delete(llave)
  return turnos.get(llave) === turno
}
function nuevoTurno(llave: string) {
  const turno = (turnos.get(llave) ?? 0) + 1
  turnos.set(llave, turno)
  return turno
}

export async function cargarPanel<T>(
  llave: string,
  pedir: (cuenta: string) => Promise<RespuestaServidor<T>>,
  forzar = false,
) {
  vigente()
  const turno = empezar(llave, forzar)
  if (turno === null) return
  const actual = cargas.get(llave)
  if (!actual?.datos) guardar(cargas, llave, { estado: 'cargando', datos: null, error: null })
  avisar()
  const respuesta = await consultarCuentaSesion(pedir)
  if (!terminar(llave, turno)) return
  guardar(
    cargas,
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
    const completa = `${sesionServidor()}:${llave}`
    const soltar = usar(completa)
    void cargarPanel(completa, pedir)
    return soltar
    // La llave resume los parámetros de `pedir`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave])
  const reintentar = () => void cargarPanel(`${sesionServidor()}:${llave}`, pedir, true)
  return { carga: (carga as CargaPanel<T> | undefined) ?? null, reintentar }
}

type TipoLista = 'areas' | 'instituciones'
type Filas = { areas: FilaArea; instituciones: FilaInstitucion }

export const llaveSeguimiento = (salon: string) => `seguimiento:${salon}`
export const llaveIntereses = (salon: string) => `intereses:${salon}`

export function useSeguimientoPanel(salon: string) {
  return useCarga(llaveSeguimiento(salon), (cuenta) => apiPanel.obtenerSeguimiento(cuenta, salon))
}

// Auditoría del panel (H8): `intereses` se pide una vez por salón al montar la pestaña, con los órdenes que hay en
// ese momento. Ordenar una tabla después no lo vuelve a pedir: pide esa lista completa (`areas` o `instituciones`)
// con el mismo tope que trajo `intereses` (sus filas: `PANEL_TOP_INTERESES`, o menos si no hay tantas).
type InteresesCargados = { intereses: InteresesPanel; ordenAreas: string; ordenInstituciones: string }
export type TablaInteresPanel<F> = { filas: F[]; total: number }

function useTopInteres<T extends TipoLista>(
  tipo: T,
  salon: string,
  orden: string,
  tope: number,
  activo: boolean,
) {
  const llave = `${sesionServidor()}:top:${tipo}:${salon}:${orden}:${tope}`
  const carga = useSyncExternalStore(suscribir, () => (activo ? cargas.get(llave) : undefined))
  useEffect(() => {
    if (!activo) return
    const soltar = usar(llave)
    void cargarPanel<PaginaAreasPanel | PaginaInstitucionesPanel>(llave, (cuenta) =>
      tipo === 'areas'
        ? apiPanel.listarAreas(cuenta, { salon, orden }, tope, 0)
        : apiPanel.listarInstituciones(cuenta, { salon, orden }, tope, 0),
    )
    return soltar
  }, [llave, activo, tipo, salon, orden, tope])
  return activo
    ? ((carga as CargaPanel<PaginaAreasPanel | PaginaInstitucionesPanel> | undefined) ?? null)
    : null
}

export function useInteresesPanel(salon: string, ordenAreas: string, ordenInstituciones: string) {
  const { carga, reintentar } = useCarga<InteresesCargados>(llaveIntereses(salon), async (cuenta) => {
    const respuesta = await apiPanel.obtenerIntereses(cuenta, salon, ordenAreas, ordenInstituciones)
    return respuesta.tipo === 'ok'
      ? { ...respuesta, datos: { intereses: respuesta.datos, ordenAreas, ordenInstituciones } }
      : respuesta
  })
  const cargados = carga?.datos ?? null
  const topAreas = useTopInteres(
    'areas',
    salon,
    ordenAreas,
    cargados?.intereses.areas.filas.length ?? 0,
    !!cargados?.intereses.areas.filas.length && cargados.ordenAreas !== ordenAreas,
  )
  const topInstituciones = useTopInteres(
    'instituciones',
    salon,
    ordenInstituciones,
    cargados?.intereses.instituciones.filas.length ?? 0,
    !!cargados?.intereses.instituciones.filas.length && cargados.ordenInstituciones !== ordenInstituciones,
  )
  const datos = cargados?.intereses ?? null
  // Mientras llega el nuevo orden, la tabla conserva sus filas.
  const areas: TablaInteresPanel<FilaArea> | null = datos && {
    filas: (topAreas?.datos?.items as FilaArea[] | undefined) ?? datos.areas.filas,
    total: datos.areas.total,
  }
  const instituciones: TablaInteresPanel<FilaInstitucion> | null = datos && {
    filas: (topInstituciones?.datos?.items as FilaInstitucion[] | undefined) ?? datos.instituciones.filas,
    total: datos.instituciones.total,
  }
  const errorTabla = topAreas?.error ?? topInstituciones?.error ?? null
  return {
    carga: carga && { ...carga, datos },
    areas,
    instituciones,
    errorTabla,
    reintentar,
  }
}

export function useEstudiantesPanel(salon: string, conjunto: ConjuntoPanel | null, valor: string) {
  const llave = conjunto ? `estudiantes:${salon}:${conjunto}:${valor}` : 'estudiantes:ninguno'
  const carga = useSyncExternalStore(suscribir, () => cargas.get(`${sesionServidor()}:${llave}`))
  useEffect(() => {
    if (!conjunto) return
    const completa = `${sesionServidor()}:${llave}`
    const soltar = usar(completa)
    void cargarPanel(completa, (cuenta) => apiPanel.obtenerEstudiantes(cuenta, salon, conjunto, valor))
    return soltar
  }, [llave, salon, conjunto, valor])
  return conjunto ? ((carga as CargaPanel<EstudiantePanel[]> | undefined) ?? null) : null
}

// --- Listas completas de áreas e instituciones, con «Mostrar más» ---------------------------------------


export async function cargarListaPanel(
  tipo: TipoLista,
  filtros: FiltrosListaPanel,
  mas = false,
  forzar = false,
) {
  vigente()
  const llave = `${sesionServidor()}:${tipo}:${JSON.stringify(filtros)}`
  const actual = listas.get(llave)
  if (mas && (actual?.estado !== 'listo' || actual.items.length >= actual.total)) return
  const turno = empezar(llave, forzar || mas)
  if (turno === null) return
  const previos = mas && actual ? actual.items : []
  // F3: revalidar una lista ya ampliada pide de una vez las filas que mostraba.
  const limite = mas
    ? LIMITE_LISTA_PANEL
    : Math.min(Math.max(actual?.items.length ?? 0, LIMITE_LISTA_PANEL), LIMITE_MAXIMO_LISTA_PANEL)
  if (mas && actual) guardar(listas, llave, { ...actual, estado: 'mas', error: null })
  else if (!actual?.items.length)
    guardar(listas, llave, {
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
      ? apiPanel.listarAreas(cuenta, filtros, limite, previos.length)
      : apiPanel.listarInstituciones(cuenta, filtros, limite, previos.length),
  )
  if (!terminar(llave, turno)) return
  const base = listas.get(llave)!
  guardar(
    listas,
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
    const soltar = usar(`${sesionServidor()}:${tipo}:${clave}`)
    void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel)
    return soltar
  }, [tipo, clave])
  return {
    lista: (lista as ListaPanel<Filas[T]> | undefined) ?? null,
    mostrarMas: () => void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel, true),
    reintentar: () => void cargarListaPanel(tipo, JSON.parse(clave) as FiltrosListaPanel, false, true),
  }
}

// Ajuste panel-entrevistas-configuracion: la configuración del colegio. Se revalida al abrir su vista (la puede
// cambiar otra orientadora del colegio); guardar deja lo que respondió el servidor y vence los perfiles cargados,
// que filtran por los registros destacados. El seguimiento no depende de ella.
export const llaveConfiguracion = 'configuracion'

export function useConfiguracionPanel() {
  return useCarga(llaveConfiguracion, (cuenta) => apiPanel.obtenerConfiguracion(cuenta))
}

export async function guardarConfiguracion(visibles: string[], destacados: string[]) {
  const respuesta = await consultarCuentaSesion((cuenta) =>
    apiPanel.enviarConfigurarColegio(cuenta, visibles, destacados),
  )
  if (respuesta.tipo === 'ok') {
    vigente()
    const llave = `${sesionServidor()}:${llaveConfiguracion}`
    nuevoTurno(llave)
    guardar(cargas, llave, { estado: 'listo', datos: respuesta.datos, error: null })
    avisar()
    descartarPerfilCargado()
  }
  return respuesta
}
