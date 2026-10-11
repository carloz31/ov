import {
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
} from '@/features/cases/lib/forestFireCaseLogic'

export function SatisfactionBar({ score, bestScore }: { score: number; bestScore?: number }) {
  return (
    <div className="ff-satisfaction">
      <div className="ff-score-label">
        <strong>Satisfacción de la comunidad</strong>
        <span>
          {score} de {FOREST_FIRE_MAX_SATISFACTION} puntos
        </span>
      </div>
      <div
        className="ff-score-track"
        role="progressbar"
        aria-label="Satisfacción de la comunidad"
        aria-valuemin={0}
        aria-valuemax={FOREST_FIRE_MAX_SATISFACTION}
        aria-valuenow={score}
      >
        <div style={{ width: `${(score / FOREST_FIRE_MAX_SATISFACTION) * 100}%` }} />
        <i style={{ left: `${(FOREST_FIRE_PASS_SCORE / FOREST_FIRE_MAX_SATISFACTION) * 100}%` }} />
      </div>
      <p>Mínimo para superar: {FOREST_FIRE_PASS_SCORE}</p>
      {bestScore !== undefined && (
        <p>
          Tu mejor puntaje en este caso: {bestScore} de {FOREST_FIRE_MAX_SATISFACTION}.
        </p>
      )}
    </div>
  )
}
