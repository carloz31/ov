import { useParams } from 'react-router'
import { MarcoFamiliaEstudiante } from '@/features/family-conversations/components/servidor/MarcoFamiliaEstudiante'
import { VistaTema } from '@/features/family-conversations/components/servidor/VistaTema'
import { useFamiliaEstudiante } from '@/features/family-conversations/hooks/useFamiliaEstudiante'

// F08 (E5–E7): una conversación de Familia según su estado.
export function StudentFamiliaTemaView() {
  const m = useFamiliaEstudiante()
  const { conversacion = '' } = useParams()
  return (
    <MarcoFamiliaEstudiante m={m}>
      <VistaTema codigo={conversacion} m={m} />
    </MarcoFamiliaEstudiante>
  )
}
