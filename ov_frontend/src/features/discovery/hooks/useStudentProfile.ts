import { useEffect, useMemo } from 'react'
import { modoApi } from '@/config/env'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { getZoneProgress } from '@/features/adventure/lib/mapPoints'
import { insigniasServidor } from '@/lib/servidor/adaptadores'
import { getTravelerLevel, useAdventure } from '@/store/adventureStore'
import { paginasReveladasApi, useDiscovery } from '@/store/discoveryStore'
import { useJourney } from '@/store/journeyStore'
import { useLogrosServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { cargarInstrumentos } from '@/store/servidor/instrumentos'
import { getHelenaPages } from '../lib/helenaPages'
import { paginasLibroApi } from '../lib/helenaPagesApi'
import { getStudentAchievementGroups, titulosViaje, vitrinaPasaporte } from '../lib/passport'
import { getOrderedPlans, getPlanCompleteness } from '../lib/plans'
import { useProgresoNivel } from './useProgresoNivel'
import { useFavoritosCatalogo } from './useFavoritosCatalogo'
import { usePlanesServidor } from '@/features/plans/hooks/usePlanesServidor'
import { seccionesListas } from '@/lib/servidor/adaptadoresPlanes'
import type { RouteLineTramo } from '@/components/student/RouteLine'

export function useStudentProfile() {
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery()
  const context = useOccupationExplorationContext()
  const favoritosCatalogo = useFavoritosCatalogo()
  const planesServidor = usePlanesServidor()
  // Las insignias del pasaporte; el avance llega con el mapa (`avance`).
  useLogrosServidor()
  const servidor = useEstadoServidor()
  const cuenta = servidor.resumen.datos?.cuenta.codigo
  const logros = servidor.logros.datos
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
  // Ajuste pasaporte-perfil: la línea de ruta, un hito por tramo del camino (`/avance`); en local, un solo tramo.
  const avance = servidor.avance.datos
  const local = modoApi ? undefined : getZoneProgress('missions', adventure, journey)
  const tramos: RouteLineTramo[] = modoApi
    ? (avance?.tramos.map((t) => ({ nombre: t.nombre, estado: t.estado, completadas: t.completadas, total: t.total })) ??
      [])
    : [
        {
          nombre: 'Misiones de campo',
          estado: local?.completadas === local?.total ? 'COMPLETO' : 'ACTUAL',
          completadas: local?.completadas ?? 0,
          total: local?.total ?? 0,
        },
      ]
  const requeridas = modoApi
    ? (avance?.requeridas ?? { completadas: 0, total: 0 })
    : { completadas: local?.completadas ?? 0, total: local?.total ?? 0 }
  const gruposApi = useMemo(() => (modoApi ? insigniasServidor(logros) : undefined), [logros])
  const todas = getStudentAchievementGroups(adventure, journey, gruposApi).flatMap((g, index) =>
    g.items.map((b) => ({ ...b, group: index })),
  )
  const badges = todas.filter((b) => b.done)
  // Las obtenidas más recientes primero (en local, sin fecha, en su orden).
  const sellos = [
    ...[...badges].sort((a, b) => (b.obtenidaEn ?? '').localeCompare(a.obtenidaEn ?? '')),
    ...todas.filter((b) => !b.done),
  ]
  const visibleBadges = vitrinaPasaporte(adventure, discovery, journey, gruposApi, logros?.vitrina)
  const titulos = titulosViaje(level?.number, modoApi ? (logros?.niveles ?? []) : undefined)
  const siguiente = level ? titulos.find((t) => t.numero === level.number + 1) : undefined
  const condiciones = useProgresoNivel(siguiente?.numero, level?.nextStep)
  const pages = (
    modoApi
      ? paginasLibroApi(
          servidor.actividades.datos,
          servidor.instrumentos,
          paginasReveladasApi(discovery, cuenta, servidor.resultadoRiasec?.calculado_en),
        )
      : getHelenaPages(journey, discovery)
  ).map((p) => ({
    ...p,
    // Partida revelada sin la llegada (sin comparación): «la llegada se escribe al final».
    llegadaPendiente: p.id === 'partida-llegada' && 'conComparacion' in p && !p.conComparacion,
  }))
  const destacada = pages.find((p) => p.state === 'ready')
  // F07a: en api, los planes del servidor con «Lista para comparar» o «N de 4 secciones listas».
  const plans = planesServidor.usaTarjetaV4
    ? (planesServidor.datos?.planes ?? []).map((p) => ({
        id: p.carrera.codigo,
        name: p.carrera.nombre,
        armado: Math.round((seccionesListas(p) / 4) * 100),
        resumen: p.lista_para_comparar ? 'Lista para comparar' : `${seccionesListas(p)} de 4 secciones listas`,
      }))
    : getOrderedPlans(context.decisionSheets, discovery.planOrder).map((p) => ({
        ...p,
        armado: Math.round((getPlanCompleteness(p) / 4) * 100),
      }))
  return {
    nombre,
    iniciales,
    level,
    tramos,
    requeridas,
    badges,
    sellos,
    visibleBadges,
    siguiente: siguiente && { titulo: siguiente.titulo, condiciones },
    destacada,
    pages: pages.filter((p) => p !== destacada),
    plans,
    espacioLibre: planesServidor.usaTarjetaV4 ? 'Espacio libre' : undefined,
    // F06: en api, los conteos salen de los favoritos del servidor.
    favoritos: favoritosCatalogo.favoritosDelServidor
      ? {
          carreras: favoritosCatalogo.favoritos?.carreras.length ?? 0,
          ocupaciones: favoritosCatalogo.favoritos?.ocupaciones.length ?? 0,
          instituciones: favoritosCatalogo.favoritos?.instituciones.length ?? 0,
        }
      : {
          carreras: context.careerInterestIds.length,
          ocupaciones: context.profiles.filter((p) => p.interested).length,
          instituciones: context.institutionInterestIds.length,
        },
  }
}
