import { Compass, Loader2 } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { useLugarInesperado } from '../hooks/useLugarInesperado'
export function UnexpectedPlace({ kind, currentId }: { kind: 'career' | 'occupation'; currentId: string }) {
  const { go, eligible, pendiente, error } = useLugarInesperado(kind, currentId)
  const Icono = pendiente ? Loader2 : Compass
  return (
    <Parchment className="sx-unexpected-place">
      <p>¿Te animas a descubrir algo que aún no has visto?</p>
      <button
        type="button"
        className="sx-d-action sx-d-action-ghost"
        disabled={!eligible || pendiente}
        aria-busy={pendiente || undefined}
        onClick={go}
      >
        <Icono size={20} aria-hidden="true" className={pendiente ? 'animate-spin' : undefined} />
        Llévame a un lugar inesperado
      </button>
      {!eligible && <p>Las otras opciones están en tus favoritos o en tus planes.</p>}
      {error && <p role="alert">{error}</p>}
    </Parchment>
  )
}
