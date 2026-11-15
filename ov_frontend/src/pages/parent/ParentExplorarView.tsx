import { useParams } from 'react-router'
import { CatalogoPortal } from '@/features/discovery/components/CatalogoPortal'
import { GuideDialogue } from '@/components/common/GuideDialogue'
import { parentGuides } from '@/data/content/guideTexts'

// Ajuste catalogo-apoderado: «Explorar opciones» (solo api), el listado de una pestaña o su detalle. Desde el ajuste
// lumi-mensajes, con la guía para familias (la vista de la orientadora no la tiene).
function ParentExplorarView({ section }: { section: 'professions' | 'careers' | 'institutions' }) {
  const { codigo } = useParams()
  return (
    <>
      <CatalogoPortal section={section} codigo={codigo} />
      <GuideDialogue audience="parent" text={parentGuides.careers} />
    </>
  )
}

export { ParentExplorarView }
