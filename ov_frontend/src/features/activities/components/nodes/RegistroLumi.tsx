import { InlineDialogue } from '../InlineDialogue'

// Línea de Lumi de los registros guiados (podio y elección): cambia con el estado y se anuncia.
export function RegistroLumi({ hablanteId, texto }: { hablanteId?: string; texto: string }) {
  return (
    <div aria-live="polite">
      <InlineDialogue speakerId={hablanteId ?? 'companero'} text={texto} light />
    </div>
  )
}
