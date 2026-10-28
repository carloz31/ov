import { useParams } from 'react-router'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { VistaTema } from '@/features/family-conversations/components/servidor/VistaTema'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'

// F08 (A5 y Responder/Esperando en claro): una conversación del vínculo activo.
export function ParentFamiliaTemaView() {
  const f = useFamiliaApoderado()
  const { conversacion = '' } = useParams()
  return (
    <MarcoFamiliaApoderado m={f.m}>
      <VistaTema codigo={conversacion} m={f.m} />
    </MarcoFamiliaApoderado>
  )
}
