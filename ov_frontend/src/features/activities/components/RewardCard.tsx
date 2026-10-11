import type { CSSProperties } from 'react'
import { BookOpen, KeyRound, Award } from 'lucide-react'
export function RewardCard({
  title,
  kind,
  index = 0,
  progress,
  onOpen,
}: {
  title: string
  kind: 'object' | 'sheet' | 'badge' | 'other'
  index?: number
  progress?: { obtained: number; needed: number; place: string }
  onOpen?: () => void
}) {
  const Icon = kind === 'object' ? KeyRound : kind === 'sheet' ? BookOpen : Award
  return (
    <article
      className={`sx-reward-card is-${kind}`}
      style={{ '--reward-delay': `${0.55 + index * 0.25}s` } as CSSProperties}
    >
      <span className="sx-reward-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div>
        <p className="sx-reward-label">
          {kind === 'sheet'
            ? 'FICHA GUARDADA EN TU MOCHILA'
            : kind === 'badge'
              ? 'INSIGNIA'
              : 'OBJETO DE CAMINO'}
          {kind === 'object' && <small>Nuevo</small>}
        </p>
        <h4>{title}</h4>
        {progress && (
          <>
            <div className="sx-reward-segments" aria-hidden="true">
              {Array.from({ length: progress.needed }, (_, i) => (
                <i key={i} data-filled={i < progress.obtained} />
              ))}
            </div>
            <p>
              {progress.obtained} de {progress.needed} dientes para abrir {progress.place}
            </p>
          </>
        )}
        {onOpen && (
          <button type="button" className="sx-secondary-button" onClick={onOpen}>
            {kind === 'sheet' ? 'Ver ficha' : 'Ver desbloqueo'}
          </button>
        )}
      </div>
    </article>
  )
}
