import { EscribirCarta } from '@/features/family-conversations/components/servidor/EscribirCarta'
import { MarcoFamiliaEstudiante } from '@/features/family-conversations/components/servidor/MarcoFamiliaEstudiante'
import { useFamiliaEstudiante } from '@/features/family-conversations/hooks/useFamiliaEstudiante'

// F08 (E3): escribir, releer o editar la carta para la familia.
export function StudentFamiliaCartaView() {
  const m = useFamiliaEstudiante()
  return (
    <MarcoFamiliaEstudiante m={m}>
      <EscribirCarta m={m} />
    </MarcoFamiliaEstudiante>
  )
}
