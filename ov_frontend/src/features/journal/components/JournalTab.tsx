export function JournalTab({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  )
}
