import type { ReactNode } from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'
export function Seal({
  state,
  children,
  large = false,
}: {
  state: 'sealed' | 'ready' | 'revealed'
  children?: ReactNode
  large?: boolean
}) {
  return (
    <span className={`sx-d-seal ${large ? 'sx-d-seal-large' : ''}`} data-state={state} aria-hidden="true">
      {state === 'sealed' ? <LockKeyhole /> : state === 'ready' ? <Sparkles /> : children}
    </span>
  )
}
