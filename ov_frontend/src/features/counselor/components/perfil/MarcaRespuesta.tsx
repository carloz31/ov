import type { ReactNode } from 'react'
import type { IntensidadMarca } from '@/features/counselor/lib/perfilEstudiante'
import { cn } from '@/lib/utils'

// Ajuste respuestas-orientadora §1: la única marca de color de las respuestas. Fuerte (requiere atención): punto
// relleno y negrita; suave (sin contenido): anillo y peso normal. El punto es decorativo: la marca siempre va con su
// texto. Sin `children`, solo el punto (la fila lo pone delante del título); `sinPunto`, solo el texto.
export function MarcaRespuesta({
  intensidad,
  children,
  sinPunto = false,
  className,
}: {
  intensidad: IntensidadMarca | null
  children?: ReactNode
  sinPunto?: boolean
  className?: string
}) {
  const punto = (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        intensidad === 'fuerte' && 'bg-warning-text',
        intensidad === 'suave' && 'border-2 border-warning-text',
      )}
    />
  )
  if (!children) return punto
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm text-warning-text',
        intensidad === 'fuerte' ? 'font-semibold' : 'font-normal',
        className,
      )}
    >
      {!sinPunto && punto}
      {children}
    </span>
  )
}
