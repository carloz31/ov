import { useState } from 'react'
import { catalog } from '@/data/activities/content'
import { getCharacterVisual } from '@/data/content/characters'

// El avatar redondo de las pantallas de registro (personaje, Lumi y su pista): la imagen del catálogo
// (`avatarUrl`), como `CharacterAvatar`, y el emoji solo si la imagen falta o no carga.
export function AvatarItem({ id, pequeno = false }: { id: string; pequeno?: boolean }) {
  const [fallo, setFallo] = useState(false)
  const url = catalog.personajes.find((p) => p.id === id)?.avatarUrl
  return (
    <span aria-hidden="true" className={pequeno ? 'sx-item-avatar is-pequeno' : 'sx-item-avatar'}>
      {url && !fallo ? (
        <img className="sx-item-avatar-imagen" src={url} alt="" onError={() => setFallo(true)} />
      ) : (
        getCharacterVisual(id).emoji
      )}
    </span>
  )
}
