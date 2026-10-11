import { Dialog } from '@/components/ui/Dialog'
import type { ReadinessCheckIn } from '@/types/adventure'
import { CheckInContent } from '@/features/adventure/components/overlays/CheckInContent'
export function CheckInDialog({
  open,
  value,
  onSave,
  onDismiss,
  onReturnFocus,
}: {
  open: boolean
  value?: ReadinessCheckIn['value']
  onSave: (value: ReadinessCheckIn['value']) => void
  onDismiss: () => void
  onReturnFocus?: () => void
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
        />
      )}
    </Dialog>
  )
}
