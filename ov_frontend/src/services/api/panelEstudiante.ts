import { enviar, obtener } from './cliente'
import type {
  AvanceEstudiantePerfil,
  DetallePartidaLlegada,
  NotaBorrada,
  NotaPerfil,
  PaginaEstudiantes,
  PerfilEstudiante,
  PlanCompleto,
  PlanesEstudiante,
  RegistroLectura,
  RespuestaServidor,
  RespuestasEstudiante,
  ResultadoPublico,
  TestsEstudiante,
} from '@/types/servidor'

// Ajuste panel-estudiantes: lista y perfil del estudiante de la orientadora (router `panel`) y sus notas
// (acciones). `cuenta` es siempre la orientadora; el estudiante va en la ruta.
const panel = (cuenta: string, resto: string) => `/cuentas/${encodeURIComponent(cuenta)}/panel/${resto}`
const perfil = (cuenta: string, estudiante: string, resto = '') =>
  panel(cuenta, `estudiantes/${encodeURIComponent(estudiante)}${resto}`)

export type FiltrosListaEstudiantes = {
  salon?: string
  buscar?: string
  aviso?: string
  test?: string
  acceso?: string
  orden?: string
}

function consulta(parametros: Record<string, string | number | undefined>) {
  const partes = Object.entries(parametros)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
  return partes.length ? `?${partes.join('&')}` : ''
}

export function obtenerListaEstudiantes(
  cuenta: string,
  filtros: FiltrosListaEstudiantes,
  desde: number,
  limite?: number,
): Promise<RespuestaServidor<PaginaEstudiantes>> {
  return obtener(panel(cuenta, `lista-estudiantes${consulta({ ...filtros, limite, desde })}`))
}

export function obtenerPerfil(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<PerfilEstudiante>> {
  return obtener(perfil(cuenta, estudiante))
}

export function obtenerTests(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<TestsEstudiante>> {
  return obtener(perfil(cuenta, estudiante, '/tests'))
}

export function obtenerPartidaLlegada(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<DetallePartidaLlegada>> {
  return obtener(perfil(cuenta, estudiante, '/tests/partida-llegada'))
}

export function obtenerResultado(
  cuenta: string,
  estudiante: string,
  aplicacion: string,
): Promise<RespuestaServidor<ResultadoPublico>> {
  return obtener(perfil(cuenta, estudiante, `/tests/${encodeURIComponent(aplicacion)}/resultado`))
}

export function obtenerPlanes(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<PlanesEstudiante>> {
  return obtener(perfil(cuenta, estudiante, '/planes'))
}

export function obtenerPlan(
  cuenta: string,
  estudiante: string,
  prioridad: number,
): Promise<RespuestaServidor<PlanCompleto>> {
  return obtener(perfil(cuenta, estudiante, `/planes/${prioridad}`))
}

export function obtenerRespuestas(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<RespuestasEstudiante>> {
  return obtener(perfil(cuenta, estudiante, '/respuestas'))
}

export function obtenerRegistro(
  cuenta: string,
  estudiante: string,
  actividad: string,
): Promise<RespuestaServidor<RegistroLectura>> {
  return obtener(perfil(cuenta, estudiante, `/respuestas/${encodeURIComponent(actividad)}`))
}

export function obtenerAvance(
  cuenta: string,
  estudiante: string,
): Promise<RespuestaServidor<AvanceEstudiantePerfil>> {
  return obtener(perfil(cuenta, estudiante, '/avance'))
}

export function enviarEscribirNota(
  cuenta: string,
  estudiante: string,
  texto: string,
): Promise<RespuestaServidor<NotaPerfil>> {
  return enviar('/acciones/escribir-nota', { cuenta, estudiante, texto })
}

export function enviarEditarNota(
  cuenta: string,
  estudiante: string,
  nota: number,
  texto: string,
): Promise<RespuestaServidor<NotaPerfil>> {
  return enviar('/acciones/editar-nota', { cuenta, estudiante, nota, texto })
}

export function enviarBorrarNota(
  cuenta: string,
  estudiante: string,
  nota: number,
): Promise<RespuestaServidor<NotaBorrada>> {
  return enviar('/acciones/borrar-nota', { cuenta, estudiante, nota })
}
