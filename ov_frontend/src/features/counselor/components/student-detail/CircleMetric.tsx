export function CircleMetric({
  completed,
  label,
  percent,
  total,
  unit = 'act. completadas',
}: {
  completed: number
  label: string
  percent: number
  total: number
  unit?: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="relative grid size-16 place-items-center">
        <svg className="absolute inset-0 size-16 -rotate-90" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--track)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={percent === 100 ? 'var(--success)' : 'var(--primary)'}
            strokeWidth="6"
            strokeDasharray={`${percent * 1.7593} 175.93`}
          />
        </svg>
        <strong className="text-sm">{percent}%</strong>
      </div>
      <p className="mt-2 text-[11px] font-semibold leading-tight">{label}</p>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
        {completed} de {total} {unit}
      </p>
    </div>
  )
}
