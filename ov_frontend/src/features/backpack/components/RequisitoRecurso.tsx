import { useEffect } from 'react'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { registrarFichaEnPantalla } from '@/store/visorRecursoStore'
import { BackpackViewerFrame as DialogContent } from './BackpackViewerFrame'

// Pop up de un contenido bloqueado (ficha o testimonio): cómo obtenerlo. Sin `onVolver`, no ofrece volver al
// camino (dentro de una actividad, cerrar deja la pantalla como estaba; F04d).
export function RequisitoRecurso({
  abierto,
  titulo,
  texto,
  pendiente,
  error,
  onReintentar,
  onClose,
  onVolver,
}: {
  abierto: boolean
  titulo: string
  texto: string
  pendiente: boolean
  error: boolean
  onReintentar: () => void
  onClose: () => void
  onVolver?: () => void
}) {
  // Como el visor: mientras está abierto, los avisos automáticos de Lumi esperan.
  useEffect(() => (abierto ? registrarFichaEnPantalla() : undefined), [abierto])
  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="resource-dialog max-w-xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        {error && (
          <button className="sx-secondary-button" onClick={onReintentar}>
            Reintentar requisito
          </button>
        )}
        {!pendiente && onVolver && (
          <button type="button" className="sx-primary-button" onClick={onVolver}>
            Volver al camino
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
