import { DialogoIdeas } from '@/features/family-conversations/components/servidor/DialogoIdeas'
import { EscribirCarta } from '@/features/family-conversations/components/servidor/EscribirCarta'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { SelectorHijo } from '@/features/family-conversations/components/servidor/SelectorHijo'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'

// F08 (A3): la carta del apoderado para el hijo del vínculo activo, con sus ideas en un diálogo.
export function ParentFamiliaCartaView() {
  const f = useFamiliaApoderado()
  return (
    <MarcoFamiliaApoderado m={f.m}>
      <EscribirCarta
        key={f.hijo ?? ''}
        m={f.m}
        selector={<SelectorHijo activo={f.hijo} hijos={f.hijos} onElegir={f.elegirHijo} />}
      />
      <DialogoIdeas
        abierto={f.ideasAbiertas}
        pasos={f.m.textos.ideas}
        titulo={f.m.textos.cartaIdeasBoton}
        onCerrar={f.cerrarIdeas}
      />
    </MarcoFamiliaApoderado>
  )
}
