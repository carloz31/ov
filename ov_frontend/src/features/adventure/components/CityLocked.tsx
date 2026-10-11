import { useCityRequirement } from '../hooks/useCityRequirement'
import { KeyRound } from 'lucide-react'


import { Link } from 'react-router'
import { Progress } from '@/components/ui/Progress'

import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'

export function CityLocked({ adventure }: { adventure: AdventureState }) {
  const { requisito, error, setIntento, mostrarRequisito, progreso } = useCityRequirement(adventure)

  return (
    <div className="sx-city-mist">
      <section className="sx-glass sx-city-locked">
        <KeyRound size={56} />
        <p>Capítulo 2 · La ciudad</p>
        <h2>Una llave, mil posibilidades</h2>
        <p>
          La ciudad abrirá sus puertas cuando completes todas las Misiones de Campo. Allí podrás ayudar a sus
          habitantes e investigar profesiones.
        </p>
        <Progress
          aria-label="Camino hacia la ciudad"
          value={
            progreso
          }
        />
        {mostrarRequisito && <p role={error ? 'alert' : 'status'}>{requisito}</p>}
        {mostrarRequisito && error && (
          <button className="sx-secondary-button" onClick={() => setIntento((i) => i + 1)}>
            Reintentar requisito
          </button>
        )}
        <Link className="sx-primary-button" to={appPaths.student.missions}>
          Continuar mi recorrido
        </Link>
      </section>
    </div>
  )
}
