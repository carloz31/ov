export function TrailBar({
  label,
  value,
  text,
  muted = false,
}: {
  label: string
  value: number
  text?: string
  muted?: boolean
}) {
  const bounded = Math.max(0, Math.min(100, value))
  return (
    <div className={`sx-d-trail ${muted ? 'sx-d-trail-muted' : ''}`}>
      <div>
        <span>{label}</span>
        <strong>{text ?? `${Math.round(bounded)} %`}</strong>
      </div>
      <div
        className="sx-d-trail-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={bounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={text}
      >
        <span style={{ width: `${bounded}%` }} />
      </div>
    </div>
  )
}
