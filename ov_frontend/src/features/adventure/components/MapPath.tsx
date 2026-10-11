import { mapPosition, canvasSize, type MapSize } from '../lib/geometry'
import type { StudentMapPoint } from '../lib/mapPoints'

export function MapPath({ points, mapSize = canvasSize }: { points: StudentMapPoint[]; mapSize?: MapSize }) {
  const base = points.filter((p) => !p.additional)
  return (
    <svg aria-hidden="true" className="sx-map-path" viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}>
      {base.slice(1).map((point, index) => {
        const previous = base[index]
        const start = mapPosition(previous, mapSize)
        const end = mapPosition(point, mapSize)
        const done = previous.status === 'completed' && point.status === 'completed'
        const frontier = previous.status === 'completed' && point.status === 'available'
        return (
          <line
            key={`${previous.id}-${point.id}`}
            data-map-segment={done ? 'completed' : frontier ? 'frontier' : 'pending'}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            fill="none"
            stroke={done ? 'var(--success)' : frontier ? 'var(--sx-lumi)' : 'var(--sx-path)'}
            strokeWidth={done || frontier ? 8 : 7}
            strokeDasharray={done ? undefined : '18 22'}
            strokeLinecap="round"
            opacity={done ? 0.85 : frontier ? 1 : 0.75}
          />
        )
      })}
      {points
        .filter((p) => p.additional && !p.revealQueued)
        .map((point) => {
          const origin = points.find((p) => p.id === point.originId)
          if (!origin) return null
          const start = mapPosition(origin, mapSize),
            end = mapPosition(point, mapSize)
          return (
            <g key={point.id}>
              <defs>
                <mask
                  id={`reveal-${point.id}`}
                  maskUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={mapSize.width}
                  height={mapSize.height}
                >
                  <line
                    className={point.revealing ? 'sx-extra-path-reveal' : ''}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="white"
                    strokeWidth={10}
                    pathLength={1}
                  />
                </mask>
              </defs>
              <line
                mask={`url(#reveal-${point.id})`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={point.status === 'completed' ? 'var(--success)' : '#e5bc56'}
                strokeWidth={4}
                strokeDasharray={point.status === 'completed' ? undefined : '12 12'}
              />
            </g>
          )
        })}
    </svg>
  )
}
