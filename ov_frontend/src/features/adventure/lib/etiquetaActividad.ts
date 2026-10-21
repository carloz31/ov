import type { ActividadCuenta } from '@/types/servidor'

const tipos: Record<ActividadCuenta['tipo'], string> = {
  INFORMATIVA: 'Informativa',
  REGISTRO: 'Registro',
  CUESTIONARIO: 'Test',
  CASO: 'Caso',
  BATALLA: 'Batalla',
}
export const tipoActividad = (actividad: ActividadCuenta) => tipos[actividad.tipo]
export const duracionActividad = (actividad: ActividadCuenta) =>
  actividad.duracion_estimada_min === null ? '' : `${actividad.duracion_estimada_min} min`
// Etiqueta del punto en el mapa y en el panel (api): tipo y duración del servidor, «Test · 10 min».
export const etiquetaActividad = (actividad: ActividadCuenta) =>
  [tipoActividad(actividad), duracionActividad(actividad)].filter(Boolean).join(' · ')
