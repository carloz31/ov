import { Link } from 'react-router'
import { Award, BookOpen, Building2, TrendingUp } from 'lucide-react'
import type { AvisoServidor } from '@/lib/servidor/adaptadores'
import { AvisoToast } from '@/components/student/AvisoToast'

const labels = {
  badge: 'Nueva insignia',
  ficha: 'Nueva ficha',
  ciudad: 'La ciudad te espera',
  nivel: 'Nuevo nivel',
}
const links = {
  badge: 'Ver en mi pasaporte',
  ficha: 'Abrir mi mochila',
  ciudad: 'Entrar a la ciudad',
  nivel: 'Ver mi nivel',
}
const iconos = { badge: Award, ficha: BookOpen, ciudad: Building2, nivel: TrendingUp }

export function UnlockToast({ aviso, onDismiss }: { aviso: AvisoServidor; onDismiss: () => void }) {
  return (
    <AvisoToast
      icono={iconos[aviso.kind]}
      etiqueta={labels[aviso.kind]}
      titulo={aviso.title}
      descripcion={aviso.description}
      onDismiss={onDismiss}
      accion={
        <Link className="sx-secondary-button sx-toast-action" to={aviso.href} onClick={onDismiss}>
          {links[aviso.kind]}
        </Link>
      }
    />
  )
}
