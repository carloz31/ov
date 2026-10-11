import * as Dialog from '@radix-ui/react-dialog'
import { LumiDialogue } from '@/features/adventure/components/overlays/LumiDialogue'
export type LumiOverlayProps = {
  open: boolean
  steps: string[]
  onClose: () => void
  onFinish?: () => void
  finalLabel?: string
}

export function LumiOverlay({ open, ...props }: LumiOverlayProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) props.onClose()
      }}
    >
      {open && <LumiDialogue {...props} />}
    </Dialog.Root>
  )
}
