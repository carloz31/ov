import type { LucideIcon } from 'lucide-react'

type PlatformRole = 'student' | 'parent' | 'counselor'

type RoleOption = {
  id: PlatformRole
  label: string
  description: string
  eyebrow: string
  icon: LucideIcon
  accentClass: string
}

export type { PlatformRole, RoleOption }
