import { modoApi } from '@/config/env'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { getZoneProgress } from '@/features/adventure/lib/mapPoints'
import { ciudadDisponible, insigniasServidor, paginaInteresesServidor } from '@/lib/servidor/adaptadores'
import { progresoBloque } from '@/lib/servidor/contenidos'
import { canAccessCity, getTravelerLevel, useAdventure } from '@/store/adventureStore'
import { paginasReveladasApi, useDiscovery } from '@/store/discoveryStore'
import { useJourney } from '@/store/journeyStore'
import { useLogrosServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { getAchievementPresentations } from '../lib/achievements'
import { getHelenaPages, getHelenaPagesApi } from '../lib/helenaPages'
import { getProfileBadges, getStudentAchievementGroups } from '../lib/passport'
import { getOrderedPlans } from '../lib/plans'

export function useStudentProfile() {
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery()
  const context = useOccupationExplorationContext()
  useLogrosServidor()
  const servidor = useEstadoServidor()
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  const nombre = modoApi ? (servidor.resumen.datos?.cuenta.nombre ?? 'Mi perfil') : 'Alex'
  const iniciales = modoApi
    ? nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join('')
        .toLocaleUpperCase()
    : 'AL'
  const level = modoApi
    ? getTravelerLevel(adventure, servidor.resumen.datos?.nivel_actual ?? null)
    : getTravelerLevel(adventure)
  const ciudad = modoApi ? ciudadDisponible(servidor.actividades.datos) : canAccessCity(adventure)
  const recorrido = modoApi
    ? progresoBloque(servidor.actividades.datos).porcentaje
    : getZoneProgress('missions', adventure, journey).value
  const afinidadCiudad = ciudad
    ? modoApi
      ? progresoBloque(servidor.actividades.datos, 'CIUDAD').porcentaje
      : getZoneProgress('central', adventure, journey).value
    : 0
  const gruposApi = modoApi
    ? insigniasServidor(servidor.logros.datos, getAchievementPresentations())
    : undefined
  const badges = getStudentAchievementGroups(adventure, journey, gruposApi).flatMap((g, index) =>
    g.items.filter((b) => b.done).map((b) => ({ ...b, group: index })),
  )
  const visibleBadges = getProfileBadges(
    adventure,
    discovery,
    journey,
    gruposApi ? { grupos: gruposApi, cuenta: cuenta ?? '' } : undefined,
  )
  const pages = modoApi
    ? getHelenaPagesApi(
        paginaInteresesServidor(
          servidor.actividades.datos,
          servidor.resultadoRiasec,
          discovery,
          cuenta ?? null,
        ),
        paginasReveladasApi(discovery, cuenta, servidor.resultadoRiasec?.calculado_en),
      )
    : getHelenaPages(journey, discovery)
  const plans = getOrderedPlans(context.decisionSheets, discovery.planOrder)
  const extraFavorites = context.careerInterestIds.filter(
    (id) => !plans.some((p) => p.sourceId === id),
  ).length
  return {
    adventure,
    journey,
    context,
    nombre,
    iniciales,
    level,
    recorrido,
    ciudad,
    afinidadCiudad,
    badges,
    visibleBadges,
    pages,
    plans,
    extraFavorites,
  }
}
