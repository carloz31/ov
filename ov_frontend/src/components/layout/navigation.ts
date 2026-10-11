import type { LucideIcon } from 'lucide-react'

type AppNavigationItem = {
  id: string
  icon: LucideIcon
  label: string
  onSelect?: () => void
  children?: Omit<AppNavigationItem, 'children' | 'icon'>[]
}

type AppNavigationGroup = {
  label: string
  items: AppNavigationItem[]
}

export type { AppNavigationGroup, AppNavigationItem }
