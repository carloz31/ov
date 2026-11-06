import { Award, BookOpen, Building2, Crown, MessageCircle, Sparkles, Star, TrendingUp } from 'lucide-react'
import type { TipoAviso } from '@/types/notificaciones'

// Ajuste notificaciones: el ícono de cada tipo de aviso, en el toast y en la campana.
export const iconosAviso: Record<TipoAviso, typeof Award> = {
  badge: Award,
  ficha: BookOpen,
  ciudad: Building2,
  nivel: TrendingUp,
  conversacion: MessageCircle,
  destacada: Star,
  leyenda: Crown,
  reaccion: Sparkles,
}
