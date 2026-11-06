import { BriefcaseBusiness, GraduationCap, School } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { busquedaRecordada } from '../lib/filtrosCatalogo'
import { useModoCatalogo } from '../hooks/useModoCatalogo'

const sections = [
  { id: 'professions', label: 'Profesiones', Icon: BriefcaseBusiness },
  { id: 'careers', label: 'Carreras', Icon: GraduationCap },
  { id: 'institutions', label: 'Instituciones educativas', Icon: School },
] as const

export function CatalogNavigation() {
  const { pathname } = useLocation()
  const { rutas } = useModoCatalogo()
  return (
    <nav className="sx-d-catalog-nav" aria-label="Secciones del catálogo">
      {sections.map(({ id, label, Icon }) => (
        <Link
          key={id}
          // Ajuste catalogo-datos-reales (F6a): vuelve a la última búsqueda de esa pestaña (solo en api).
          to={rutas.catalog[id] + busquedaRecordada(id)}
          aria-current={pathname.split('/')[3] === id ? 'page' : undefined}
        >
          <Icon aria-hidden="true" size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
