import { CartaPendiente } from '@/features/family-conversations/components/servidor/CartaPendiente'
import { ListaConversaciones } from '@/features/family-conversations/components/servidor/ListaConversaciones'
import { MarcoFamiliaEstudiante } from '@/features/family-conversations/components/servidor/MarcoFamiliaEstudiante'
import { useFamiliaEstudiante } from '@/features/family-conversations/hooks/useFamiliaEstudiante'
import { pantallaSeccion } from '@/lib/servidor/adaptadoresConversaciones'

// F08 (E2/E4): Familia en api. Sin carta propia, la carta pendiente; con ella, la lista de conversaciones.
export function StudentFamiliaView() {
  const m = useFamiliaEstudiante()
  return (
    <MarcoFamiliaEstudiante m={m}>
      {m.datos && pantallaSeccion(m.datos) === 'carta_pendiente' ? (
        <CartaPendiente m={m} />
      ) : (
        <ListaConversaciones m={m} />
      )}
    </MarcoFamiliaEstudiante>
  )
}
