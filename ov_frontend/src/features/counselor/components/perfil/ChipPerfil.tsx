import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Ajuste panel-estudiantes · Etiqueta del perfil: verde (bien), ámbar (atención), azul (dato) o gris (neutro).
export type TonoChip = 'exito' | 'aviso' | 'primario' | 'neutro'
const TONOS: Record<TonoChip, string> = {
  exito: 'bg-success-soft text-success-text',
  aviso: 'bg-warning-soft text-warning-text',
  primario: 'bg-primary-soft text-primary',
  neutro: 'bg-track text-muted-foreground',
}

export function ChipPerfil({ tono = 'neutro', children }: { tono?: TonoChip; children: ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', TONOS[tono])}>
      {children}
    </span>
  )
}
