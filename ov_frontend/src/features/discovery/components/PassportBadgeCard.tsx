import { Eye } from 'lucide-react'
import { achievementIcons } from '../lib/passport'
import type { PassportBadge } from '@/types/profile'

// Ajuste pasaporte-perfil: tarjeta descargada, solo sello y nombre; el estado lo dice el sello.
export function PassportBadgeCard({
  badge,
  enVitrina,
  onSelect,
}: {
  badge: PassportBadge
  enVitrina: boolean
  onSelect: () => void
}) {
  const Icon = achievementIcons[badge.icon] ?? achievementIcons.sparkles,
    secreta = !!badge.hidden && !badge.done
  return (
    <button
      type="button"
      className="sx-p-badge"
      data-earned={badge.done}
      data-secret={secreta}
      aria-label={`${secreta ? 'Insignia secreta' : badge.title}, ${badge.done ? 'obtenida' : 'por descubrir'}`}
      onClick={onSelect}
    >
      <span className="sx-p-badge-seal" aria-hidden="true">
        {secreta ? '?' : <Icon size={28} />}
      </span>
      {badge.done && enVitrina && <Eye className="sx-p-eye" size={14} aria-hidden="true" />}
      <strong>{secreta ? '???' : badge.title}</strong>
    </button>
  )
}
