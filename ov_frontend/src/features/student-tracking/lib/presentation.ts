import { ClipboardList, ChartNoAxesColumn, Megaphone, Microscope, Palette, Users, Wrench } from 'lucide-react'

// Identity comes from the label and icon, independently of result strength.
export function dimensionIcon(id: string) {
  return (
    (
      { R: Wrench, I: Microscope, A: Palette, S: Users, E: Megaphone, C: ClipboardList } as Record<
        string,
        typeof Wrench
      >
    )[id] ?? ChartNoAxesColumn
  )
}
