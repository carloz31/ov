import { Link } from 'react-router'
import { Eye } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'
import { RouteLine, type RouteLineTramo } from '@/components/student/RouteLine'
import { achievementIcons } from '../lib/passport'
import type { TravelerLevel } from '@/store/adventureStore'
import type { PassportBadge } from '@/types/profile'

// Ajuste pasaporte-perfil: ficha del viajero con su título, la línea de ruta y la vitrina.
export function ProfileHeader({
  nombre,
  iniciales,
  level,
  tramos,
  requeridas,
  vitrina,
}: {
  nombre: string
  iniciales: string
  level: TravelerLevel | null
  tramos: RouteLineTramo[]
  requeridas: { completadas: number; total: number }
  vitrina: PassportBadge[]
}) {
  return (
    <Parchment className="sx-d-dark">
      <div className="sx-d-traveler">
        <span className="sx-d-avatar">
          {iniciales}
          {level && <span className="sx-d-avatar-level">NIVEL {level.number}</span>}
        </span>
        <div>
          <p className="sx-d-eyebrow">Ficha del viajero</p>
          <h1>
            {nombre}
            {level && (
              <>
                , <span className="sx-d-title-gold">{level.label}</span>
              </>
            )}
          </h1>
          {level ? <p>{level.description}</p> : <p>No hay un nivel disponible en el servidor.</p>}
          <RouteLine tramos={tramos} completadas={requeridas.completadas} total={requeridas.total} />
        </div>
        <aside className="sx-d-showcase">
          <p className="sx-d-eyebrow">
            <Eye aria-hidden="true" size={16} />
            Tu vitrina
          </p>
          <p>Lo único que ven tus compañeros: tu título y hasta tres sellos.</p>
          <div className="sx-d-showcase-slots">
            {[0, 1, 2].map((i) => {
              const badge = vitrina[i]
              const Icon = badge ? (achievementIcons[badge.icon] ?? achievementIcons.sparkles) : undefined
              return (
                <span key={i} className="sx-d-showcase-slot" data-empty={!badge}>
                  {Icon && <Icon aria-hidden="true" size={26} />}
                  <span className="sr-only">{badge ? badge.title : 'Ranura vacía'}</span>
                </span>
              )
            })}
          </div>
          <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.passport}>
            Elegir qué muestro
          </Link>
        </aside>
      </div>
    </Parchment>
  )
}
