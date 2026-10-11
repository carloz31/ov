import { BookOpen, ClipboardList, Feather, type LucideIcon } from 'lucide-react'
import type { ContenidoActividad } from '@/types/activities'

export const iconosMapa: Record<NonNullable<ContenidoActividad['mapa']>['icono'], LucideIcon> = {
  informativa: BookOpen,
  test: ClipboardList,
  registro: Feather,
}
