import {
  FOREST_FIRE_MAX_SATISFACTION as MAXIMO_LOCAL,
  FOREST_FIRE_PASS_SCORE as MINIMO_LOCAL,
} from '@/features/cases/lib/forestFireCaseLogic'

// Ajuste carga-casos: la escala del caso jugado (local: la del incendio).
export function SatisfactionBar({
  score,
  bestScore,
  maximo: FOREST_FIRE_MAX_SATISFACTION = MAXIMO_LOCAL,
  minimo: FOREST_FIRE_PASS_SCORE = MINIMO_LOCAL,
}: {
  score: number
  bestScore?: number
  maximo?: number
  minimo?: number
}) {
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
