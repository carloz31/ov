import type { useHelenaPages } from '../hooks/useHelenaPages'
import { HelenaPageCard } from './HelenaPageCard'

export function HelenaBookPages({ model }: { model: ReturnType<typeof useHelenaPages> }) {
  return (
    <div className="sx-d-columns">
      {model.pages.map((page) => (
        <HelenaPageCard key={page.id} page={page} model={model} />
      ))}
    </div>
  )
}
