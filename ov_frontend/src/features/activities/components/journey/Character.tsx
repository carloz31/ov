import { useState } from 'react'
import { catalog } from '@/data/activities/content'
import { CharacterPortrait } from '@/features/activities/components/journey/CharacterPortrait'
export function Character({
  id = 'companero',
  expression,
  small = false,
}: {
  id?: string
  expression?: string
  small?: boolean
}) {
  const person = catalog.personajes.find((person) => person.id === id)
  const url = (expression && person?.expresiones?.[expression]) || person?.avatarUrl
  const [failed, setFailed] = useState('')
  if (person?.rol === 'narrador') return null
  const name = id === 'companero' ? 'Lumi' : (person?.nombre ?? id)
  return (
    <div className={`journey-character ${small ? 'is-small' : ''}`}>
      <div className={`journey-avatar avatar-${id}`}>
        {url && failed !== url ? (
          <img src={url} alt={name} onError={() => setFailed(url)} />
        ) : (
          <CharacterPortrait id={id} expression={expression} />
        )}
      </div>
      <div>
        <strong>{name}</strong>
        <span>{person?.ubicacion ?? 'Tu compañero de travesía'}</span>
      </div>
    </div>
  )
}
