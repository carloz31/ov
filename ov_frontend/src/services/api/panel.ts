import { enviar, obtener } from './cliente'
import type {
  ConfiguracionColegio,
  ConjuntoPanel,
  EstudiantePanel,
  InteresesPanel,
  PaginaAreasPanel,
  PaginaInstitucionesPanel,
  RespuestaServidor,
  SeguimientoPanel,
  TipoFormacion,
} from '@/types/servidor'

// Panel del salón de la orientadora (ajuste panel-salon): el router `panel`. `salon` vacío: todos sus salones.
const ruta = (cuenta: string, resto: string) => `/cuentas/${encodeURIComponent(cuenta)}/panel/${resto}`

function consulta(parametros: Record<string, string | number | undefined>) {
  const partes = Object.entries(parametros)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
  return partes.length ? `?${partes.join('&')}` : ''
}

export type FiltrosListaPanel = { salon?: string; orden?: string; buscar?: string; tipo?: TipoFormacion | '' }

export function obtenerSeguimiento(
  cuenta: string,
  salon: string,
  senal?: AbortSignal,
): Promise<RespuestaServidor<SeguimientoPanel>> {
  return obtener(ruta(cuenta, `seguimiento${consulta({ salon })}`), senal)
}

export function obtenerIntereses(
  cuenta: string,
  salon: string,
  ordenAreas: string,
  ordenInstituciones: string,
  senal?: AbortSignal,
): Promise<RespuestaServidor<InteresesPanel>> {
  return obtener(
    ruta(
      cuenta,
      `intereses${consulta({ salon, orden_areas: ordenAreas, orden_instituciones: ordenInstituciones })}`,
    ),
    senal,
  )
}

export function listarAreas(
  cuenta: string,
  filtros: FiltrosListaPanel,
  limite: number,
  desde: number,
  senal?: AbortSignal,
): Promise<RespuestaServidor<PaginaAreasPanel>> {
  return obtener(ruta(cuenta, `areas${consulta({ ...filtros, limite, desde })}`), senal)
}

export function listarInstituciones(
  cuenta: string,
  filtros: FiltrosListaPanel,
  limite: number,
  desde: number,
  senal?: AbortSignal,
): Promise<RespuestaServidor<PaginaInstitucionesPanel>> {
  return obtener(ruta(cuenta, `instituciones${consulta({ ...filtros, limite, desde })}`), senal)
}

export function obtenerEstudiantes(
  cuenta: string,
  salon: string,
  conjunto: ConjuntoPanel,
  valor: string,
): Promise<RespuestaServidor<EstudiantePanel[]>> {
  return obtener(ruta(cuenta, `estudiantes${consulta({ salon, conjunto, valor })}`))
}

// Ajuste panel-entrevistas-configuracion: una sola configuración para todos sus salones (sin parámetro de colegio).
export function obtenerConfiguracion(
  cuenta: string,
  senal?: AbortSignal,
): Promise<RespuestaServidor<ConfiguracionColegio>> {
  return obtener(ruta(cuenta, 'configuracion'), senal)
}

export function enviarConfigurarColegio(
  cuenta: string,
  visibles: string[],
  destacados: string[],
): Promise<RespuestaServidor<ConfiguracionColegio>> {
  return enviar('/acciones/configurar-colegio', { cuenta, visibles, destacados })
}
