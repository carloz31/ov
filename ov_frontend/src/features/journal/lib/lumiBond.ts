import {
  lumiDayKey,
  lumiFriendshipRules,
  normalizeLumiRegistrations,
  type LumiRegistration,
} from '@/lib/lumiFriendship'
export const lumiMemoryThresholds = [1, 5, 10, 15] as const
const levels = [
  { minimum: 0, label: 'Conociéndonos' },
  { minimum: 5, label: 'Ganando confianza' },
  { minimum: 10, label: 'Compañeras de ruta' },
  { minimum: 15, label: 'Amistad de viaje' },
]
export type LumiBond = {
  conversations: number
  todayCounted: number
  remainingToday: number
  level: string
  levelIndex: number
  memoriesOpened: number
  nextMemoryAt?: number
  progress: number
  // F05: en api, puntos y nivel del servidor; un recuerdo por nivel y sin el conteo de hoy.
  fuente?: 'servidor'
}
export function lumiBondServidor(amistad: {
  puntos: number
  nivel: string
  indiceNivel: number
  recuerdosAbiertos: number
  siguienteEn?: number
}): LumiBond {
  return {
    conversations: amistad.puntos,
    todayCounted: 0,
    remainingToday: lumiFriendshipRules.dailyPointLimit,
    level: amistad.nivel,
    levelIndex: amistad.indiceNivel,
    memoriesOpened: amistad.recuerdosAbiertos,
    nextMemoryAt: amistad.siguienteEn,
    progress: amistad.siguienteEn ? Math.min(100, (amistad.puntos / amistad.siguienteEn) * 100) : 100,
    fuente: 'servidor',
  }
}
export function getLumiBond(registrations: LumiRegistration[], now = new Date()): LumiBond {
  const days = new Map<string, number>()
  for (const item of normalizeLumiRegistrations(registrations)) {
    if (Date.parse(item.createdAt) > now.getTime()) continue
    const day = lumiDayKey(new Date(item.createdAt))
    days.set(day, (days.get(day) ?? 0) + 1)
  }
  const conversations = [...days.values()].reduce(
    (sum, count) => sum + Math.min(count, lumiFriendshipRules.dailyPointLimit),
    0,
  )
  const todayCounted = Math.min(days.get(lumiDayKey(now)) ?? 0, lumiFriendshipRules.dailyPointLimit)
  const levelIndex = levels.findLastIndex((l) => conversations >= l.minimum)
  const memoriesOpened = lumiMemoryThresholds.filter((t) => conversations >= t).length
  const nextMemoryAt = lumiMemoryThresholds[memoriesOpened]
  const previous = memoriesOpened ? lumiMemoryThresholds[memoriesOpened - 1] : 0
  return {
    conversations,
    todayCounted,
    remainingToday: lumiFriendshipRules.dailyPointLimit - todayCounted,
    level: levels[levelIndex].label,
    levelIndex,
    memoriesOpened,
    nextMemoryAt,
    progress:
      nextMemoryAt === undefined ? 100 : ((conversations - previous) / (nextMemoryAt - previous)) * 100,
  }
}
