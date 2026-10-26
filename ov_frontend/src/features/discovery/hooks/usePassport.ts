import { useLogrosServidor } from '@/store/servidor/secciones'
import { useState } from 'react'

import { useJourney } from '@/store/journeyStore'
import { getTravelerLevel, useAdventure } from '@/store/adventureStore'

import { useDiscovery } from '@/store/discoveryStore'

import {
  getStudentAchievementGroups,
  titulosViaje,
  vitrinaPasaporte,
} from '@/features/discovery/lib/passport'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { insigniasServidor } from '@/lib/servidor/adaptadores'
import { useProgresoNivel } from './useProgresoNivel'

export function usePassport() {
  useLogrosServidor()
  const servidor = useEstadoServidor()
  const logros = servidor.logros.datos
  const gruposApi = modoApi ? insigniasServidor(logros) : undefined
  const adventure = useAdventure(),
    discovery = useDiscovery(),
    journey = useJourney(),
    groups = getStudentAchievementGroups(adventure, journey, gruposApi),
    level = modoApi
      ? getTravelerLevel(adventure, servidor.resumen.datos?.nivel_actual ?? null)
      : getTravelerLevel(adventure)
  const [selectedCode, setSelectedCode] = useState<string>()
  const all = groups.flatMap((g) => g.items),
    earned = all.filter((b) => b.done),
    visible = vitrinaPasaporte(adventure, discovery, journey, gruposApi, logros?.vitrina)
  const groupIndex = groups.findIndex((g) => g.items.some((b) => b.code === selectedCode)),
    group = groups[groupIndex],
    selected = group?.items.find((b) => b.code === selectedCode)
  const titulos = titulosViaje(level?.number, modoApi ? (logros?.niveles ?? []) : undefined)
  // Ajuste pasaporte-perfil: el siguiente título sale de la lista de niveles, no de `travelerTitles`.
  const siguiente = level ? titulos.find((t) => t.numero === level.number + 1) : undefined
  const condiciones = useProgresoNivel(siguiente?.numero, level?.nextStep)
  return {
    groups,
    level,
    setSelectedCode,
    earned,
    visible,
    groupIndex,
    group,
    selected,
    titulos,
    siguiente: siguiente && { titulo: siguiente.titulo, condiciones },
    total: all.length,
  }
}
