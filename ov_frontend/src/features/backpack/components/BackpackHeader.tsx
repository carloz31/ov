import { useBackpack } from '@/features/backpack/hooks/useBackpack'

import { Backpack } from 'lucide-react'

import { TrailBar } from '@/components/student/TrailBar'

export function BackpackHeader({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { isUnlocked, sheets, voices } = model
  return (
    <header className="sx-d-header">
      <div>
        <p className="sx-d-eyebrow">Provisiones para tu aventura</p>
        <h1>Tu mochila de viaje</h1>
        <p>
          Cada paso deja una nueva pista. Reúne fichas y voces de la ciudad, y guarda las que quieras tener a
          mano cuando armes tus planes.
        </p>
      </div>
      <div className="sx-b-summary">
        <Backpack aria-hidden="true" size={40} />
        <div>
          <h2>Compartimentos</h2>
          <TrailBar
            label="Fichas"
            value={sheets.length ? (sheets.filter(isUnlocked).length / sheets.length) * 100 : 0}
            text={`${sheets.filter(isUnlocked).length} de ${sheets.length}`}
          />
          <TrailBar
            label="Voces de la ciudad"
            value={voices.length ? (voices.filter(isUnlocked).length / voices.length) * 100 : 0}
            text={`${voices.filter(isUnlocked).length} de ${voices.length}`}
            muted
          />
        </div>
      </div>
    </header>
  )
}
