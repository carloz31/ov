import { modoApi } from '@/config/env'
import {
  abrirNotificacion,
  cargarMasNotificaciones,
  hayMasNotificaciones,
  marcarTodasLasNotificaciones,
  useNotificaciones,
} from '@/store/servidor/notificaciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { notificacionLegible, ordenCampana } from '@/lib/servidor/adaptadoresNotificaciones'
import type { AvisoServidor, ModeloCampana, PortalNotificaciones } from '@/types/notificaciones'

// Ajuste notificaciones: el modelo de la campana del estudiante y del apoderado (solo api). Las no vistas primero
// (las de otra cuenta antes que los logros); en el menú, las 5 primeras.
export function useCampanaNotificaciones(portal: PortalNotificaciones): ModeloCampana {
  const estado = useNotificaciones()
  const todas = ordenCampana(
    estado.lista.map((n) => notificacionLegible(n, portal)).filter((a): a is AvisoServidor => a !== null),
  )
  return {
    recientes: todas.slice(0, 5),
    todas,
    noVistas: estado.noVistas,
    hayMas: hayMasNotificaciones(),
    cargandoMas: estado.cargandoMas,
    error: estado.error ? mensajeErrorServidor(estado.error) : '',
    abrir: (aviso) => abrirNotificacion(aviso.id, aviso.hijo),
    cargarMas: () => void cargarMasNotificaciones(),
    marcarTodas: () => void marcarTodasLasNotificaciones(),
  }
}

// La barra de los portales: el apoderado ve la campana en api; la orientadora no recibe notificaciones y, en api,
// no ve campana. En local la barra sigue como antes (la campana sin función).
export const useCampanaPortal = () => ({ activa: modoApi })
