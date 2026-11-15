import { BloqueoConversaciones } from '@/features/family-conversations/components/servidor/BloqueoConversaciones'
import { CartaPendiente } from '@/features/family-conversations/components/servidor/CartaPendiente'
import { ListaConversaciones } from '@/features/family-conversations/components/servidor/ListaConversaciones'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { SelectorHijo } from '@/features/family-conversations/components/servidor/SelectorHijo'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { pantallaSeccion } from '@/lib/servidor/adaptadoresConversaciones'
import { actividadApertura, avanceApertura } from '@/features/family-conversations/lib/aperturaConversaciones'
import { appPaths } from '@/routes/paths'
import { GuideDialogue } from '@/components/common/GuideDialogue'
import { parentGuides } from '@/data/content/guideTexts'

// F08 (A1, A2, A4): Conversaciones del apoderado en api. Cerrada (409), el bloqueo con su avance; sin carta en el
// vínculo activo, la carta pendiente; con ella, la lista. El selector de hijo va en la cabecera. Ajuste
// lumi-mensajes: con la sección abierta, la guía para familias; cerrada, solo la pantalla de bloqueo. Ajuste
// desbloqueos: el avance cuenta hasta la actividad que abre la sección, según su regla.
export function ParentFamiliaView() {
  const f = useFamiliaApoderado()
  const portal = useParentPortalContext()
  if (f.bloqueada) {
    const avance = avanceApertura(portal.activities, portal.completedActivityIds,
      actividadApertura(f.detalleBloqueo), portal.familia?.avance)
    return (
      <BloqueoConversaciones
        apertura={avance.apertura}
        completadas={avance.completadas}
        rutaActividades={appPaths.parent.activities}
        siguiente={avance.siguiente}
        total={avance.total}
      />
    )
  }
  const selector = <SelectorHijo activo={f.hijo} hijos={f.hijos} onElegir={f.elegirHijo} />
  return (
    <MarcoFamiliaApoderado m={f.m}>
      {f.m.datos && pantallaSeccion(f.m.datos) === 'carta_pendiente' ? (
        <CartaPendiente m={f.m} selector={selector} />
      ) : (
        <ListaConversaciones m={f.m} selector={selector} />
      )}
      <GuideDialogue audience="parent" text={parentGuides.conversations} />
    </MarcoFamiliaApoderado>
  )
}
