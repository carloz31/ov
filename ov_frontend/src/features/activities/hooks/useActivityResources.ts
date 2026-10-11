import { useRef } from 'react'
import { modoApi } from '@/config/env'
import { fichaDisponible } from '@/lib/servidor/adaptadores'
import { useEstadoServidor } from '@/store/servidor/sesion'

import { catalog } from '@/data/activities/content'
import { updateJourney, useJourney } from '@/store/journeyStore'

export function useActivityResources(ids: string[]) {
  const state = useJourney()
  const servidor = useEstadoServidor()
  const returnFocus = useRef<HTMLElement | null>(null)
  const resources = [...new Set(ids)].flatMap(
    (id) => catalog.recursos.find((resource) => resource.id === id) ?? [],
  )

  function marcarLeida(resource: (typeof resources)[number]) {
    return updateJourney((current) => ({
      ...current,
      resources: modoApi ? current.resources : [...new Set([...current.resources, resource.id])],
      readResourceIds: [...new Set([...(current.readResourceIds ?? current.resources), resource.id])],
    }))
  }
  function guardarRecurso(resource: (typeof resources)[number]) {
    return updateJourney((current) => ({
      ...current,
      resources: [...new Set([...current.resources, resource.id])],
    }))
  }
  return {
    state,
    returnFocus,
    resources: resources.map((resource) => ({
      ...resource,
      mostrarDisponibilidad: modoApi && resource.guardableEnRecursos,
      disponible: fichaDisponible(servidor.fichas.datos, resource.id),
      puedeGuardar: !modoApi && resource.guardableEnRecursos && !!(resource.url || resource.contenido),
    })),
    marcarLeida,
    guardarRecurso,
  }
}
