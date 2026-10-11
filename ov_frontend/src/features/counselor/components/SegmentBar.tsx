const stateColors = ['bg-data-primary', 'bg-data-secondary', 'bg-neutral-soft']
export function SegmentBar({
  labels,
  values,
  colors = stateColors,
  legend = true,
}: {
  labels: string[]
  values: number[]
  colors?: string[]
  legend?: boolean
}) {
  const total = values.reduce((sum, value) => sum + value, 0)
  return (
    <div className="space-y-3">
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-neutral-soft"
        role="img"
        aria-label={labels.map((label, i) => `${label}: ${values[i]}`).join(', ')}
      >
        {total > 0 &&
          values.map((value, i) => (
            <span key={labels[i]} className={colors[i]} style={{ width: `${(value / total) * 100}%` }} />
          ))}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {labels.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-full border border-border ${colors[i]}`} aria-hidden />
              {label}: <strong>{values[i]}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
