import { Award } from 'lucide-react'
import { Link } from 'react-router'
import type { Achievement } from '@/types/profile'
import { appPaths } from '@/routes/paths'
import { AvisoToast } from '@/components/student/AvisoToast'

export function BadgeToast({ badge, onDismiss }: { badge: Achievement; onDismiss: () => void }) {
  return (
    <AvisoToast
      icono={Award}
      etiqueta="Nueva insignia"
      titulo={badge.title}
      descripcion={badge.message}
      onDismiss={onDismiss}
      accion={
        <Link className="sx-secondary-button sx-toast-action" to={appPaths.student.passport} onClick={onDismiss}>
          Ver en mi pasaporte
        </Link>
      }
    />
  )
}
