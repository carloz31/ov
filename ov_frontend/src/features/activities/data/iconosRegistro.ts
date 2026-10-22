import {
  Award,
  Bird,
  Briefcase,
  CircleHelp,
  Compass,
  GraduationCap,
  HandHeart,
  House,
  Lightbulb,
  Rocket,
  School,
  Shield,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

// Íconos que un contenido puede asignar a las opciones de un registro (`podio.iconos` o
// `eleccion.iconos` del nodo de consigna). Una opción sin ícono asignado usa `Sparkles`.
export const iconosRegistro: Record<string, LucideIcon> = {
  ayudar: HandHeart,
  idea: Lightbulb,
  escudo: Shield,
  medalla: Award,
  libertad: Bird,
  universidad: GraduationCap,
  instituto: Wrench,
  trabajo: Briefcase,
  emprender: Rocket,
  duda: CircleHelp,
  brujula: Compass,
  familia: House,
  escuela: School,
  amigos: Users,
}
export const iconoRegistro = (nombre?: string) => (nombre && iconosRegistro[nombre]) || Sparkles
