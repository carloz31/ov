import { Parchment } from '@/components/student/Parchment'
import { numeroPagina } from '../lib/passport'
import { PassportBadgeCard } from './PassportBadgeCard'
import type { AchievementGroup, PassportBadge } from '@/types/profile'

// Ajuste pasaporte-perfil: una página del pasaporte, sin descripción, con «n de m sellos».
export function PassportGroup({
  group,
  index,
  vitrina,
  onSelect,
}: {
  group: AchievementGroup
  index: number
  vitrina: PassportBadge[]
  onSelect: (code: string) => void
}) {
  return (
    <Parchment className="sx-p-group">
      <div className="sx-p-group-heading">
        <div>
          <p className="sx-d-eyebrow">Página {numeroPagina(index)}</p>
          <h2>{group.title}</h2>
        </div>
        <strong>
          {group.items.filter((b) => b.done).length} de {group.items.length} sellos
        </strong>
      </div>
      <div className="sx-p-badge-grid">
        {group.items.map((b) => (
          <PassportBadgeCard
            key={b.code}
            badge={b}
            enVitrina={vitrina.some((v) => v.code === b.code)}
            onSelect={() => onSelect(b.code)}
          />
        ))}
      </div>
    </Parchment>
  )
}
