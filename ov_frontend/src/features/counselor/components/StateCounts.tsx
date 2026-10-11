export function StateCounts({
  completed,
  progress,
  pending,
}: {
  completed: number
  progress: number
  pending: number
}) {
  return (
    <span
      className="shrink-0 text-xs"
      aria-label={`${completed} completados, ${progress} en progreso, ${pending} no iniciados`}
    >
      <span className="font-semibold text-data-primary">{completed}</span> · <span>{progress}</span> ·{' '}
      <span className="text-muted-foreground">{pending}</span>
    </span>
  )
}
