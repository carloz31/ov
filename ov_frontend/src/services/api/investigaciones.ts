import { enviar, obtener } from './cliente'
import type {
  EntrevistaDetalle,
  FichaEntrevistaEntrada,
  FiltrosEntrevistas,
  FiltrosPublicaciones,
  InvestigacionesCuenta,
  MotivoReporte,
  PaginaEntrevistas,
  PaginaPublicaciones,
  PreguntaGuionEntrada,
  PublicacionDetalle,
  RespuestaAccion,
  RespuestaAgrupada,
  RespuestaServidor,
  SugerenciasGuion,
} from '@/types/servidor'

// Investigaciones y entrevistas (B13, F09): el router `investigaciones`, también la tabla de la orientadora.
const ruta = (cuenta: string, resto: string) => `/cuentas/${encodeURIComponent(cuenta)}/${resto}`

function consulta(filtros: Record<string, string | number | boolean | undefined>) {
  const partes = Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
  return partes.length ? `?${partes.join('&')}` : ''
}

export function obtenerInvestigaciones(cuenta: string): Promise<RespuestaServidor<InvestigacionesCuenta>> {
  return obtener(ruta(cuenta, 'investigaciones'))
}

export function listarEntrevistas(
  cuenta: string,
  filtros: FiltrosEntrevistas,
  limite: number,
  desde: number,
  senal?: AbortSignal,
): Promise<RespuestaServidor<PaginaEntrevistas>> {
  return obtener(ruta(cuenta, `entrevistas${consulta({ ...filtros, limite, desde })}`), senal)
}

export function obtenerEntrevista(
  cuenta: string,
  codigo: string,
): Promise<RespuestaServidor<EntrevistaDetalle>> {
  return obtener(ruta(cuenta, `entrevistas/${encodeURIComponent(codigo)}`))
}

export function listarPublicaciones(
  cuenta: string,
  filtros: FiltrosPublicaciones,
  limite: number,
  desde: number,
  senal?: AbortSignal,
): Promise<RespuestaServidor<PaginaPublicaciones>> {
  return obtener(ruta(cuenta, `publicaciones${consulta({ ...filtros, limite, desde })}`), senal)
}

export function obtenerPublicacion(
  cuenta: string,
  codigo: string,
): Promise<RespuestaServidor<PublicacionDetalle>> {
  return obtener(ruta(cuenta, `publicaciones/${encodeURIComponent(codigo)}`))
}

// --- Acciones del estudiante ---
export function guardarLoQuePienso(
  cuenta: string,
  ocupacion: string,
  dia: string,
  necesita: string,
  duda: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/guardar-lo-que-pienso', { cuenta, ocupacion, dia, necesita, duda })
}

export function pedirSugerenciasGuion(cuenta: string): Promise<RespuestaServidor<SugerenciasGuion>> {
  return enviar('/acciones/pedir-sugerencias-guion', { cuenta })
}

export function guardarGuion(
  cuenta: string,
  preguntas: PreguntaGuionEntrada[],
  descartadas: string[],
  terminar: boolean,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/guardar-guion', { cuenta, preguntas, descartadas, terminar })
}

export function cancelarInvestigacion(cuenta: string): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/cancelar-investigacion', { cuenta })
}

export function publicarEntrevista(
  cuenta: string,
  ficha: FichaEntrevistaEntrada,
  coautores: string[],
  permiso: boolean,
): Promise<RespuestaServidor<RespuestaAgrupada>> {
  return enviar('/acciones/publicar-entrevista', { cuenta, ...ficha, coautores, permiso })
}

export function editarEntrevista(
  cuenta: string,
  entrevista: string,
  ficha: FichaEntrevistaEntrada,
  coautoresNuevos: string[],
): Promise<RespuestaServidor<RespuestaAgrupada>> {
  return enviar('/acciones/editar-entrevista', {
    cuenta,
    entrevista,
    ...ficha,
    coautores_nuevos: coautoresNuevos,
  })
}

const sobreEntrevista = (accion: string) => (cuenta: string, entrevista: string) =>
  enviar<RespuestaAccion>(`/acciones/${accion}`, { cuenta, entrevista })
export const retirarEntrevista = sobreEntrevista('retirar-entrevista')
export const verEntrevista = sobreEntrevista('ver-entrevista')

export function reaccionarEntrevista(
  cuenta: string,
  entrevista: string,
  tipo: string,
  comentario: string | null,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/reaccionar-entrevista', { cuenta, entrevista, tipo, comentario })
}

// También la orientadora, sobre cualquier reacción de sus salones.
export function eliminarReaccion(
  cuenta: string,
  reaccion: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/eliminar-reaccion', { cuenta, reaccion })
}

// Una entrevista o una reacción.
export function reportar(
  cuenta: string,
  contenido: { entrevista: string } | { reaccion: string },
  motivo: MotivoReporte,
  detalle: string | null,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/reportar', { cuenta, ...contenido, motivo, detalle })
}

// --- Acciones de la orientadora ---
export function destacarEntrevista(
  cuenta: string,
  entrevista: string,
  destacada: boolean,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/destacar-entrevista', { cuenta, entrevista, destacada })
}

// Con `reaccion`, edita su comentario.
export function comentarEntrevista(
  cuenta: string,
  entrevista: string,
  texto: string,
  reaccion?: string | null,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/comentar-entrevista', {
    cuenta,
    entrevista,
    texto,
    ...(reaccion ? { reaccion } : {}),
  })
}

export const eliminarEntrevista = sobreEntrevista('eliminar-entrevista')

export function descartarReporte(
  cuenta: string,
  reporte: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/descartar-reporte', { cuenta, reporte })
}
