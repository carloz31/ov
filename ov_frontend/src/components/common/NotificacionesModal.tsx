import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FilaNotificacion, type VarianteCampana } from './FilaNotificacion'
import type { ModeloCampana } from '@/types/notificaciones'

// Ajuste notificaciones: «Ver todas»: la lista completa por páginas, con «Mostrar más» y «Marcar todas como vistas».
export function NotificacionesModal({
  abierto,
  onAbiertoChange,
  modelo,
  variante,
}: {
  abierto: boolean
  onAbiertoChange: (abierto: boolean) => void
  modelo: ModeloCampana
  variante: VarianteCampana
}) {
  const portal = variante === 'portal'
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className={portal ? undefined : 'sx-root sx-novelties-modal case-scrollbar'}>
        <DialogHeader>
          <DialogTitle>Novedades</DialogTitle>
          <DialogDescription>
            {modelo.noVistas > 0 ? `${modelo.noVistas} sin ver` : 'Estás al día.'}
          </DialogDescription>
        </DialogHeader>
        {modelo.todas.length ? (
          <ul className={portal ? 'grid gap-1' : 'sx-novelties-lista'}>
            {modelo.todas.map((aviso) => (
              <li key={aviso.id}>
                <FilaNotificacion
                  aviso={aviso}
                  variante={variante}
                  onAbrir={() => {
                    modelo.abrir(aviso)
                    onAbiertoChange(false)
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={portal ? 'text-sm text-muted-foreground' : 'sx-novelties-empty'}>
            No tienes novedades pendientes
          </p>
        )}
        {modelo.error && (
          <p role="alert" className={portal ? 'mt-3 text-sm text-destructive' : 'sx-novelties-empty'}>
            {modelo.error}
          </p>
        )}
        <div className={portal ? 'mt-4 flex flex-wrap justify-end gap-2' : 'sx-novelties-acciones'}>
          {modelo.hayMas && (
            <button
              type="button"
              className={portal ? 'rounded-md border px-4 py-2 text-sm font-semibold' : 'sx-secondary-button'}
              onClick={modelo.cargarMas}
              aria-busy={modelo.cargandoMas}
            >
              {modelo.cargandoMas ? 'Cargando…' : 'Mostrar más'}
            </button>
          )}
          {modelo.noVistas > 0 && (
            <button
              type="button"
              className={
                portal
                  ? 'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground'
                  : 'sx-primary-button'
              }
              onClick={modelo.marcarTodas}
            >
              Marcar todas como vistas
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
