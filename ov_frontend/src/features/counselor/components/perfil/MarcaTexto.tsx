import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { CambioAfirmacion, ClaseDimension } from '@/types/servidor'

// Ajuste partida-llegada-liviano §2: lo único con color en partida y llegada, como texto con un marcador (flecha o
// punto) y sin chip. El marcador es decorativo: la palabra siempre va. Las clases llegan del servidor; `BAJA` es la
// respuesta baja de solo partida, con la etiqueta que marcó como texto (`children`).
export type ClaseMarcaTexto = CambioAfirmacion | ClaseDimension | 'POR_TRABAJAR' | 'BAJA'
const MARCAS: Record<ClaseMarcaTexto, [string, string, string]> = {
  BAJO: ['↓', 'Bajó', 'font-bold text-warning-text'],
  SIGUE_BAJA: ['•', 'Sigue baja', 'font-medium text-warning-text'],
  SIGUE_POR_TRABAJAR: ['•', 'Sigue por trabajar', 'font-medium text-warning-text'],
  SUBIO: ['↑', 'Subió', 'font-semibold text-success-text'],
  MEJORO: ['↑', 'Mejoró', 'font-semibold text-success-text'],
  IGUAL: ['=', 'Igual', 'text-muted-foreground'],
  POR_TRABAJAR: ['•', 'Por trabajar', 'font-medium text-warning-text'],
  BAJA: ['•', '', 'font-medium text-warning-text'],
}

export function MarcaTexto({ clase, children }: { clase: ClaseMarcaTexto; children?: ReactNode }) {
  const [marcador, palabra, estilo] = MARCAS[clase]
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', estilo)} data-clase={clase}>
      <span aria-hidden="true">{marcador}</span>
      <span>{children ?? palabra}</span>
    </span>
  )
}
