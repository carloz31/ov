import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Una elección de una sola opción entre pocas, como botones en grupo (`role="group"`, `aria-pressed`). El valor
// en vuelo queda ocupado (`aria-busy`) y los demás, deshabilitados, hasta que se libera.
export function SegmentedControl<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  ocupado,
  onCambiar,
  className,
}: {
  etiqueta: string
  opciones: { valor: T; texto: string }[]
  valor: T | null
  ocupado?: T | null
  onCambiar: (valor: T) => void
  className?: string
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn('inline-flex', className)}>
      {opciones.map((o) => (
        <Button
          key={String(o.valor)}
          type="button"
          variant="outline"
          aria-pressed={valor === o.valor}
          aria-busy={ocupado === o.valor}
          disabled={ocupado !== null && ocupado !== undefined}
          onClick={() => onCambiar(o.valor)}
        >
          {o.texto}
        </Button>
      ))}
    </div>
  )
}
