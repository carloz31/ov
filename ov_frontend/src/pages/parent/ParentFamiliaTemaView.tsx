import { useParams } from 'react-router'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { VistaTema } from '@/features/family-conversations/components/servidor/VistaTema'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'
import { GuideDialogue } from '@/components/common/GuideDialogue'
import { parentGuides } from '@/data/content/guideTexts'

// F08 (A5 y Responder/Esperando en claro): una conversación del vínculo activo. Ajuste lumi-mensajes: el «?» abre
// la guía de Conversaciones.
export function ParentFamiliaTemaView() {
  const f = useFamiliaApoderado()
  const { conversacion = '' } = useParams()
  return (
    <MarcoFamiliaApoderado m={f.m}>
      <VistaTema codigo={conversacion} m={f.m} />
      <GuideDialogue
        abierto={f.ayudaAbierta}
        audience="parent"
        text={parentGuides.conversations}
        onCerrar={f.cerrarAyuda}
      />
    </MarcoFamiliaApoderado>
  )
}
