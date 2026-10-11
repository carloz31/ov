import type { ComponentProps } from 'react'
import { DialogContent } from '@/components/ui/Dialog'
import { useReturnFocus } from '@/hooks/useReturnFocus'

// Presentation-only frame: the existing viewer keeps its content and writes.
export function BackpackViewerFrame(props: ComponentProps<typeof DialogContent>) {
  const returnFocus = useReturnFocus()
  return (
    <DialogContent {...returnFocus} {...props} className={`${props.className ?? ''} sx-backpack-viewer`} />
  )
}
