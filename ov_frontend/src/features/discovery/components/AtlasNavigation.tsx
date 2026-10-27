import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { busquedaRecordada } from '../lib/filtrosCatalogo'
export function AtlasNavigation({
  section,
  migas = true,
}: {
  section: 'careers' | 'professions' | 'institutions'
  // Ajuste catalogo-datos-reales: los detalles del servidor no llevan «Catálogo · …» bajo «volver».
  migas?: boolean
}) {
  const label = { careers: 'Carreras', professions: 'Ocupaciones', institutions: 'Instituciones' }[section]
  return (
    <div>
      <Link className="sx-d-back" to={appPaths.student.catalog[section] + busquedaRecordada(section)}>
        <ArrowLeft aria-hidden="true" />
        {label}
      </Link>
      {migas && <p className="sx-d-atlas-breadcrumb">Catálogo · {label}</p>}
    </div>
  )
}
