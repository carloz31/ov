import { TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import type { AvisoFavorito as Aviso } from '../hooks/useFavoritoServidor'

// F06: un favorito que el servidor no guardó; el corazón queda como estaba.
export function AvisoFavorito({ aviso, onDismiss }: { aviso: Aviso | null; onDismiss: () => void }) {
  if (!aviso) return null
  return (
    <AvisoToast
      key={aviso.id}
      icono={TriangleAlert}
      etiqueta="Favoritos"
      titulo="No se pudo guardar"
      descripcion={aviso.mensaje}
      onDismiss={onDismiss}
    />
  )
}
