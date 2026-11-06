import { useEffect, useRef } from 'react'
import { modoApi } from '@/config/env'
import { updateDiscovery } from '@/store/discoveryStore'
import { verEnCatalogo } from '@/store/servidor/catalogo'
import { useModoCatalogo } from './useModoCatalogo'

const clases = { career: 'carreras', occupation: 'ocupaciones', institution: 'instituciones' } as const

// Una vez por apertura del detalle (la guarda por código evita el doble efecto de StrictMode). En api (F06), la
// vista va al servidor, que puede abrir t-explorar; en local se guarda en el navegador como antes.
export function useCatalogVisit(kind: 'career' | 'occupation' | 'institution', id?: string) {
  const lastVisit = useRef<string | undefined>(undefined)
  // Ajuste catalogo-apoderado: el apoderado y la orientadora no registran vistas.
  const { modoLectura } = useModoCatalogo()
  useEffect(() => {
    if (!id || lastVisit.current === `${kind}:${id}`) return
    lastVisit.current = `${kind}:${id}`
    if (modoApi) {
      if (!modoLectura) void verEnCatalogo(clases[kind], id)
    } else if (kind !== 'institution') {
      const tipo = kind === 'career' ? 'VISTA_CARRERA' : 'VISTA_OCUPACION'
      updateDiscovery((s) => ({
        ...s,
        viewedCareerIds: kind === 'career' ? [...new Set([...s.viewedCareerIds, id])] : s.viewedCareerIds,
        catalogVisits: [...s.catalogVisits, { tipo, referencia: id, fechaHora: new Date().toISOString() }],
      }))
    }
    const heading = document.querySelector<HTMLElement>('.sx-d-detail-title')
    // Ajuste catalogo-datos-reales: en api el detalle se abre desde arriba (con su cabecera y «volver»), no desde
    // el título.
    const inicio = modoApi ? document.querySelector<HTMLElement>('.sx-discovery') : heading
    inicio?.scrollIntoView({ block: 'start' })
    heading?.focus({ preventScroll: true })
  }, [kind, id, modoLectura])
}
