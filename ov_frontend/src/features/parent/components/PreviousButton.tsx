import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/Button'

export function PreviousButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      <ArrowLeft aria-hidden /> Anterior
    </Button>
  )
}
