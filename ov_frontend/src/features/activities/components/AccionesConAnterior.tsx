import type { ReactNode } from 'react'
import { PasoAnterior } from './PasoAnterior'

// Agrupa «Anterior» con el botón principal del paso. Solo se usa cuando hay a dónde volver: sin «Anterior»,
// el nodo pinta su botón principal como antes, sin este envoltorio.
export function AccionesConAnterior({
  onAnterior,
  children,
}: {
  onAnterior: () => void
  children?: ReactNode
}) {
  return (
    <span className="sx-step-actions">
      <PasoAnterior onClick={onAnterior} />
      {children}
    </span>
  )
}
