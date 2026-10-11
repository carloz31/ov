import type { LucideIcon } from 'lucide-react'
import { StaffMetric } from '@/components/staff/StaffMetric'

export function ClassroomMetric({
  icon,
  label,
  value,
  note,
  percent,
  primary = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  note?: string
  percent: number | null
  primary?: boolean
}) {
  const bounded = Math.min(100, Math.max(0, percent ?? 0))
  return (
    <div className="staff-classroom-metric">
      <StaffMetric
        icon={icon}
        label={label}
        value={value}
        percent={percent === null ? undefined : bounded}
        detail={note}
        primary={primary}
      />
    </div>
  )
}
