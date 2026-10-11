import { Check, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import type { DecisionSheet } from '@/types/decisions'
import { TrailBar } from '@/components/student/TrailBar'
import { getPlanCompleteness, getPlanSections, planSections } from '../lib/plans'
export function PlanCard({
  sheet,
  index,
  count,
  first,
  onArchive,
  onMove,
  onPending,
}: {
  sheet: DecisionSheet
  index: number
  count: number
  first: boolean
  onArchive: () => void
  onMove: (direction: -1 | 1) => void
  onPending: () => void
}) {
  const complete = getPlanCompleteness(sheet),
    sections = getPlanSections(sheet)
  return (
    <article className="sx-d-plan-card" data-position={index} data-complete={complete === 4}>
      <div className="sx-d-parchment">
        <div className="sx-d-row">
          <span className="sx-d-plan-letter" data-position={index}>
            {'ABC'[index]}
          </span>
          <strong>Plan {'ABC'[index]}</strong>
          <button type="button" className="sx-d-icon" aria-label="Archivar plan" onClick={onArchive}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
        <h2>{sheet.name}</h2>
        <p>{sheet.budgets[0]?.name || 'Aún sin institución elegida'}</p>
        {first && <span className="sx-d-tag">Tu primer interés</span>}
        <div className="sx-d-quote">
          <strong>Por qué la elijo</strong>
          <p className="sx-d-clamp">
            <em>
              {sheet.motivation.trim() ? `«${sheet.motivation}»` : 'Todavía no escribes por qué la eliges.'}
            </em>
          </p>
        </div>
        <ul className="sx-d-plan-sections">
          {planSections.map((label, i) => (
            <li key={label} data-done={sections[i]}>
              <span aria-hidden="true">{sections[i] && <Check size={18} />}</span>
              {label}
            </li>
          ))}
        </ul>
        <TrailBar
          label={complete === 4 ? 'Opción real' : 'En construcción'}
          value={(complete / 4) * 100}
          text={`${complete} de 4`}
        />
        <button type="button" className="sx-d-action sx-d-full" onClick={onPending}>
          {complete === 4 ? 'Revisar mi plan' : `Seguir con: ${planSections[sections.indexOf(false)]}`}
        </button>
        <div className="sx-d-actions sx-d-priority">
          <button
            type="button"
            aria-label="Subir prioridad"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
            Subir prioridad
          </button>
          <button
            type="button"
            aria-label="Bajar prioridad"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
            Bajar prioridad
          </button>
        </div>
      </div>
    </article>
  )
}
