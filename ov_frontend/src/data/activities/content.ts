import rawCatalog from './catalogo.json'
import { validateActivity } from '@/lib/activities/validation'
import type { Actividad, Instrumento, Personaje, Recurso } from '@/types/activities'
import { compassInstrument } from './standardActivities'
import { contenidos } from './contenidos.ts'
import { configureStudentActivities } from '@/data/activities/reflectionConfig'

export const catalog = rawCatalog as {
  personajes: Personaje[]
  recursos: Recurso[]
  instrumentos: Instrumento[]
  piezasLlave: { id: string; nombre: string; descripcion: string }[]
}
catalog.instrumentos.push(compassInstrument)
const allActivities = [
  'mision_bienvenida',
  'registro_huellas',
  'registro_horizonte',
  'mision_brujula',
  'registro_mochila',
  'registro_siguiente_paso',
  'registro_linea_tiempo',
  'encuentro_mitos',
  'instrumento_mara',
  'registro_mis_pregones',
  'pad_01_acompanar',
  'pad_02_informacion',
].map(actividadLocal)
for (const activity of allActivities) validateActivity(activity)
export const activities = configureStudentActivities(
  allActivities.filter((activity) => (activity.audiencia ?? 'estudiante') === 'estudiante'),
)
for (const activity of activities) validateActivity(activity)
export const parentActivities = allActivities
  .filter((activity) => activity.audiencia === 'apoderado')
  .sort((a, b) => a.orden - b.orden)
export const tipActivityIds = Array.from(
  { length: 14 },
  (_, i) => `act-tip-${String(i + 1).padStart(2, '0')}`,
)
export const finalActivity = actividadLocal('encuentro_resultado_elena')
export const activityById = (id: string) => activities.find((activity) => activity.id === id)

function actividadLocal(clave: string): Actividad {
  const actividad = { ...contenidos[clave] }
  delete actividad.mapa
  return actividad
}
