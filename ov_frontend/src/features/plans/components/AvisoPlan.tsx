import { CircleCheck, Star, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import type { AvisoPlan as Aviso } from '../hooks/useAccionesPlanes'

// F07a: lo que dejó una acción de planes (creado, guardado, eliminado o el mensaje del servidor si falló).
export function AvisoPlan({ aviso, onDismiss }: { aviso: Aviso | null; onDismiss: () => void }) {
  if (!aviso) return null
  return (
    <AvisoToast
      key={aviso.id}
      icono={aviso.error ? TriangleAlert : aviso.destacado ? Star : CircleCheck}
      etiqueta={aviso.etiqueta ?? 'Mis planes'}
      titulo={aviso.titulo}
      descripcion={aviso.descripcion}
      onDismiss={onDismiss}
    />
  )
}
