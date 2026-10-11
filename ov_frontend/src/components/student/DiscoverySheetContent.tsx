import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import { SheetContent, SheetClose } from '@/components/ui/Sheet'

export function DiscoverySheetContent({ children, ...props }: ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent {...props}>
      <SheetClose className="sx-d-sheet-close" aria-label="Cerrar panel">
        <X aria-hidden="true" />
      </SheetClose>
      {children}
    </SheetContent>
  )
}
