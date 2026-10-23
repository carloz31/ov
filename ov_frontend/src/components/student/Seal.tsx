import type { ReactNode } from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'
export function Seal({
  state,
  children,
  large = false,
  icono,
}: {
  state: 'sealed' | 'ready' | 'revealed'
  children?: ReactNode
  large?: boolean
  // Ícono del sello listo para romper; por defecto, destellos.
  icono?: ReactNode
}) {
  return (
    <span className={`sx-d-seal ${large ? 'sx-d-seal-large' : ''}`} data-state={state} aria-hidden="true">
      {state === 'sealed' ? <LockKeyhole /> : state === 'ready' ? (icono ?? <Sparkles />) : children}
    </span>
  )
}
