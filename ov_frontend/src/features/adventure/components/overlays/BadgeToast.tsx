import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router'
import type { Achievement } from '@/types/profile'
import { appPaths } from '@/routes/paths'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'

export function BadgeToast({ badge, onDismiss }: { badge: Achievement; onDismiss: () => void }) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), 7000)
    return () => clearTimeout(timer)
  }, [badge.code])
  return (
    <aside className="sx-root sx-glass sx-badge-toast" role="status" aria-live="polite">
      <CharacterAvatar id="companero" size="sm" />
      <div className="sx-badge-copy">
        <p className="sx-badge-label">Nueva insignia</p>
        <h2>{badge.title}</h2>
        <p>{badge.message}</p>
        <Link to={appPaths.student.passport} onClick={onDismiss}>
          Ver en mi pasaporte
        </Link>
      </div>
      <button
        type="button"
        className="sx-badge-close sx-icon-button"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
