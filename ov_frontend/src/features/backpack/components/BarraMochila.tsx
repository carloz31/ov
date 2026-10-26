import { Search, Star } from 'lucide-react'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'

const kinds = [
  { id: 'sheet', label: 'Fichas', buscar: 'Buscar por título o tema…' },
  { id: 'testimonial', label: 'Voces de la ciudad', buscar: 'Buscar por nombre, ocupación o tema…' },
] as const

// Ajuste mochila: pestañas segmentadas, buscador por pestaña y el filtro «Solo favoritos». Con el
// compartimento vacío, el buscador y el filtro quedan deshabilitados.
export function BarraMochila({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { kind, tabs, query, setQuery, favoritesOnly, setFavoritesOnly, chooseKind, vacio } = model
  const actual = kinds.find((item) => item.id === kind) ?? kinds[0]
  return (
    <div className="sx-b-controls">
      <div className="sx-b-tabs" role="tablist" aria-label="Tipo de recurso">
        {kinds.map((item, i) => (
          <button
            key={item.id}
            ref={(node) => {
              tabs.current[i] = node
            }}
            type="button"
            id={`sx-backpack-tab-${item.id}`}
            role="tab"
            aria-selected={kind === item.id}
            tabIndex={kind === item.id ? 0 : -1}
            aria-controls="sx-backpack-compartments"
            onClick={() => chooseKind(item.id)}
            onKeyDown={(event) => {
              let index = i
              if (event.key === 'ArrowRight') index = (i + 1) % kinds.length
              else if (event.key === 'ArrowLeft') index = (i + kinds.length - 1) % kinds.length
              else if (event.key === 'Home') index = 0
              else if (event.key === 'End') index = kinds.length - 1
              else return
              event.preventDefault()
              chooseKind(kinds[index].id)
              tabs.current[index]?.focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="sx-b-search">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Buscar en {actual.label.toLocaleLowerCase()}</span>
        <input
          className="sx-d-input"
          placeholder={actual.buscar}
          value={query}
          disabled={vacio}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button
        className="sx-b-favoritos"
        type="button"
        aria-pressed={favoritesOnly}
        disabled={vacio}
        onClick={() => setFavoritesOnly(!favoritesOnly)}
      >
        <Star aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />
        Solo favoritos
      </button>
    </div>
  )
}
