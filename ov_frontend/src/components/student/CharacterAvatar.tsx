import { useState } from 'react'
import { catalog } from '@/data/activities/content'
import { getCharacterVisual } from '@/data/content/characters'

export function CharacterAvatar({
  id,
  size = 'md',
  expression,
}: {
  id: string
  size?: 'sm' | 'md' | 'lg'
  expression?: string
}) {
  // Imágenes que no cargaron: se pasa a la siguiente (expresión → avatar base) y, sin ninguna, al emoji.
  const [fallidas, setFallidas] = useState<string[]>([])
  const person = catalog.personajes.find((person) => person.id === id)
  if (person?.rol === 'narrador') return null
  const character = getCharacterVisual(id)
  const url = [expression && person?.expresiones?.[expression], person?.avatarUrl].find(
    (url): url is string => !!url && !fallidas.includes(url),
  )
  return (
    <div className="sx-character">
      <span aria-hidden="true" className={`sx-character-circle sx-character-${size}`}>
        {url ? (
          <img
            key={url}
            className="sx-character-image"
            src={url}
            alt=""
            onError={() => setFallidas((previas) => [...previas, url])}
          />
        ) : (
          character.emoji
        )}
      </span>
      <span className="sx-character-name">{character.name}</span>
    </div>
  )
}
