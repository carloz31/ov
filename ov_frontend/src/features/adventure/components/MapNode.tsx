import { Check, CircleHelp, LockKeyhole, Star } from 'lucide-react'
import { mapPosition, type MapSize } from '../lib/geometry'
import type { StudentMapPoint } from '../lib/mapPoints'

function splitTitleLines(title: string): string[] {
  const words = title.split(' ')
  if (words.length < 3) return [title]
  let split = 1
  let distance = Infinity
  for (let index = 1; index < words.length; index++) {
    const next = Math.abs(words.slice(0, index).join(' ').length - words.slice(index).join(' ').length)
    if (next < distance) {
      split = index
      distance = next
    }
  }
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')]
}

export function MapNode({
  point,
  recommended,
  selected,
  onSelect,
  onFocus,
  mapSize,
}: {
  point: StudentMapPoint
  recommended: boolean
  selected: boolean
  onSelect: (id: string) => void
  onFocus: (id: string) => void
  mapSize?: MapSize
}) {
  const position = mapPosition(point, mapSize)
  // En api lo bloqueado lleva candado, y el «?» queda para las misiones extra (opcionales).
  const servidor = point.presentacionServidor
  const Icon = point.status === 'locked' ? (servidor ? LockKeyhole : CircleHelp) : point.icon
  const Esquina = servidor ? CircleHelp : Star
  const etiquetaExtra = servidor && !point.misionAdicional ? ', misión extra' : ', misión adicional'
  return (
    <button
      type="button"
      className={`sx-map-node sx-node-${point.zone} sx-node-${point.status}${point.additional ? ' sx-node-additional' : ''}${point.revealing ? ' sx-extra-reveal' : ''}`}
      data-recommended={recommended || undefined}
      data-selected={selected || undefined}
      data-point-id={point.id}
      style={{ left: position.x, top: position.y }}
      onClick={() => onSelect(point.id)}
      onFocus={() => onFocus(point.id)}
      aria-label={`${point.title}${point.additional ? etiquetaExtra : ''}${point.status === 'locked' ? ', bloqueado' : point.status === 'completed' ? ', completado' : ''}`}
    >
      <span className="sx-node-circle">
        <Icon size={56} aria-hidden="true" />
        {point.additional && (
          <span className="sx-extra-star">
            <Esquina size={15} fill={servidor ? 'none' : 'currentColor'} />
          </span>
        )}
        {point.status === 'completed' && (
          <span className="sx-node-badge">
            <Check size={20} />
          </span>
        )}
      </span>
      <span className="sx-glass sx-node-label">
        <strong>
          {splitTitleLines(point.title).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </strong>
        {point.additional && !servidor && <small>Misión adicional</small>}
      </span>
    </button>
  )
}
