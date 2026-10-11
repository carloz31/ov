import { AlertBadge } from '@/components/ui/Status'

export function Observations({
  underdeveloped,
  attention,
  counts = false,
}: {
  underdeveloped: number
  attention: number
  counts?: boolean
}) {
  return (
    <span className="flex flex-wrap gap-2">
      {underdeveloped > 0 && (
        <AlertBadge>
          {counts
            ? `${underdeveloped} ${underdeveloped === 1 ? 'poco desarrollada' : 'poco desarrolladas'}`
            : 'Poco desarrollada'}
        </AlertBadge>
      )}
      {attention > 0 && (
        <AlertBadge critical>
          {counts
            ? `${attention} ${attention === 1 ? 'requiere atención' : 'requieren atención'}`
            : 'Requiere atención'}
        </AlertBadge>
      )}
    </span>
  )
}
