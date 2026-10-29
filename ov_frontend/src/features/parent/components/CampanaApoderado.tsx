import { CampanaNotificaciones } from '@/components/common/CampanaNotificaciones'
import { useCampanaNotificaciones } from '@/hooks/useCampanaNotificaciones'

// Ajuste notificaciones: la campana del apoderado en la barra del portal (estilo claro).
export function CampanaApoderado() {
  return <CampanaNotificaciones modelo={useCampanaNotificaciones('apoderado')} variante="portal" />
}
