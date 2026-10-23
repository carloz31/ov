import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import type { Actividad } from '@/types/activities'

// Ajuste del diario (F05): la historia de Lumi son actividades informativas del bloque LUMI (`t-lumi-1`…`t-lumi-5`).
// En api, el título, el estado y el requisito los da el servidor; en local, el contenido y los umbrales de la
// amistad local (`lumiMemoryThresholds`).
export const capitulosLumi: Actividad[] = [1, 2, 3, 4, 5].map((numero) => {
  const { mapa: _mapa, ...contenido } = contenidoPorClave(`t_lumi_${numero}`)!
  return { ...contenido, id: `t-lumi-${numero}` }
})
