import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import type { ModeloCampana } from '@/types/notificaciones'
import { FilaNotificacion, type VarianteCampana } from './FilaNotificacion'
import { NotificacionesModal } from './NotificacionesModal'

// Ajuste notificaciones: la campana (contador, las 5 primeras y «Ver todas»). El estudiante la ve con el aspecto
// de la lista local de novedades; el portal del apoderado, con el estilo claro de su barra.
export function CampanaNotificaciones({
  modelo,
  variante,
  glass = false,
}: {
  modelo: ModeloCampana
  variante: VarianteCampana
  glass?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [todas, setTodas] = useState(false)
  const portal = variante === 'portal'
  const { noVistas } = modelo
  return (
    <>
      <DropdownMenu open={abierto} onOpenChange={setAbierto}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={
              portal
                ? 'relative grid size-9 place-items-center rounded-md text-foreground hover:bg-muted'
                : `sx-icon-button sx-novelties-bell ${glass ? 'sx-glass' : ''}`
            }
            aria-label={portal ? 'Notificaciones' : 'Novedades'}
            aria-describedby={noVistas > 0 ? 'campana-sin-ver' : undefined}
          >
            <Bell size={20} aria-hidden="true" />
            {noVistas > 0 && (
              <span
                className={
                  portal
                    ? 'absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground'
                    : 'sx-novelties-count'
                }
                aria-hidden="true"
              >
                {noVistas}
              </span>
            )}
            {noVistas > 0 && (
              <span id="campana-sin-ver" className="sr-only">
                {noVistas} novedades sin ver
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={12}
          className={portal ? 'w-80 p-2' : 'sx-root sx-novelties-menu case-scrollbar'}
          aria-label="Novedades"
        >
          <div className={portal ? 'flex items-center justify-between px-2 py-1' : 'sx-novelties-header'}>
            <h2 className={portal ? 'text-base font-bold' : 'sx-novelties-title'}>Novedades</h2>
            <DropdownMenuItem asChild onSelect={() => setAbierto(false)}>
              <button
                type="button"
                className={
                  portal ? 'grid size-8 place-items-center rounded-md hover:bg-muted' : 'sx-icon-button'
                }
                aria-label="Cerrar novedades"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </DropdownMenuItem>
          </div>
          {modelo.recientes.length ? (
            modelo.recientes.map((aviso) => (
              <DropdownMenuItem key={aviso.id} asChild>
                <FilaNotificacion aviso={aviso} variante={variante} onAbrir={() => modelo.abrir(aviso)} />
              </DropdownMenuItem>
            ))
          ) : (
            <p className={portal ? 'p-2 text-sm text-muted-foreground' : 'sx-novelties-empty'}>
              No tienes novedades pendientes
            </p>
          )}
          {modelo.todas.length > 0 && (
            <DropdownMenuItem
              className={portal ? 'justify-center font-semibold text-primary' : 'sx-novelties-todas'}
              onSelect={() => {
                setAbierto(false)
                setTodas(true)
              }}
            >
              Ver todas
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificacionesModal abierto={todas} onAbiertoChange={setTodas} modelo={modelo} variante={variante} />
    </>
  )
}
