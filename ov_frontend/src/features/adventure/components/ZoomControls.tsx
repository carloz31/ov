import { Locate, Minus, Plus } from 'lucide-react'
import { maxScale } from '../lib/geometry'

export function ZoomControls({
  scale,
  minimumScale,
  onZoom,
  onScale,
  onCenter,
}: {
  scale: number
  minimumScale: number
  onZoom: (factor: number) => void
  onScale: (value: number) => void
  onCenter: () => void
}) {
  return (
    <div className="sx-glass sx-zoom-controls">
      <button
        type="button"
        className="sx-icon-button"
        aria-label="Alejar mapa"
        disabled={scale <= minimumScale}
        onClick={() => onZoom(1 / 1.15)}
      >
        <Minus size={18} />
      </button>
      <input
        type="range"
        aria-label="Escala del mapa"
        min={minimumScale * 100}
        max={maxScale * 100}
        step="any"
        value={scale * 100}
        aria-valuetext={`${Math.round(scale * 100)} %`}
        onChange={(event) => onScale(Number(event.target.value) / 100)}
      />
      <span className="sx-zoom-value" aria-hidden="true">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        className="sx-icon-button"
        aria-label="Acercar mapa"
        disabled={scale >= maxScale}
        onClick={() => onZoom(1.15)}
      >
        <Plus size={18} />
      </button>
      <span className="sx-module-separator" aria-hidden="true" />
      <button type="button" className="sx-icon-button" aria-label="Centrar mapa" onClick={onCenter}>
        <Locate size={18} />
      </button>
    </div>
  )
}
