import { catalog } from '@/data/activities/content'
import { getCharacterVisual } from '@/data/content/characters'
import { AvatarItem } from './AvatarItem'
import { conDichos } from '@/components/common/ConDichos'

// Ajuste vista del ítem de registro: el personaje de la actividad. Arriba, con avatar de 40 px y su nombre
// encima del globo, dice lo fijo del ítem (`dialogo`); como reacción, bajo las opciones, con avatar de 28 px y
// globo pequeño, vuelve a hablar según lo marcado (región que se anuncia). Sin texto no se ve nada.
export function RegistroPersonaje({
  hablanteId = 'companero',
  texto,
  reaccion = false,
}: {
  hablanteId?: string
  texto?: string
  reaccion?: boolean
}) {
  const narrador = catalog.personajes.find((p) => p.id === hablanteId)?.rol === 'narrador'
  const visual = getCharacterVisual(hablanteId)
  const avatar = !narrador && <AvatarItem id={hablanteId} />
  if (reaccion)
    return (
      <div className="sx-item-reaccion" aria-live="polite">
        {texto && (
          <div className="sx-item-personaje is-reaccion">
            {avatar}
            <p className="sx-item-globo">
              {conDichos(texto)}
            </p>
          </div>
        )}
      </div>
    )
  if (!texto) return null
  return (
    <div className="sx-item-personaje">
      {avatar}
      <div className="sx-item-dice">
        {!narrador && <span className="sx-item-nombre">{visual.name}</span>}
        <p className="sx-item-globo">
              {conDichos(texto)}
            </p>
      </div>
    </div>
  )
}
