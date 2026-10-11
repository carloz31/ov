import { GraduationCap, UserRound, UsersRound } from 'lucide-react'
import type { RoleOption } from '../types'

const roleOptions: RoleOption[] = [
  {
    id: 'student',
    label: 'Estudiante',
    eyebrow: 'Explora tu futuro',
    description: 'Continúa tus casos, misiones y decisiones vocacionales.',
    icon: UserRound,
    accentClass: 'bg-primary text-primary-foreground',
  },
  {
    id: 'parent',
    label: 'Madre, padre o apoderado',
    eyebrow: 'Acompaña el proceso',
    description: 'Revisa avances y completa actividades para apoyar a tus hijos.',
    icon: UsersRound,
    accentClass: 'bg-[var(--case-coral)] text-white',
  },
  {
    id: 'counselor',
    label: 'Orientador o tutor',
    eyebrow: 'Guía a tu comunidad',
    description: 'Gestiona aulas, estudiantes, familias y planes de orientación.',
    icon: GraduationCap,
    accentClass: 'bg-[var(--case-mint)] text-white',
  },
]

export { roleOptions }
