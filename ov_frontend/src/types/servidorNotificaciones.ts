// app/schemas/notificaciones.py (ajuste notificaciones).
export type TipoNotificacion =
  | 'DESBLOQUEO'
  | 'RESPUESTA_CONVERSACION'
  | 'ENTREVISTA_DESTACADA'
  | 'ENTREVISTA_LEYENDA'
  | 'REACCION_ENTREVISTA'
export type NotificacionPublica = {
  codigo: string
  tipo: TipoNotificacion
  referencia: string
  nombre: string
  // DESBLOQUEO: el tipo de objetivo; REACCION_ENTREVISTA: el nombre de la reacción.
  detalle: string | null
  creada_en: string
  vista: boolean
  // Solo RESPUESTA_CONVERSACION del apoderado: el hijo del vínculo.
  estudiante: string | null
}
export type PaginaNotificaciones = { total: number; no_vistas: number; items: NotificacionPublica[] }
export type NotificacionesMarcadas = { marcadas: number }
