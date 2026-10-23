import { Dialog } from '@/components/ui/Dialog'
import type { ReadinessCheckIn } from '@/types/adventure'
import { CheckInContent } from '@/features/adventure/components/overlays/CheckInContent'
export function CheckInDialog({
  open,
  value,
  onSave,
  onDismiss,
  onReturnFocus,
  servidor,
}: {
  open: boolean
  value?: ReadinessCheckIn['value']
  onSave: (value: ReadinessCheckIn['value']) => void
  onDismiss: () => void
  onReturnFocus?: () => void
  servidor?: { escala: number; error: string }
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss()
      }}
    >
      {open && (
        <CheckInContent
          initialValue={value}
          onSave={onSave}
          onDismiss={onDismiss}
          onReturnFocus={onReturnFocus}
          servidor={servidor}
        />
      )}
    </Dialog>
  )
}
