import { useBackpack } from '@/features/backpack/hooks/useBackpack'

import { Backpack } from 'lucide-react'

import { TrailBar } from '@/components/student/TrailBar'

const porcentaje = (parte: number, total: number) => (total ? (parte / total) * 100 : 0)

// Ajuste mochila: cabecera compacta y «Compartimentos» con el avance de fichas (y las nuevas) y de voces.
export function BackpackHeader({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { fichasObtenidas, nuevas, sheets, voces, voices } = model
  return (
    <header className="sx-d-header sx-b-header">
      <div>
        <p className="sx-d-eyebrow">Provisiones para tu aventura</p>
        <h1>Tu mochila de viaje</h1>
        <p>
          Cada misión deja una pista. Aquí guardas lo que vas encontrando y marcas lo que quieras tener a mano
          cuando armes tus planes.
        </p>
      </div>
      <div className="sx-b-summary" aria-label="Compartimentos" role="group">
        <span className="sx-b-summary-icon" aria-hidden="true">
          <Backpack size={22} />
        </span>
        <div>
          <TrailBar
            label="Fichas"
            detalle={nuevas > 0 && <em className="sx-b-nuevas"> · {nuevas === 1 ? '1 nueva' : `${nuevas} nuevas`}</em>}
            value={porcentaje(fichasObtenidas.length, sheets.length)}
            text={`${fichasObtenidas.length} de ${sheets.length}`}
          />
          <TrailBar
            label="Voces de la ciudad"
            value={porcentaje(voces.abiertas.length, voices.length)}
            text={`${voces.abiertas.length} de ${voices.length}`}
          />
        </div>
      </div>
    </header>
  )
}
