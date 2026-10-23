import type { AdventureState } from '@/types/adventure'
import { useProgresoCaso } from '@/features/cases/hooks/useProgresoCaso'
import '../styles/forest-fire-progress.css'

export function ForestFireCaseProgress({
  adventure,
  actividad,
}: {
  adventure: Pick<AdventureState, 'solvedCaseIds' | 'caseBestScores'>
  actividad?: string
}) {
  const progreso = useProgresoCaso(adventure, actividad)
  if (!progreso) return null
  const { minimo, maximo, mejor: score, superado: passed } = progreso
  return (
    <div className={`ff-case-progress ${passed ? 'is-passed' : score !== undefined ? 'is-in-progress' : ''}`}>
      {score === undefined ? (
        <p>
          Para superarlo necesitas al menos{' '}
          <strong>
            {minimo} de {maximo}
          </strong>{' '}
          puntos de satisfacción. No hace falta una respuesta perfecta.
        </p>
      ) : (
        <>
          <p>
            Tu mejor puntaje{' '}
            <strong>
              {score} de {maximo}
            </strong>
          </p>
          <div
            className="ff-case-progress-track"
            role="progressbar"
            aria-label="Mejor puntaje del caso"
            aria-valuemin={0}
            aria-valuemax={maximo}
            aria-valuenow={score}
          >
            <span style={{ width: `${Math.min(100, (score / maximo) * 100)}%` }} />
            <i style={{ left: `${(minimo / maximo) * 100}%` }} />
          </div>
          <small>Mínimo para superar: {minimo}</small>
          <p>
            {passed
              ? score >= maximo
                ? 'Respuesta completa: cubriste todas las necesidades.'
                : `Superado. Puedes volver a jugarlo para llegar a ${maximo}.`
              : `Te faltan ${Math.max(0, minimo - score)} puntos para superarlo.${progreso.invitaReintento ? ' Puedes volver a intentarlo.' : ''}`}
          </p>
        </>
      )}
    </div>
  )
}
