import { Link } from 'react-router'
import type { AvisoServidor, TipoAviso } from '@/types/notificaciones'
import { iconosAviso } from '@/lib/iconosAviso'

// Ajuste notificaciones: una fila de la campana, con el aspecto de la lista local de novedades.
const titulos: Record<TipoAviso, string> = {
  badge: 'Nueva insignia disponible',
  ficha: 'Nueva ficha disponible',
  ciudad: 'Nueva ciudad disponible',
  nivel: 'Nuevo nivel',
  conversacion: 'Nueva respuesta en Conversaciones',
  destacada: 'Tu entrevista fue destacada',
  leyenda: 'Tu entrevista es Leyenda',
  reaccion: 'Reaccionaron a tu entrevista',
}
export type VarianteCampana = 'estudiante' | 'portal'

export function FilaNotificacion({
  aviso,
  variante,
  onAbrir,
}: {
  aviso: AvisoServidor
  variante: VarianteCampana
  onAbrir: () => void
}) {
  const Icono = iconosAviso[aviso.kind]
  const portal = variante === 'portal'
  const clases = portal
    ? `flex min-h-12 items-center gap-3 rounded-lg p-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${aviso.asincrona && !aviso.vista ? 'bg-primary/10' : ''}`
    : `sx-novelty ${aviso.asincrona ? 'is-asincrona' : ''} ${aviso.vista ? 'is-vista' : ''}`
  return (
    <Link className={clases} to={aviso.href} onClick={onAbrir}>
      <Icono size={18} aria-hidden="true" className={portal ? 'shrink-0 text-primary' : undefined} />
      <span className={portal ? 'min-w-0 flex-1' : undefined}>
        <strong className={portal ? 'block text-sm font-semibold' : undefined}>{titulos[aviso.kind]}</strong>
        <small className={portal ? 'mt-1 block text-sm text-muted-foreground' : undefined}>
          {aviso.asincrona || aviso.kind === 'ciudad'
            ? aviso.description
            : `Se ha desbloqueado «${aviso.title}»`}
        </small>
      </span>
      {!aviso.vista && (
        <>
          <span
            className={portal ? 'size-2 shrink-0 rounded-full bg-primary' : 'sx-novelty-dot'}
            aria-hidden="true"
          />
          <span className="sr-only">Sin ver</span>
        </>
      )}
    </Link>
  )
}
