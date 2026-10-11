import { Check, Signpost } from 'lucide-react'
import { mapPosition, type MapSize } from '../lib/geometry'
import type { StudentMapPoint } from '../lib/mapPoints'

export function BlockSign({ points, mapSize }: { points: StudentMapPoint[]; mapSize?: MapSize }) {
  const blocks = [...new Set(points.flatMap((point) => (point.bloque === undefined ? [] : [point.bloque])))]
  return (
    <>
      {blocks.map((block) => {
        const missions = points.filter((point) => !point.additional && point.bloque === block)
        const position = mapPosition(missions[0], mapSize)
        const Icon = missions.every((point) => point.status === 'completed') ? Check : Signpost
        return (
          <span
            key={block}
            className="sx-block-sign"
            style={{ left: position.x - 120, top: position.y - 156 }}
          >
            <Icon size={22} aria-hidden="true" />
            Tramo {block}
          </span>
        )
      })}
    </>
  )
}
