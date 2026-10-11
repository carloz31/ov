const stateColors = ['bg-data-primary', 'bg-data-secondary', 'bg-neutral-soft']
export function StateLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {['Completado', 'En progreso', 'No iniciado'].map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full border border-border ${stateColors[i]}`} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  )
}
