import type { JourneyState } from '@/types/activities'
import { modoApi } from '@/config/env'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import { progresoBloque } from '@/lib/servidor/contenidos'
import type { ActividadCuenta } from '@/types/servidor'
import { type LucideIcon } from 'lucide-react'
import { cityCases, fieldMissions } from '@/data/content/adventure'
import { canAccessCity } from '@/store/adventureStore'
import { lumiDayKey } from '@/lib/lumiFriendship'
import type { AdventureState } from '@/types/adventure'
import { missionComplete } from './missionSync'
export type StudentMapPoint = {
  id: string
  title: string
  subtitle: string
  x: number
  y: number
  icon: LucideIcon
  status: 'locked' | 'available' | 'completed'
  zone: 'camino' | 'ciudad'
  specActivityId?: string
  bloque?: number
  // Solo api: el nombre del bloque del servidor para el letrero del tramo.
  bloqueNombre?: string
  secuencia?: ActividadCuenta[]
  actionEnabled: boolean
  additional?: boolean
  // Solo api: presentación del servidor (candado en lo bloqueado; opcionales con «?» y sin píldora).
  presentacionServidor?: boolean
  // Solo api: la opcional es una misión adicional (`mapa.adicional`), no una misión extra.
  misionAdicional?: boolean
  // Solo api: el servidor no la exige para cerrar el tramo.
  opcional?: boolean
  originId?: string
  revealing?: boolean
  revealQueued?: boolean
}

export type StudentZone = 'missions' | 'central'

export function getZoneProgress(zone: StudentZone, adventure: AdventureState, journey: JourneyState) {
  if (modoApi) {
    const estado = obtenerEstadoServidor().actividades.datos
    return zone === 'missions'
      ? { label: 'Nivel de recorrido', value: progresoBloque(estado).porcentaje }
      : { label: 'Recorrido por la ciudad', value: progresoBloque(estado, 'CIUDAD').porcentaje }
  }
  return zone === 'missions'
    ? {
        label: 'Nivel de recorrido',
        value:
          (fieldMissions.filter((mission) => missionComplete(mission, adventure, journey)).length /
            fieldMissions.length) *
          100,
      }
    : {
        label: 'Afinidad con la ciudad',
        value: Math.round(
          (cityCases.filter((item) => adventure.solvedCaseIds.includes(item.id)).length / cityCases.length) *
            100,
        ),
      }
}

// En api la recomendada es siempre una requerida disponible; una opcional, solo si no queda ninguna.
export const recomendadaServidor = (points: StudentMapPoint[]) => {
  const disponible = (p: StudentMapPoint) => p.id !== 'city' && p.status === 'available'
  return points.find((p) => disponible(p) && !p.opcional) ?? points.find(disponible)
}

export function getRecommendedPoint(points: StudentMapPoint[]) {
  if (modoApi && points[0]?.zone === 'camino') return recomendadaServidor(points)
  if (points[0]?.zone === 'camino')
    return (
      points.find(
        (point) => (modoApi || !point.additional) && point.id !== 'city' && point.status === 'available',
      ) ?? points.find((point) => point.id === 'city' && point.status === 'available')
    )
  return points.find(
    (point) => point.status === 'available' && (point.actionEnabled || (modoApi && point.id === 'mara-test')),
  )
}

export function getReturnGreeting(adventure: AdventureState, point?: StudentMapPoint, now = new Date()) {
  if (!point) return undefined
  const today = lumiDayKey(now)
  const previous = adventure.visits
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day < today)
    .sort()
    .at(-1)
  if (!previous || (Date.parse(today) - Date.parse(previous)) / 86400000 < 3) return undefined
  return `¡Qué bueno verte de nuevo! Te espera ${point.title}.${!canAccessCity(adventure) ? ' La ciudad sigue esperándote al final del camino.' : ''}`
}
