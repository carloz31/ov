import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useReturnFocus } from '@/hooks/useReturnFocus'

// F09: confirmación simple, sin motivo (cancelar la investigación, retirar la entrevista, eliminar una reacción).
export function ConfirmarInvestigacion({
  abierto,
  titulo,
  descripcion,
  confirmar,
  ocupado,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean
  titulo: string
  descripcion: string
  confirmar: string
  ocupado: boolean
  onConfirmar: () => void
  onCerrar: () => void
}) {
  const focus = useReturnFocus()
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && !ocupado && onCerrar()}>
      <DialogContent {...focus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="sx-d-actions">
          <button type="button" className="sx-d-action sx-d-action-ghost" disabled={ocupado} onClick={onCerrar}>
            Volver
          </button>
          <button
            type="button"
            className="sx-d-action"
            data-tono="peligro"
            disabled={ocupado}
            aria-busy={ocupado || undefined}
            onClick={onConfirmar}
          >
            {ocupado && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
            {confirmar}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
