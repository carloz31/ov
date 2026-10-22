import { Award, Bird, HandHeart, Lightbulb, Shield, Sparkles, type LucideIcon } from 'lucide-react'

// Íconos que un contenido puede asignar a las fichas del podio (`podio.iconos` del nodo de consigna).
// Una ficha sin ícono asignado usa `Sparkles`.
export const iconosPodio: Record<string, LucideIcon> = {
  ayudar: HandHeart,
  idea: Lightbulb,
  escudo: Shield,
  medalla: Award,
  libertad: Bird,
}
export const iconoPodio = (nombre?: string) => (nombre && iconosPodio[nombre]) || Sparkles
