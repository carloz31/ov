import type { JourneyState } from '@/types/activities'
import { modoApi } from '@/config/env'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import { Building2, ClipboardList, Swords } from 'lucide-react'
import { challenges } from '@/data/content/challenges'
import { canStartChallenge } from '@/lib/challenges'
import { cityCases } from '@/data/content/adventure'
import type { AdventureState } from '@/types/adventure'
import type { StudentMapPoint } from './mapPoints'
import { puntosServidor } from './puntosServidor'
export function getCiudadPoints(adventure: AdventureState, journey: JourneyState): StudentMapPoint[] {
  if (modoApi) {
    // En api, la Ciudad solo muestra lo que entrega el servidor (ajuste limpiar-casos-antiguos-e-icono).
    return puntosServidor(obtenerEstadoServidor().actividades.datos, 'CIUDAD', 'ciudad')
  }
  const testCompleted = journey.progress['act-tip-01']?.estado === 'completada'
  const points: StudentMapPoint[] = [
    ...cityCases.map((item): StudentMapPoint => ({
      id: item.id,
      title: item.title,
      x: item.x,
      y: item.y,
      zone: 'ciudad',
      subtitle: adventure.solvedCaseIds.includes(item.id)
        ? 'La comunidad te agradece'
        : 'Un llamado de auxilio',
      icon: Building2,
      status: adventure.solvedCaseIds.includes(item.id)
        ? 'completed'
        : item.id === 'forest-fire'
          ? 'available'
          : 'locked',
      actionEnabled: item.id === 'forest-fire',
    })),
    {
      id: 'mara-test',
      title: 'Una vuelta por el molino',
      subtitle: testCompleted ? 'Test · Primera interacción completada' : 'Test · Interacción 1 de 14',
      x: 875,
      y: 530,
      icon: ClipboardList,
      status: testCompleted ? 'completed' : 'available',
      zone: 'ciudad',
      specActivityId: 'act-tip-01',
      actionEnabled: true,
    },
    ...challenges.map((c, i): StudentMapPoint => ({
      id: c.id,
      title: c.titulo,
      subtitle: `Desafío · ${c.nombre}`,
      x: 710 + i * 90,
      y: 365,
      zone: 'ciudad',
      icon: Swords,
      specActivityId: c.id,
      bloque: c.bloque,
      status:
        journey.progress[c.id]?.estado === 'completada'
          ? 'completed'
          : canStartChallenge(c, journey)
            ? 'available'
            : 'locked',
      actionEnabled: true,
    })),
  ]
  return points
}
