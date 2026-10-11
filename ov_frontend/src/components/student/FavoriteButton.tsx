import { Heart, Star } from 'lucide-react'
export function FavoriteButton({
  selected,
  onToggle,
  compact = false,
  icon = 'heart',
}: {
  selected: boolean
  onToggle: () => void
  compact?: boolean
  icon?: 'heart' | 'star'
}) {
  const Icon = icon === 'star' ? Star : Heart
  return (
    <button
      type="button"
      className="sx-d-favorite"
      aria-pressed={selected}
      aria-label={selected ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <Icon fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
      {!compact && (selected ? 'En favoritos' : 'Guardar en favoritos')}
    </button>
  )
}
