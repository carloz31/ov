import type { ReactNode } from 'react'

export function TrailBar({
  label,
  value,
  text,
  muted = false,
  detalle,
}: {
  label: string
  value: number
  text?: string
  muted?: boolean
  // Lo que acompaña al rótulo visible (la mochila: «· n nuevas»); la barra conserva `label` como nombre.
  detalle?: ReactNode
}) {
  const bounded = Math.max(0, Math.min(100, value))
  return (
    <div className={`sx-d-trail ${muted ? 'sx-d-trail-muted' : ''}`}>
      <div>
        <span>
          {label}
          {detalle}
        </span>
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
