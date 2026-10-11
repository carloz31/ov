import { useLogrosServidor } from '@/store/servidor/secciones'
import { useState } from 'react'

import { useJourney } from '@/store/journeyStore'
import { getTravelerLevel, useAdventure } from '@/store/adventureStore'

import { useDiscovery } from '@/store/discoveryStore'

import {
  getProfileBadges,
  getStudentAchievementGroups,
  travelerTitles,
} from '@/features/discovery/lib/passport'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { insigniasServidor, insigniasOcultasPendientes } from '@/lib/servidor/adaptadores'
import { getAchievementPresentations } from '@/features/discovery/lib/achievements'

export function usePassport() {
  useLogrosServidor()
  const servidor = useEstadoServidor()
  const gruposApi = modoApi
    ? insigniasServidor(servidor.logros.datos, getAchievementPresentations())
    : undefined
  const api = gruposApi
    ? { grupos: gruposApi, cuenta: servidor.resumen.datos?.cuenta.codigo ?? '' }
    : undefined
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
    visible = getProfileBadges(adventure, discovery, journey, api)
  const groupIndex = groups.findIndex((g) => g.items.some((b) => b.code === selectedCode)),
    group = groups[groupIndex],
    selected = group?.items.find((b) => b.code === selectedCode)
  const titulos = level
    ? modoApi
      ? (servidor.logros.datos?.niveles.map((n) => ({
          numero: n.numero,
          titulo: n.titulo,
          obtenido: n.estado === 'OBTENIDO',
        })) ?? [])
      : travelerTitles.map((titulo, i) => ({
          numero: i + 1,
          titulo,
          obtenido: i + 1 < level.number,
        }))
    : []
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
    total: modoApi ? (servidor.logros.datos?.insignias.length ?? 0) : all.length,
    ocultasPendientes: modoApi ? insigniasOcultasPendientes(servidor.logros.datos) : 0,
  }
}
