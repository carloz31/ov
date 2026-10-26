import { useEffect } from 'react'
import { modoApi } from '@/config/env'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { getZoneProgress } from '@/features/adventure/lib/mapPoints'
import { ciudadDisponible, insigniasServidor } from '@/lib/servidor/adaptadores'
import { canAccessCity, getTravelerLevel, useAdventure } from '@/store/adventureStore'
import { paginasReveladasApi, useDiscovery } from '@/store/discoveryStore'
import { useJourney } from '@/store/journeyStore'
import { useLogrosServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { cargarInstrumentos } from '@/store/servidor/instrumentos'
import { getHelenaPages } from '../lib/helenaPages'
import { paginasLibroApi } from '../lib/helenaPagesApi'
import { getStudentAchievementGroups, vitrinaPasaporte } from '../lib/passport'
import { getOrderedPlans } from '../lib/plans'

export function useStudentProfile() {
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery()
  const context = useOccupationExplorationContext()
  // Las insignias del pasaporte; el avance y la afinidad llegan con el mapa (`avance`).
  useLogrosServidor()
  const servidor = useEstadoServidor()
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  // F03: las páginas del libro salen del avance de instrumentos, que se pide al abrir el perfil.
  useEffect(() => {
    if (modoApi) void cargarInstrumentos()
  }, [cuenta])
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
  // Ajuste del panel (F05): el mismo avance que el panel (`/avance` en api).
  const recorrido = getZoneProgress('missions', adventure, journey).porcentaje ?? 0
  const afinidadCiudad = ciudad ? (getZoneProgress('central', adventure, journey).porcentaje ?? 0) : 0
  const gruposApi = modoApi ? insigniasServidor(servidor.logros.datos) : undefined
  const badges = getStudentAchievementGroups(adventure, journey, gruposApi).flatMap((g, index) =>
    g.items.filter((b) => b.done).map((b) => ({ ...b, group: index })),
  )
  const visibleBadges = vitrinaPasaporte(adventure, discovery, journey, gruposApi, servidor.logros.datos?.vitrina)
  const pages = modoApi
    ? paginasLibroApi(
        servidor.actividades.datos,
        servidor.instrumentos,
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
