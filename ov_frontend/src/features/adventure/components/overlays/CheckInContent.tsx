import { useRef, useState } from 'react'
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import type { ReadinessCheckIn } from '@/types/adventure'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
export function CheckInContent({
  initialValue,
  onSave,
  onDismiss,
  onReturnFocus,
}: {
  initialValue?: ReadinessCheckIn['value']
  onSave: (value: ReadinessCheckIn['value']) => void
  onDismiss: () => void
  onReturnFocus?: () => void
}) {
  const [selected, setSelected] = useState(initialValue)
  const firstValue = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <DialogContent
      className="sx-root sx-check-in"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        firstValue.current?.focus()
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (onReturnFocus) return onReturnFocus()
        if (returnFocus.current?.isConnected) returnFocus.current.focus()
      }}
    >
      <CharacterAvatar id="companero" size="md" />
      <DialogTitle>Registra tu señal de hoy</DialogTitle>
      <DialogDescription>
        ¿Qué tan seguro te sientes de tu próximo paso? Puedes cambiar esta respuesta durante el día.
      </DialogDescription>
      <div className="sx-signal-values" role="group" aria-label="Seguridad de 1 a 10">
        {Array.from({ length: 10 }, (_, i) => (i + 1) as ReadinessCheckIn['value']).map((value) => (
          <button
            key={value}
            ref={value === (initialValue ?? 1) ? firstValue : undefined}
            className="sx-signal-value"
            type="button"
            aria-label={`${value} de 10`}
            aria-pressed={selected === value}
            onClick={() => setSelected(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="sx-signal-extremes">
        <span>1 · Nada seguro</span>
        <span>10 · Muy seguro</span>
      </div>
      <div className="sx-check-in-actions">
        <button type="button" className="sx-secondary-button" onClick={onDismiss}>
          Ahora no
        </button>
        <button
          type="button"
          className="sx-primary-button"
          disabled={selected === undefined}
          onClick={() => {
            if (selected !== undefined) onSave(selected)
          }}
        >
          Guardar señal
        </button>
      </div>
      <p className="sx-signal-privacy">
        Tu orientadora ve esta señal y su tendencia, nunca el texto de tu diario.
      </p>
    </DialogContent>
  )
}
