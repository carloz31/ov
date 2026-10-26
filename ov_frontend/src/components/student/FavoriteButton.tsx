import { Heart, Loader2, Star } from 'lucide-react'
export function FavoriteButton({
  selected,
  onToggle,
  compact = false,
  icon = 'heart',
  pendiente = false,
}: {
  selected: boolean
  onToggle: () => void
  compact?: boolean
  icon?: 'heart' | 'star'
  // F06: mientras el servidor confirma, el botón no acepta otro clic y muestra un cargador.
  pendiente?: boolean
}) {
  const Icon = pendiente ? Loader2 : icon === 'star' ? Star : Heart
  return (
    <button
      type="button"
      className="sx-d-favorite"
      aria-pressed={selected}
      aria-label={selected ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-busy={pendiente || undefined}
      disabled={pendiente || undefined}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <Icon
        fill={selected && !pendiente ? 'currentColor' : 'none'}
        aria-hidden="true"
        className={pendiente ? 'animate-spin' : undefined}
      />
      {!compact && (selected ? 'En favoritos' : 'Guardar en favoritos')}
    </button>
  )
}
