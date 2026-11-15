import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { nombreCorto } from '@/lib/servidor/adaptadoresPanel'

// Ajuste panel-salon · Piezas comunes de los bloques del panel del salón.

export function BloquePanel({
  titulo,
  subtitulo,
  etiqueta,
  children,
  className,
}: {
  titulo: string
  subtitulo?: ReactNode
  etiqueta?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-4 rounded-xl p-5 sm:p-6', className)}>
      <header className="space-y-1">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
          {titulo}
          {etiqueta && <EtiquetaPanel>{etiqueta}</EtiquetaPanel>}
        </h2>
        {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
      </header>
      {children}
    </Card>
  )
}

export function EtiquetaPanel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-track px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {children}
    </span>
  )
}

export function BotonVer({
  onClick,
  etiqueta = 'Ver',
  variante = 'link',
  descripcion,
}: {
  onClick: () => void
  etiqueta?: string
  variante?: 'link' | 'outline'
  descripcion: string
}) {
  return (
    <Button
      variant={variante}
      className={cn('min-h-11 shrink-0', variante === 'link' && 'px-2 font-semibold')}
      onClick={onClick}
      aria-label={`${etiqueta}: ${descripcion}`}
    >
      {etiqueta}
    </Button>
  )
}

// Una fila con la cantidad grande a la izquierda, el texto y, si señala personas, «Ver».
export function FilaConteo({
  cantidad,
  titulo,
  detalle,
  tono = 'primario',
  onVer,
  children,
}: {
  cantidad: number
  titulo: ReactNode
  detalle?: ReactNode
  tono?: 'primario' | 'aviso' | 'neutro'
  onVer?: () => void
  children?: ReactNode
}) {
  const color =
    tono === 'aviso' ? 'text-warning-text' : tono === 'neutro' ? 'text-foreground' : 'text-primary'
  return (
    <div className="flex items-center gap-4 border-t border-border py-3 first:border-t-0">
      <span className={cn('w-8 shrink-0 text-right text-2xl font-bold tabular-nums', color)}>{cantidad}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        {detalle && <p className="text-sm text-muted-foreground">{detalle}</p>}
        {children}
      </div>
      {onVer && (
        <BotonVer onClick={onVer} descripcion={typeof titulo === 'string' ? titulo : String(cantidad)} />
      )}
    </div>
  )
}

// Barra apilada de conteos (sin leyenda: cada fila lleva su número).
export function BarraApilada({ valores, colores }: { valores: number[]; colores: string[] }) {
  const total = valores.reduce((suma, valor) => suma + valor, 0)
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
      {total > 0 &&
        valores.map((valor, i) => (
          <span key={i} className={colores[i]} style={{ width: `${(valor / total) * 100}%` }} />
        ))}
    </div>
  )
}

export function ChipsNombres({ nombres }: { nombres: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Estudiantes">
      {nombres.map((nombre) => (
        <li
          key={nombre}
          className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
        >
          {nombreCorto(nombre)}
        </li>
      ))}
    </ul>
  )
}
