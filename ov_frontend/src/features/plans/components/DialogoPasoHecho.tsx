import { useState } from 'react'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'

// F07b (§8, lienzo «diálogo al marcar Lo hice»): marca el paso al instante, con lo que averiguó (opcional).
// «Solo marcar» lo envía sin hallazgo; mientras el servidor responde, los dos botones quedan ocupados.
export function DialogoPasoHecho({
  abierto,
  enviando,
  onEnviar,
  onCerrar,
}: {
  abierto: boolean
  enviando: boolean
  onEnviar: (hallazgo: string | null) => void
  onCerrar: () => void
}) {
  const focus = useReturnFocus()
  const [hallazgo, setHallazgo] = useState('')
  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (open || enviando) return
        setHallazgo('')
        onCerrar()
      }}
    >
      <DialogContent {...focus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>¡Paso hecho!</DialogTitle>
          <DialogDescription>
            ¿Qué averiguaste? (opcional). Si este paso salía de una duda, lo que escribas queda como su respuesta.
          </DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Qué averiguaste" value={hallazgo} onChange={(e) => setHallazgo(e.target.value)} />
        <div className="sx-d-actions sx-p-acciones">
          <button
            type="button"
            className="sx-d-action sx-d-action-ghost"
            disabled={enviando}
            onClick={() => onEnviar(null)}
          >
            Solo marcar
          </button>
          <button
            type="button"
            className="sx-d-action"
            aria-busy={enviando}
            disabled={enviando}
            onClick={() => onEnviar(hallazgo.trim() || null)}
          >
            Guardar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
