import { useSyncExternalStore } from 'react'
import { configurarJourneyServidor } from '../journeyStore'
import { configurarAdventureServidor } from '../adventureStore'
import { ciudadDisponible } from '@/lib/servidor/adaptadores'
import { modoApi } from '@/config/env'
import { cuentaActiva, cuentaSesion } from './cuenta'
import type {
  AmistadAsistente,
  ConversacionesCuenta,
  InvestigacionesCuenta,
  PlanesCuenta,
  AvanceEstudiante,
  AvanceInstrumento,
  BloqueActividades,
  CheckInsCuenta,
  ComparacionAutopercepcion,
  FichaCuenta,
  TestimonioEstado,
  ResumenCuenta,
  LogrosCuenta,
  EntradaDiarioPublica,
  ErrorServidor,
  ItemPublico,
  PreguntaDiarioEstado,
  PresentacionesCuenta,
  RespuestaPublica,
  RespuestaServidor,
  ResultadoHistorico,
  ResultadoPublico,
  SeccionEstado,
} from '@/types/servidor'

export type Seccion<T> = {
  datos: T | null
  estado: 'sin_cargar' | 'cargando' | 'listo' | 'vencido' | 'error'
  error: ErrorServidor | null
}
export type DatosSecciones = {
  resumen: ResumenCuenta
  actividades: BloqueActividades[]
  fichas: FichaCuenta[]
  // Ajuste mochila: los testimonios, como las fichas, se piden al abrir la mochila y se conservan.
  testimonios: TestimonioEstado[]
  logros: LogrosCuenta
  // Ajuste del panel (F05): el avance del panel; va con las actividades (pantalla de carga del mapa).
  avance: AvanceEstudiante
  // GET /cuentas/{c}/secciones: diario, check-in, catálogo, planes y familia (F00).
  secciones: SeccionEstado[]
  // Ajuste presentaciones-vistas: las presentaciones de primera visita ya cerradas; van con el ingreso.
  presentaciones: PresentacionesCuenta
  // F05: el diario se pide al abrirlo; los check-ins, al ingresar y solo con CHECK_IN abierta.
  diarioPreguntas: PreguntaDiarioEstado[]
  diarioEntradas: EntradaDiarioPublica[]
  amistad: AmistadAsistente
  checkIns: CheckInsCuenta
  // F07a: los planes de carrera; se piden al abrir Mis planes, un plan, el detalle de carrera o el perfil.
  planes: PlanesCuenta
  // F08: la sección Familia del estudiante; se pide al abrirla y se revalida cada vez que se monta (la cambia
  // también el apoderado).
  conversaciones: ConversacionesCuenta
  // F09: la investigación en curso, aliados, catálogos y conteos; se pide al abrir Investigaciones y se revalida
  // al montar (un coautor la cambia al publicar).
  investigaciones: InvestigacionesCuenta
}
export type NombreSeccion = keyof DatosSecciones
// F03: lo que lee el libro de Helena. Se pide al abrir el libro o su vista explicada.
export type EstadoInstrumentos = {
  estado: 'sin_cargar' | 'cargando' | 'listo' | 'error'
  error: ErrorServidor | null
  avance: AvanceInstrumento[] | null
  // Resultado vigente por código de aplicación (solo las reveladas).
  resultados: Record<string, ResultadoPublico>
  comparacion: ComparacionAutopercepcion | null
  // Historial de TEST-RIASEC, solo con perfil plano: dice si el reinicio ya se usó.
  historialRiasec: ResultadoHistorico[] | null
  // Ajuste de F03: dimensiones de partida y llegada en el catálogo, solo con la partida lista para revelar
  // («tu zona en las N partes»). Si el catálogo no responde, queda en null y el texto no cuenta las partes.
  partesPartida?: number | null
}
// Ajuste de F03: ítems y respuestas de las actividades de APL-PARTIDA, para la vista con solo la partida. Se
// piden al abrir esa vista; tienen su propio estado para que un fallo no oculte las zonas.
export type EstadoRespuestasPartida = {
  estado: 'sin_cargar' | 'cargando' | 'listo' | 'error'
  error: ErrorServidor | null
  items: ItemPublico[]
  respuestas: RespuestaPublica[]
}
export type AlmacenServidor = { [N in NombreSeccion]: Seccion<DatosSecciones[N]> } & {
  cargando: boolean
  error: ErrorServidor | null
  consultasHabilitadas: boolean
  // F00: actividades desbloqueadas por una acción que el mapa revela una por una. Solo en memoria.
  porRevelar: string[]
  resultadoRiasec: ResultadoPublico | null
  estadoResultado: 'sin_cargar' | 'cargando' | 'pendiente' | 'listo' | 'error'
  errorResultado: ErrorServidor | null
  instrumentos: EstadoInstrumentos
  respuestasPartida: EstadoRespuestasPartida
}
function vacia<T>(): Seccion<T> {
  return { datos: null, estado: 'sin_cargar', error: null }
}
const inicial = (): AlmacenServidor => ({
  resumen: vacia(),
  actividades: vacia(),
  fichas: vacia(),
  testimonios: vacia(),
  logros: vacia(),
  avance: vacia(),
  secciones: vacia(),
  presentaciones: vacia(),
  diarioPreguntas: vacia(),
  diarioEntradas: vacia(),
  amistad: vacia(),
  planes: vacia(),
  conversaciones: vacia(),
  investigaciones: vacia(),
  checkIns: vacia(),
  cargando: false,
  error: null,
  consultasHabilitadas: false,
  porRevelar: [],
  resultadoRiasec: null,
  estadoResultado: 'sin_cargar',
  errorResultado: null,
  instrumentos: {
    estado: 'sin_cargar',
    error: null,
    avance: null,
    resultados: {},
    comparacion: null,
    historialRiasec: null,
  },
  respuestasPartida: { estado: 'sin_cargar', error: null, items: [], respuestas: [] },
})
let almacen = inicial()
let revisionCuenta = 0
export const sesionServidor = () => revisionCuenta
const oyentes = new Set<() => void>()
export function publicar(cambios: Partial<AlmacenServidor>) {
  almacen = { ...almacen, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
export const obtenerEstadoServidor = () => almacen
export const suscribirServidor = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
export const useEstadoServidor = () => useSyncExternalStore(suscribirServidor, obtenerEstadoServidor)
export function prepararAlmacenesApi(cuenta = cuentaActiva()) {
  if (!modoApi || !cuenta) return
  configurarJourneyServidor(cuenta)
  configurarAdventureServidor(cuenta, () => ciudadDisponible(almacen.actividades.datos))
}
export function limpiarEstadoServidor() {
  revisionCuenta++
  almacen = inicial()
  oyentes.forEach((oyente) => oyente())
}
export function informarErrorServidor(error: ErrorServidor) {
  publicar({ cargando: false, error })
}
export const cambioCuenta = (): ErrorServidor => ({
  tipo: 'http',
  estado: 409,
  detalle: 'La cuenta activa cambió durante la consulta.',
})
export async function consultarCuenta<T>(
  consulta: (cuenta: string) => Promise<RespuestaServidor<T>>,
): Promise<RespuestaServidor<T>> {
  const cuenta = cuentaActiva(),
    sesion = revisionCuenta
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta = await consulta(cuenta)
  return cuenta === cuentaActiva() && sesion === revisionCuenta ? respuesta : cambioCuenta()
}
// Ajuste catalogo-apoderado: como `consultarCuenta`, con la cuenta de la sesión sea cual sea su rol (el catálogo
// lo leen también el apoderado y la orientadora).
export async function consultarCuentaSesion<T>(
  consulta: (cuenta: string) => Promise<RespuestaServidor<T>>,
): Promise<RespuestaServidor<T>> {
  const cuenta = cuentaSesion(),
    sesion = revisionCuenta
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta = await consulta(cuenta)
  return cuenta === cuentaSesion() && sesion === revisionCuenta ? respuesta : cambioCuenta()
}
export function mensajeErrorServidor(error: ErrorServidor | null) {
  if (!error) return ''
  if (error.tipo === 'sin_conexion') return 'No se pudo conectar con el servidor. Vuelve a intentarlo.'
  if (error.tipo === 'bloqueado') return error.detalle.mensaje ?? 'La acción no está disponible.'
  const detalle = error.detalle
  return typeof detalle === 'string'
    ? detalle
    : detalle && typeof detalle === 'object' && 'mensaje' in detalle
      ? String(detalle.mensaje)
      : `No se pudo consultar el servidor (${error.estado}).`
}
