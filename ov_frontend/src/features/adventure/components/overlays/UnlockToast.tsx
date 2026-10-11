import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import type { AvisoServidor } from '@/lib/servidor/adaptadores'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'

export function UnlockToast({ aviso, onDismiss }: { aviso: AvisoServidor; onDismiss: () => void }) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), 7000)
    return () => clearTimeout(timer)
  }, [aviso.id])
  const labels = {
    badge: 'Nueva insignia',
    ficha: 'Nueva ficha',
    ciudad: 'La ciudad te espera',
    nivel: 'Nuevo nivel',
  }
  const links = {
    badge: 'Ver en mi pasaporte',
    ficha: 'Abrir mi mochila',
    ciudad: 'Entrar a la ciudad',
    nivel: 'Ver mi nivel',
  }
  return (
    <aside className="sx-root sx-glass sx-badge-toast" role="status" aria-live="polite">
      <CharacterAvatar id="companero" size="sm" />
      <div className="sx-badge-copy">
        <p className="sx-badge-label">{labels[aviso.kind]}</p>
        <h2>{aviso.title}</h2>
        <p>{aviso.description}</p>
        <Link to={aviso.href} onClick={onDismiss}>
          {links[aviso.kind]}
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
