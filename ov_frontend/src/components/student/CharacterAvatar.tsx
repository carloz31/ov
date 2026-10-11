import { catalog } from '@/data/activities/content'
import { getCharacterVisual } from '@/data/content/characters'

export function CharacterAvatar({
  id,
  size = 'md',
}: {
  id: string
  size?: 'sm' | 'md' | 'lg'
  expression?: string
}) {
  if (catalog.personajes.find((person) => person.id === id)?.rol === 'narrador') return null
  const character = getCharacterVisual(id)
  return (
    <div className="sx-character">
      <span aria-hidden="true" className={`sx-character-circle sx-character-${size}`}>
        {character.emoji}
      </span>
      <span className="sx-character-name">{character.name}</span>
    </div>
  )
}
