import { useParams } from 'react-router'
import { CatalogoPortal } from '@/features/discovery/components/CatalogoPortal'

// Ajuste catalogo-apoderado: «Explorar opciones» (solo api), el listado de una pestaña o su detalle.
function CounselorExplorarView({ section }: { section: 'professions' | 'careers' | 'institutions' }) {
  const { codigo } = useParams()
  return <CatalogoPortal section={section} codigo={codigo} />
}

export { CounselorExplorarView }
