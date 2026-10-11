import { useResearchGuide } from '@/features/discovery/hooks/useResearchGuide'
import { DiscoverySheetContent as SheetContent } from '@/components/student/DiscoverySheetContent'
import { Search } from 'lucide-react'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
export function ResearchOccupationPicker({ model }: { model: ReturnType<typeof useResearchGuide> }) {
  const { focus, picker, setPicker, query, setQuery, choose, favoriteIds, choices } = model
  return (
    <Sheet open={picker} onOpenChange={setPicker}>
      <SheetContent {...focus} className="sx-root sx-d-sheet">
        <SheetHeader>
          <SheetTitle>Elegir ocupación</SheetTitle>
          <SheetDescription>Tus favoritas aparecen primero.</SheetDescription>
        </SheetHeader>
        <label className="sx-d-field">
          <Search aria-hidden="true" />
          Buscar ocupación
          <input className="sx-d-input" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="sx-d-stack">
          {choices.map((o) => (
            <button
              type="button"
              key={o.id}
              className="sx-d-action sx-d-action-ghost"
              onClick={() => choose(o.id)}
            >
              {o.name}
              {favoriteIds.includes(o.id) && ' · Favorita'}
            </button>
          ))}
        </div>
        {!choices.length && <p>No encontramos una ocupación con ese nombre.</p>}
      </SheetContent>
    </Sheet>
  )
}
