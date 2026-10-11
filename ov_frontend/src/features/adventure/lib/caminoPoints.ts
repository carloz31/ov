import type { JourneyState } from '@/types/activities'
import { modoApi } from '@/config/env'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import { ciudadDisponible } from '@/lib/servidor/adaptadores'
import { activityById } from '@/data/activities/content'
import { Feather, KeyRound, type LucideIcon } from 'lucide-react'
import { fieldMissions, type FieldMission } from '@/data/content/adventure'
import { canAccessCity } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'
import { additionalMissions, baseRoute, pendingContent } from '@/data/activities/reflectionConfig'
import { getReflections } from '@/store/reflectionStore'
import { isWithinStudentDemo } from '@/config/studentDemoScope'
import { specActivityByMission } from './missionSync'
import { missionComplete } from './missionSync'
import type { StudentMapPoint } from './mapPoints'
import { iconosMapa } from './iconosMapa'
import { puntosServidor } from './puntosServidor'
import { actividadPorContenido } from '@/lib/servidor/contenidos'
export function getActivityType(mission: FieldMission) {
  if (mission.id === 'beliefs' || mission.kind === 'information') return 'Informativa'
  if (mission.kind === 'questionnaire') return 'Test'
  return 'Registro'
}

export function getMissionMeta(mission: FieldMission) {
  if (mission.id === 'pregones') return '10 min'
  if (mission.kind === 'information') return '4 min'
  if (mission.kind === 'reflection') return 'A tu ritmo'
  if (mission.kind === 'deliverable') return '5 min'
  return '6 min'
}

export function getMissionIcon(mission: FieldMission): LucideIcon {
  const type = getActivityType(mission)
  return iconosMapa[type === 'Informativa' ? 'informativa' : type === 'Test' ? 'test' : 'registro']
}

export const caminoSequence = baseRoute.map(([id]) => id)

export const orderedMissions = [
  ...caminoSequence.map((id) => fieldMissions.find((mission) => mission.id === id)!),
  ...fieldMissions.filter((mission) => !caminoSequence.some((id) => id === mission.id)),
]

export function getNextCaminoActivity(points: StudentMapPoint[]) {
  const next = points.find(
    (point) => (modoApi || !point.additional) && point.id !== 'city' && point.status === 'available',
  )
  return (
    (modoApi
      ? actividadPorContenido(obtenerEstadoServidor().actividades.datos, next?.specActivityId ?? '')
      : activityById(next?.specActivityId ?? '')) ?? null
  )
}

export function getCaminoPoints(adventure: AdventureState, journey: JourneyState): StudentMapPoint[] {
  if (modoApi) {
    const estado = obtenerEstadoServidor().actividades.datos
    return [
      ...puntosServidor(estado, 'CAMINO', 'camino'),
      {
        id: 'city',
        title: 'La llave de la ciudad',
        subtitle: ciudadDisponible(estado) ? 'Entrar a la ciudad' : 'Destino al completar el camino',
        x: 950,
        y: 480,
        icon: KeyRound,
        zone: 'camino',
        status: ciudadDisponible(estado) ? 'available' : 'locked',
        actionEnabled: true,
      },
    ]
  }
  return [
    ...orderedMissions.map((mission, index): StudentMapPoint => ({
      id: mission.id,
      title: mission.title,
      x: mission.x,
      y: mission.y,
      subtitle: !isWithinStudentDemo(specActivityByMission[mission.id] ?? '')
        ? 'No disponible'
        : pendingContent.has(specActivityByMission[mission.id] ?? '') &&
            !missionComplete(mission, adventure, journey)
          ? 'Contenido pendiente'
          : `${getActivityType(mission)} · ${getMissionMeta(mission)}`,
      icon: getMissionIcon(mission),
      zone: 'camino',
      specActivityId: specActivityByMission[mission.id],
      bloque: activityById(specActivityByMission[mission.id] ?? '')?.bloque,
      status: !isWithinStudentDemo(specActivityByMission[mission.id] ?? '')
        ? 'locked'
        : missionComplete(mission, adventure, journey)
          ? 'completed'
          : !pendingContent.has(specActivityByMission[mission.id] ?? '') &&
              (index === 0 || missionComplete(orderedMissions[index - 1], adventure, journey))
            ? 'available'
            : 'locked',
      actionEnabled: true,
    })),
    ...additionalMissions
      .filter(
        (m) => isWithinStudentDemo(m.id) && getReflections().desbloqueos.some((d) => d.actividadId === m.id),
      )
      .map((m): StudentMapPoint => ({
        id: m.id,
        title: m.titulo,
        subtitle: 'Registro · Misión adicional',
        ...m.posicionMapa,
        icon: Feather,
        zone: 'camino',
        specActivityId: m.id,
        bloque: 1,
        status: journey.progress[m.id]?.estado === 'completada' ? 'completed' : 'available',
        actionEnabled: true,
        additional: true,
        originId: m.puntoOrigen,
        revealing: !getReflections().desbloqueos.find((d) => d.actividadId === m.id)?.visto,
        revealQueued:
          !getReflections().desbloqueos.find((d) => d.actividadId === m.id)?.visto &&
          getReflections().desbloqueos.find((d) => !d.visto && isWithinStudentDemo(d.actividadId))
            ?.actividadId !== m.id,
      })),
    {
      id: 'city',
      title: 'La llave de la ciudad',
      subtitle: canAccessCity(adventure) ? 'Entrar a la ciudad' : 'Destino al completar el camino',
      x: 950,
      y: 480,
      icon: KeyRound,
      zone: 'camino',
      status: canAccessCity(adventure) ? 'available' : 'locked',
      actionEnabled: true,
    },
  ]
}
