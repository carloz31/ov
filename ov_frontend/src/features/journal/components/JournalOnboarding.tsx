import { Compass, LockKeyhole, PenLine } from 'lucide-react'

import { Parchment } from '@/components/student/Parchment'
import { CollectionSlot } from '@/components/student/CollectionSlot'

export function JournalOnboarding({ onBegin }: { onBegin: () => void }) {
  return (
    <Parchment className="sx-j-notebook sx-j-onboarding" title="Un espacio para ti y Lumi">
      <p>
        Tu diario se convierte en conversaciones con tu compañera de viaje. No hay respuestas automáticas: tú
        decides qué contar.
      </p>
      <div className="sx-j-onboarding-points">
        <CollectionSlot icon={<LockKeyhole />}>
          <strong>Privado para siempre</strong>
          <p>Nadie lee lo que escribes aquí. Ni tu orientadora, ni nadie del programa. Nunca.</p>
        </CollectionSlot>
        <CollectionSlot icon={<PenLine />}>
          <strong>A tu manera</strong>
          <p>No hay respuestas correctas. Puedes escribir una frase o una página.</p>
        </CollectionSlot>
        <CollectionSlot icon={<Compass />}>
          <strong>Una señal separada</strong>
          <p>
            De vez en cuando te preguntaremos qué tan seguro te sientes de tu próximo paso. Tu orientadora ve
            solo esa respuesta corta, nunca lo que escribes.
          </p>
        </CollectionSlot>
      </div>
      <button type="button" className="sx-d-action sx-d-action-gold" onClick={onBegin}>
        Entendido, empezar a escribir
      </button>
    </Parchment>
  )
}
