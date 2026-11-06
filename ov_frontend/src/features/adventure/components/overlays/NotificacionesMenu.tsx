import { CampanaNotificaciones } from '@/components/common/CampanaNotificaciones'
import { useCampanaNotificaciones } from '@/hooks/useCampanaNotificaciones'

// Ajuste notificaciones: en api, la campana del estudiante lista las notificaciones del servidor.
export function NotificacionesMenu({ glass }: { glass: boolean }) {
  return (
    <CampanaNotificaciones
      modelo={useCampanaNotificaciones('estudiante')}
      variante="estudiante"
      glass={glass}
    />
  )
}
