import type { PassportBadge } from '@/types/profile'
export type { PassportBadge } from '@/types/profile'
import {
  Compass,
  Flame,
  KeyRound,
  MessageCircle,
  Send,
  Shield,
  Sparkles,
  Telescope,
  Users,
} from 'lucide-react'
import { getAchievementGroups } from '@/features/discovery/lib/achievements'
import type { AchievementGroup } from '@/types/profile'
import type { AdventureState } from '@/types/adventure'
import type { StudentDiscoveryState } from '@/types/discovery'
import type { JourneyState } from '@/types/activities'
import { challenges } from '@/data/content/challenges'
import { appPaths } from '@/routes/paths'
import { additionalMissions } from '@/data/activities/reflectionConfig'
// Presentation names copied in order from getTravelerLevel in AdventureStore; calculations stay there.
export const travelerTitles = [
  'Observador del horizonte',
  'Recolector de pistas',
  'Cartógrafo de posibilidades',
  'Explorador de la ciudad',
  'Autor de su rumbo',
] as const
// Same correspondence as the existing AdventureAchievementsView.
export const achievementIcons = {
  campfire: Flame,
  compass: Compass,
  key: KeyRound,
  message: MessageCircle,
  people: Users,
  send: Send,
  shield: Shield,
  sparkles: Sparkles,
  telescope: Telescope,
}
export function getStudentAchievementGroups(
  adventure: AdventureState,
  journey?: JourneyState,
  gruposApi?: AchievementGroup[],
) {
  if (gruposApi !== undefined) return gruposApi
  const badges: PassportBadge[] = challenges.flatMap((c) =>
    c.logroOculto && /^I\d+$/.test(c.logroOculto.codigo)
      ? [
          {
            code: c.logroOculto.codigo as `I${number}`,
            title: c.logroOculto.nombre,
            hidden: true,
            done: !!journey?.challengeResults?.some((r) => r.logroOculto === c.logroOculto?.codigo),
            icon: 'sparkles',
            message: `Disipaste a ${c.nombre} sin perder destellos.`,
            description: 'Vence al enemigo sin perder destellos en tu primera victoria.',
            metaphor: 'La información hace brillar tu camino.',
            vocationalMeaning: 'Contrastar las ideas te permite explorar con mejores preguntas.',
          },
        ]
      : [],
  )
  badges.push(
    ...additionalMissions
      .filter((m) => journey?.progress[m.id]?.estado === 'completada')
      .map((m): PassportBadge => ({
        code: m.insignia.codigo,
        title: m.insignia.nombre,
        hidden: true,
        done: true,
        icon: 'sparkles',
        message: `Completaste ${m.titulo}.`,
        description: m.descripcion,
        metaphor: 'Una nueva mirada viaja contigo.',
        vocationalMeaning: 'Explorar tu historia y tus ideas amplía tus posibilidades.',
      })),
  )
  return [
    ...getAchievementGroups(adventure),
    ...(badges.length
      ? [
          {
            title: 'La luz que despeja caminos',
            description: 'Descubrimientos que aparecen al enfrentar ideas equivocadas.',
            icon: 'key' as const,
            items: badges,
          },
        ]
      : []),
  ]
}
export const badgeDestinations: Record<string, { label: string; href: string }> = {
  I1: { label: 'Ir al camino', href: appPaths.student.missions },
  I2: { label: 'Ir al camino', href: appPaths.student.missions },
  I3: { label: 'Ir al camino', href: appPaths.student.missions },
  I4: { label: 'Ir a mi Crew', href: appPaths.student.community },
  I5: { label: 'Ir a mi Crew', href: appPaths.student.community },
  I6: { label: 'Ir a En familia', href: appPaths.student.conversations },
  I7: { label: 'Ir a la Central de Casos', href: appPaths.student.exploration },
  I8: { label: 'Ir a Investigaciones', href: appPaths.student.research },
  I9: { label: 'Ir a la Central de Casos', href: appPaths.student.exploration },
}
// Vitrina local (modo local congelado): sin elección, las tres primeras obtenidas.
export function getProfileBadges(adventure: AdventureState, discovery: StudentDiscoveryState, journey?: JourneyState) {
  const earned = getStudentAchievementGroups(adventure, journey).flatMap((g, index) =>
    g.items.filter((b) => b.done).map((b) => ({ ...b, group: index })),
  )
  return discovery.profileBadgesConfigured
    ? discovery.profileBadges
        .flatMap((code) => {
          const badge = earned.find((b) => b.code === code)
          return badge ? [badge] : []
        })
        .slice(0, 3)
    : earned.slice(0, 3)
}
export function toggleProfileBadge(
  discovery: StudentDiscoveryState,
  adventure: AdventureState,
  code: string,
  journey?: JourneyState,
): StudentDiscoveryState {
  if (!getStudentAchievementGroups(adventure, journey).some((g) => g.items.some((b) => b.code === code && b.done)))
    return discovery
  const selected: string[] = getProfileBadges(adventure, discovery, journey).map((b) => b.code)
  if (!selected.includes(code) && selected.length >= 3) return discovery
  return {
    ...discovery,
    profileBadgesConfigured: true,
    profileBadges: selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code],
  }
}
// Ajuste pasaporte-perfil: en api la vitrina es la del servidor, en su orden y sin valor por defecto; en local,
// la de siempre.
export function vitrinaPasaporte(
  adventure: AdventureState,
  discovery: StudentDiscoveryState,
  journey?: JourneyState,
  gruposApi?: AchievementGroup[],
  codigos?: string[],
) {
  if (!gruposApi) return getProfileBadges(adventure, discovery, journey)
  const obtenidas = gruposApi.flatMap((g, index) => g.items.filter((b) => b.done).map((b) => ({ ...b, group: index })))
  return (codigos ?? []).flatMap((code) => obtenidas.filter((b) => b.code === code))
}
// Ajuste pasaporte-perfil: los títulos del viaje; en api, los niveles del servidor; en local, `travelerTitles`.
export function titulosViaje(
  numeroActual: number | undefined,
  niveles?: { numero: number; titulo: string; estado: 'BLOQUEADO' | 'OBTENIDO' }[],
) {
  if (numeroActual === undefined) return []
  return niveles
    ? niveles.map((n) => ({ numero: n.numero, titulo: n.titulo, obtenido: n.estado === 'OBTENIDO' }))
    : travelerTitles.map((titulo, i) => ({ numero: i + 1, titulo, obtenido: i + 1 < numeroActual }))
}
export const numeroPagina = (indice: number) => ['I', 'II', 'III', 'IV', 'V', 'VI'][indice] ?? String(indice + 1)
export function recordBadgeFirstSeenAt(
  discovery: StudentDiscoveryState,
  adventure: AdventureState,
  now = new Date().toISOString(),
  journey?: JourneyState,
): StudentDiscoveryState {
  const codes = getStudentAchievementGroups(adventure, journey).flatMap((g) =>
    g.items.filter((b) => b.done && !discovery.badgeFirstSeenAt[b.code]).map((b) => b.code),
  )
  return codes.length
    ? {
        ...discovery,
        badgeFirstSeenAt: {
          ...discovery.badgeFirstSeenAt,
          ...Object.fromEntries(
            codes.map((code) => [
              code,
              journey?.challengeResults?.find((r) => r.logroOculto === code)?.fechaHora ?? now,
            ]),
          ),
        },
      }
    : discovery
}
