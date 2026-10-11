import * as apiCuentas from '@/services/api/cuentas'
import { avisosServidor, claveDesbloqueo } from '@/lib/servidor/adaptadores'
import { consultarCuenta, obtenerEstadoServidor, publicar } from './sesion'
import type { AlmacenServidor } from './sesion'
import type { DesbloqueoNuevo } from '@/types/servidor'

export function incorporarDesbloqueos(desbloqueos: DesbloqueoNuevo[]) {
  const todos = new Map(obtenerEstadoServidor().desbloqueosAccion.map((d) => [claveDesbloqueo(d), d]))
  desbloqueos.forEach((d) => todos.set(claveDesbloqueo(d), d))
  publicar({ desbloqueosAccion: [...todos.values()] })
}
export function avisosPendientes() {
  return avisosServidor([
    ...obtenerEstadoServidor().noVistos,
    ...obtenerEstadoServidor().desbloqueosAccion,
  ]).filter((a) => !obtenerEstadoServidor().avisosMostrados.includes(a.id))
}
export function mostrarAviso(id: string) {
  if (!obtenerEstadoServidor().avisosMostrados.includes(id))
    publicar({ avisosMostrados: [...obtenerEstadoServidor().avisosMostrados, id] })
}
export function estadoLoteAvisos(
  cambios: Partial<Pick<AlmacenServidor, 'errorAvisos' | 'procesandoAvisos' | 'marcadoAvisos'>>,
) {
  publicar(cambios)
}
export function terminarAvisosMarcados(ids: string[]) {
  publicar({
    desbloqueosAccion: obtenerEstadoServidor().desbloqueosAccion.filter(
      (d) => !ids.includes(claveDesbloqueo(d)),
    ),
    avisosMostrados: obtenerEstadoServidor().avisosMostrados.filter((id) => !ids.includes(id)),
    marcadoAvisos: null,
  })
}
export async function consultarNoVistos() {
  const respuesta = await consultarCuenta(apiCuentas.obtenerDesbloqueosNoVistos)
  if (respuesta.tipo === 'ok') {
    const fechas = { ...obtenerEstadoServidor().fechasInsignias }
    respuesta.datos
      .filter((d) => d.tipo_objetivo === 'INSIGNIA')
      .forEach((d) => {
        fechas[d.objetivo.codigo] = d.fecha_hora
      })
    publicar({ noVistos: respuesta.datos, fechasInsignias: fechas })
  }
  return respuesta
}
