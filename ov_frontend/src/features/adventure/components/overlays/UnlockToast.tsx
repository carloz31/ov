import { Link } from 'react-router'
import type { AvisoServidor, TipoAviso } from '@/types/notificaciones'
import { AvisoToast } from '@/components/student/AvisoToast'
import { iconosAviso } from '@/lib/iconosAviso'

// Ajuste notificaciones: solo los logros llegan como toast; las asíncronas (de otra cuenta) van a la campana.
const labels: Record<TipoAviso, string> = {
  badge: 'Nueva insignia',
  ficha: 'Nueva ficha',
  ciudad: 'La ciudad te espera',
  nivel: 'Nuevo nivel',
  conversacion: 'Nueva respuesta',
  destacada: 'Entrevista destacada',
  leyenda: 'Nueva Leyenda',
  reaccion: 'Nueva reacción',
}
const links: Record<TipoAviso, string> = {
  badge: 'Ver en mi pasaporte',
  ficha: 'Abrir mi mochila',
  ciudad: 'Entrar a la ciudad',
  nivel: 'Ver mi nivel',
  conversacion: 'Ver la conversación',
  destacada: 'Ver la entrevista',
  leyenda: 'Ver la entrevista',
  reaccion: 'Ver la entrevista',
}
export function UnlockToast({ aviso, onDismiss }: { aviso: AvisoServidor; onDismiss: () => void }) {
  return (
    <AvisoToast
      icono={iconosAviso[aviso.kind]}
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
