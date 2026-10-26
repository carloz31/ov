import { Check, Target } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { ConditionList } from './ConditionList'
import type { TravelerLevel } from '@/store/adventureStore'
import type { CondicionesPasaporte } from '@/types/profile'

type Titulo = { numero: number; titulo: string; obtenido: boolean }

function rotulo(numero: number, obtenido: boolean, actual: number, ultimo: number) {
  if (numero === actual) return 'Tu título actual'
  if (obtenido) return 'Alcanzado'
  if (numero === actual + 1) return 'Siguiente'
  return numero === ultimo ? 'Final del viaje' : 'Más adelante'
}

// Ajuste pasaporte-perfil: el título actual, el siguiente con sus condiciones y el sendero de todos los títulos.
export function PassportLevelCard({
  level,
  titulos,
  siguiente,
}: {
  level: TravelerLevel
  titulos: Titulo[]
  siguiente?: { titulo: string; condiciones: CondicionesPasaporte | null }
}) {
  const ultimo = titulos.at(-1)?.numero ?? level.number
  return (
    <Parchment className="sx-d-dark sx-p-level" id="nivel">
      <div className="sx-p-level-summary">
        <div className="sx-p-level-current">
          <span className="sx-level-medallion sx-p-level-seal">
            <span>NIVEL</span>
            <strong>{String(level.number).padStart(2, '0')}</strong>
          </span>
          <div>
            <p className="sx-d-eyebrow">
              Nivel {level.number} de {titulos.length || level.number} · tu título de viajero
            </p>
            <h2>{level.label}</h2>
            <p>{level.description}</p>
            {level.citaLumi && <p className="sx-p-lumi-quote">Lumi: «{level.citaLumi}»</p>}
          </div>
        </div>
        <div className="sx-p-next-title">
          <p className="sx-d-eyebrow">
            <Target aria-hidden="true" size={16} />
            Siguiente título
          </p>
          {siguiente ? (
            <>
              <strong>{siguiente.titulo}</strong>
              {siguiente.condiciones && siguiente.condiciones.total > 0 && (
                <>
                  <p className="sx-p-next-summary">
                    {siguiente.condiciones.cumplidas} de {siguiente.condiciones.total} condiciones cumplidas
                  </p>
                  <ConditionList condiciones={siguiente.condiciones} />
                </>
              )}
            </>
          ) : (
            <strong>Llegaste al último título del viaje</strong>
          )}
        </div>
      </div>
      <ol className="sx-p-title-trail" aria-label="Camino de los títulos">
        {titulos.map(({ numero, titulo, obtenido }) => (
          <li
            key={numero}
            data-state={
              numero === level.number
                ? 'current'
                : obtenido
                  ? 'earned'
                  : numero === level.number + 1
                    ? 'next'
                    : 'pending'
            }
          >
            <span aria-hidden="true">{obtenido && numero !== level.number ? <Check size={20} /> : numero}</span>
            <strong>{titulo}</strong>
            <small>{rotulo(numero, obtenido, level.number, ultimo)}</small>
          </li>
        ))}
      </ol>
    </Parchment>
  )
}
