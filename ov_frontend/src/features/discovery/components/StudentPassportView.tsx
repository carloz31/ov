import { usePassport } from '../hooks/usePassport'

import { Link } from 'react-router'
import { ArrowLeft, Award, Eye } from 'lucide-react'

import { appPaths } from '@/routes/paths'
import { DiscoveryStage } from './DiscoveryStage'

import { PassportBadgeDialog } from './PassportBadgeDialog'
import { PassportGroup } from './PassportGroup'
import { PassportLevelCard } from './PassportLevelCard'
import '../styles/passport.css'

export function StudentPassportView() {
  const { groups, level, setSelectedCode, earned, visible, groupIndex, group, selected, titulos, siguiente, total } =
    usePassport()

  return (
    <DiscoveryStage ambient="profile">
      <div className="sx-p-passport">
        <Link className="sx-d-back" to={appPaths.student.profile}>
          <ArrowLeft aria-hidden="true" />
          Mi perfil
        </Link>
        <header className="sx-d-header">
          <div>
            <h1>Pasaporte vocacional</h1>
            <p>Cada sello cuenta una parte de tu viaje. Pulsa uno para leer la historia que guarda.</p>
          </div>
          <div className="sx-p-pills">
            <span className="sx-p-total">
              <Award aria-hidden="true" />
              {earned.length} de {total} sellos
            </span>
            <span className="sx-p-total sx-p-total-ghost">
              <Eye aria-hidden="true" />
              Vitrina: {visible.length} de 3
            </span>
          </div>
        </header>
        {level ? (
          <PassportLevelCard level={level} titulos={titulos} siguiente={siguiente} />
        ) : (
          <p>No hay un nivel disponible en el servidor.</p>
        )}
        <div className="sx-d-stack">
          {groups.map((g, index) => (
            <PassportGroup key={g.title} group={g} index={index} vitrina={visible} onSelect={setSelectedCode} />
          ))}
        </div>
        <PassportBadgeDialog
          badge={selected}
          group={group?.title ?? ''}
          groupIndex={groupIndex}
          onClose={() => setSelectedCode(undefined)}
        />
      </div>
    </DiscoveryStage>
  )
}
