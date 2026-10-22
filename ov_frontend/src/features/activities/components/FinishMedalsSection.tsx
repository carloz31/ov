import { Award, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { MedallaCierre } from '../lib/finishSummary'

// Insignias y niveles nuevos, como medallas compactas bajo el título; si hay ambas, apiladas.
export function FinishMedalsSection({ medallas }: { medallas: MedallaCierre[] }) {
  return (
    <ul className="sx-finish-medals" aria-label="Logros nuevos">
      {medallas.map((m) => {
        const Icon = m.tipo === 'INSIGNIA' ? Award : TrendingUp
        const contenido = (
          <>
            <span className="sx-finish-medal-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span>
              <small>{m.etiqueta}</small>
              <strong>{m.nombre}</strong>
            </span>
          </>
        )
        return (
          <li key={`${m.tipo}:${m.codigo}`}>
            {m.tipo === 'INSIGNIA' ? <Link to={appPaths.student.passport}>{contenido}</Link> : contenido}
          </li>
        )
      })}
    </ul>
  )
}
