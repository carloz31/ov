import { useEffect, useRef } from 'react'
import { updateDiscovery } from '@/store/discoveryStore'
export function useCatalogVisit(kind: 'career' | 'occupation', id?: string) {
  const lastVisit = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!id || lastVisit.current === `${kind}:${id}`) return
    lastVisit.current = `${kind}:${id}`
    const tipo = kind === 'career' ? 'VISTA_CARRERA' : 'VISTA_OCUPACION'
    updateDiscovery((s) => ({
      ...s,
      viewedCareerIds: kind === 'career' ? [...new Set([...s.viewedCareerIds, id])] : s.viewedCareerIds,
      catalogVisits: [...s.catalogVisits, { tipo, referencia: id, fechaHora: new Date().toISOString() }],
    }))
    const heading = document.querySelector<HTMLElement>('.sx-d-detail-title')
    heading?.scrollIntoView({ block: 'start' })
    heading?.focus({ preventScroll: true })
  }, [kind, id])
}
