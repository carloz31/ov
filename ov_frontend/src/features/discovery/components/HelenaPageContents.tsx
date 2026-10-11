import { ChartNoAxesColumn, BriefcaseBusiness, GraduationCap, Compass } from 'lucide-react'
import type { ContenidoPagina } from '../types'

const iconos = {
  perfil: ChartNoAxesColumn,
  ocupaciones: BriefcaseBusiness,
  carreras: GraduationCap,
  ideas: Compass,
}

export function HelenaPageContents({ contenidos }: { contenidos: ContenidoPagina[] }) {
  return (
    <section className="sx-d-helena-contents" aria-label="En tu resultado completo">
      <h3>En tu resultado completo</h3>
      <ul>
        {contenidos.map((contenido) => {
          const Icono = iconos[contenido.icono]
          return (
            <li key={contenido.icono}>
              <Icono aria-hidden="true" />
              <span>{contenido.texto}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
