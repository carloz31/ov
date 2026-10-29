// Ajuste notificaciones: una notificación lista para el toast y la campana, y el modelo de la campana.
export type TipoAviso =
  'badge' | 'ficha' | 'ciudad' | 'nivel' | 'conversacion' | 'destacada' | 'leyenda' | 'reaccion'
export type AvisoServidor = {
  id: string
  kind: TipoAviso
  title: string
  description: string
  href: string
  // Llega de otra cuenta: nunca es toast y en la campana va primero, con su propio acento.
  asincrona: boolean
  vista: boolean
  // Apoderado: el hijo que se elige antes de abrir la conversación.
  hijo?: string
}
export type PortalNotificaciones = 'estudiante' | 'apoderado'
export type ModeloCampana = {
  recientes: AvisoServidor[]
  todas: AvisoServidor[]
  noVistas: number
  hayMas: boolean
  cargandoMas: boolean
  error: string
  abrir: (aviso: AvisoServidor) => void
  cargarMas: () => void
  marcarTodas: () => void
}
