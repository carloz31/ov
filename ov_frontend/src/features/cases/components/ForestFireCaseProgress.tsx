import type { AdventureState } from '@/types/adventure'
import {
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
  getForestFireCaseStatus,
} from '@/features/cases/lib/forestFireCaseLogic'
import '../styles/forest-fire-progress.css'

export function ForestFireCaseProgress({
  adventure,
}: {
  adventure: Pick<AdventureState, 'solvedCaseIds' | 'caseBestScores'>
}) {
  const { score, passed } = getForestFireCaseStatus(adventure)
  return (
    <div className={`ff-case-progress ${passed ? 'is-passed' : score !== undefined ? 'is-in-progress' : ''}`}>
      {score === undefined ? (
        <p>
          Para superarlo necesitas al menos{' '}
          <strong>
            {FOREST_FIRE_PASS_SCORE} de {FOREST_FIRE_MAX_SATISFACTION}
          </strong>{' '}
          puntos de satisfacción. No hace falta una respuesta perfecta.
        </p>
      ) : (
        <>
          <p>
            Tu mejor puntaje{' '}
            <strong>
              {score} de {FOREST_FIRE_MAX_SATISFACTION}
            </strong>
          </p>
          <div
            className="ff-case-progress-track"
            role="progressbar"
            aria-label="Mejor puntaje del caso"
            aria-valuemin={0}
            aria-valuemax={FOREST_FIRE_MAX_SATISFACTION}
            aria-valuenow={score}
          >
            <span style={{ width: `${Math.min(100, (score / FOREST_FIRE_MAX_SATISFACTION) * 100)}%` }} />
            <i style={{ left: `${(FOREST_FIRE_PASS_SCORE / FOREST_FIRE_MAX_SATISFACTION) * 100}%` }} />
          </div>
          <small>Mínimo para superar: {FOREST_FIRE_PASS_SCORE}</small>
          <p>
            {passed
              ? score >= FOREST_FIRE_MAX_SATISFACTION
                ? 'Respuesta completa: cubriste todas las necesidades.'
                : `Superado. Puedes volver a jugarlo para llegar a ${FOREST_FIRE_MAX_SATISFACTION}.`
              : `Te faltan ${Math.max(0, FOREST_FIRE_PASS_SCORE - score)} puntos para superarlo.`}
          </p>
        </>
      )}
    </div>
  )
}
