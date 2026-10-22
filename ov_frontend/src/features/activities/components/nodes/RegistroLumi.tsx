import type { ReactNode } from 'react'
import { InlineDialogue } from '../InlineDialogue'

// Línea de Lumi de los registros guiados (podio y elección): cambia con el estado y se anuncia.
export function RegistroLumi({ hablanteId, texto }: { hablanteId?: string; texto: ReactNode }) {
  return (
    <div aria-live="polite">
      <InlineDialogue speakerId={hablanteId ?? 'companero'} text={texto} light />
    </div>
  )
}
