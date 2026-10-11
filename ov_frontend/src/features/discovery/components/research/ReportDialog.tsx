import { useReturnFocus } from '@/hooks/useReturnFocus'
import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { updateAdventure } from '@/store/adventureStore'

export function ReportDialog({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const focus = useReturnFocus()
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const reasons = ['Contenido incómodo', 'Información sensible', 'No se ve bien', 'Falta de consentimiento']
  const submit = () => {
    if (!reason) return
    updateAdventure((current) => ({
      ...current,
      reports: current.reports.some((report) => report.postId === videoId)
        ? current.reports
        : [
            ...current.reports,
            {
              id: crypto.randomUUID(),
              postId: videoId,
              body: message.trim(),
              reason,
              status: reason === 'Falta de consentimiento' ? 'hidden' : 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
    }))
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent {...focus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>Reportar esta investigación</DialogTitle>
          <DialogDescription>Elige una opción para continuar.</DialogDescription>
        </DialogHeader>
        <p className="mb-4 text-sm leading-6">
          Cuéntanos qué pasó. Si falta consentimiento, la entrevista se retirará provisionalmente.
        </p>
        <div className="flex flex-wrap gap-2">
          {reasons.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={reason === item ? 'default' : 'outline'}
              onClick={() => setReason(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        {reason && (
          <label className="mt-5 block text-sm font-semibold">
            ¿Quieres agregar más detalles?
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="sx-d-input mt-2 min-h-24"
              placeholder="Este detalle ayudará a la orientadora a revisarlo."
            />
          </label>
        )}
        <Button className="mt-5" disabled={!reason} onClick={submit}>
          <Flag /> Enviar reporte
        </Button>
      </DialogContent>
    </Dialog>
  )
}
