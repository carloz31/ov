import { AvisoPortal } from '@/components/staff/AvisoPortal'
import { cerrarAvisoPublicacion, useAvisoPublicacion } from '../../store/avisoPublicaciones'

// F09: el aviso de Publicaciones (destacar, eliminar, descartar, comentar).
export function AvisoPublicaciones() {
  const aviso = useAvisoPublicacion()
  if (!aviso) return null
  return (
    <AvisoPortal
      key={aviso.id}
      titulo={aviso.titulo}
      descripcion={aviso.descripcion}
      error={aviso.error}
      onCerrar={cerrarAvisoPublicacion}
    />
  )
}
