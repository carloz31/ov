import { GuideDialogue } from '@/components/common/GuideDialogue'
import { EscribirCarta } from '@/features/family-conversations/components/servidor/EscribirCarta'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { SelectorHijo } from '@/features/family-conversations/components/servidor/SelectorHijo'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'

// F08 (A3): la carta del apoderado para el hijo del vínculo activo. «Ver ideas» abre la guía para familias.
export function ParentFamiliaCartaView() {
  const f = useFamiliaApoderado()
  return (
    <MarcoFamiliaApoderado m={f.m}>
      <EscribirCarta
        key={f.hijo ?? ''}
        m={f.m}
        selector={<SelectorHijo activo={f.hijo} hijos={f.hijos} onElegir={f.elegirHijo} />}
      />
      <GuideDialogue
        abierto={f.ideasAbiertas}
        audience="parent"
        text={f.m.textos.ideas.join('\n')}
        onCerrar={f.cerrarIdeas}
      />
    </MarcoFamiliaApoderado>
  )
}
