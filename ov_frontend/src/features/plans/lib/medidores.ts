import { KeyRound, Mountain, Star, type LucideIcon } from 'lucide-react'
import type { Medidores } from '@/types/servidor'

// F07b (lienzo «Cómo me siento»): el ícono de cada medidor, en el panel y en las mini tarjetas del plan A.
export const ICONOS_MEDIDOR: Record<keyof Medidores, LucideIcon> = {
  entusiasmo: Star,
  capacidad: Mountain,
  recursos: KeyRound,
}
