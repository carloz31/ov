import { BloqueoConversaciones } from '@/features/family-conversations/components/servidor/BloqueoConversaciones'
import { CartaPendiente } from '@/features/family-conversations/components/servidor/CartaPendiente'
import { ListaConversaciones } from '@/features/family-conversations/components/servidor/ListaConversaciones'
import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { SelectorHijo } from '@/features/family-conversations/components/servidor/SelectorHijo'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { pantallaSeccion } from '@/lib/servidor/adaptadoresConversaciones'
import { appPaths } from '@/routes/paths'

// F08 (A1, A2, A4): Conversaciones del apoderado en api. Cerrada (409), el bloqueo con su avance; sin carta en el
// vínculo activo, la carta pendiente; con ella, la lista. El selector de hijo va en la cabecera.
export function ParentFamiliaView() {
  const f = useFamiliaApoderado()
  const portal = useParentPortalContext()
  if (f.bloqueada) {
    const siguiente = portal.activities.find((a) => !portal.completedActivityIds.includes(a.id))
    const avance = portal.familia?.avance
    return (
      <BloqueoConversaciones
        completadas={avance?.completadas ?? portal.completedActivityIds.length}
        rutaActividades={appPaths.parent.activities}
        siguiente={siguiente ? { titulo: siguiente.titulo, minutos: siguiente.duracionEstimadaMin } : null}
        total={avance?.total ?? portal.activities.length}
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
    </MarcoFamiliaApoderado>
  )
}
