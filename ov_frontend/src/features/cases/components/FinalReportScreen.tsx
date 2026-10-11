import { LockKeyhole } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { forestFirePhases } from '@/data/content/forestFireCase'
import { professionalTestimonials } from '@/data/catalog/occupations'

import { LumiMedallion } from '@/components/student/LumiMedallion'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { discoveryPaths } from '@/routes/discoveryPaths'

import {
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
  SHOW_EXTRA_PROFESSIONAL,
  getPhaseSatisfaction,
  getProblemSatisfaction,
  getTotalSatisfaction,
} from '@/features/cases/lib/forestFireCaseLogic'
import type { ForestFireAssignments } from '@/types/cases'

import { SatisfactionBar } from '@/features/cases/components/SatisfactionBar'

export function FinalReportScreen({
  assignments,
  bestScore,
  newIconIds,
  onRestart,
  onFinish,
  extraReason,
  extraProfessionalId,
}: {
  assignments: ForestFireAssignments
  bestScore: number
  newIconIds: string[]
  onRestart: () => void
  onFinish: () => void
  extraReason: string
  extraProfessionalId: string
}) {
  const score = getTotalSatisfaction(assignments)
  const passed = score >= FOREST_FIRE_PASS_SCORE
  const testimonial = professionalTestimonials.find((t) => t.unlockCaseId === 'forest-fire')
  return (
    <section className="ff-content ff-report">
      <div className="ff-light ff-final-heading">
        <LumiMedallion celebration={passed} />
        <p>Lumi</p>
        <span className={`ff-status ${passed ? 'is-passed' : 'is-pending'}`}>
          {passed ? 'Caso superado' : 'Caso no superado todavía'}
        </span>
        <h1 tabIndex={-1}>
          {passed ? '¡La comunidad salió adelante!' : 'La comunidad aún necesita más ayuda'}
        </h1>
        <p>
          {passed
            ? `Reuniste un equipo que respondió a la mayoría de las necesidades.${score < FOREST_FIRE_MAX_SATISFACTION ? ` Algunas funciones quedaron sin cubrir: si quieres, intenta alcanzar los ${FOREST_FIRE_MAX_SATISFACTION} puntos.` : ''}`
            : 'Varias necesidades quedaron sin atender. Revisa las consecuencias de cada fase y vuelve con un nuevo equipo.'}
        </p>
        <SatisfactionBar score={score} bestScore={bestScore} />
      </div>
      <div className="ff-phase-summaries">
        {forestFirePhases.map((phase) => (
          <article className="ff-light" key={phase.id}>
            <h2>{phase.name}</h2>
            <strong>
              {getPhaseSatisfaction(phase, assignments[phase.id])} de{' '}
              {phase.problems.reduce((total, p) => total + p.expectedProfessionalIds.length, 0)}
            </strong>
            {phase.problems.map((problem) => (
              <div className="ff-summary-row" key={problem.id}>
                <span>{problem.title}</span>
                <strong>
                  {getProblemSatisfaction(problem, assignments[phase.id][problem.id])} de{' '}
                  {problem.expectedProfessionalIds.length}
                </strong>
              </div>
            ))}
          </article>
        ))}
      </div>
      {passed ? (
        <div className="ff-rewards">
          <h2>Lo que llevas contigo</h2>
          <div className="ff-light ff-reward">
            <p className="ff-eyebrow">Íconos de ocupación · {newIconIds.length} nuevos</p>
            {newIconIds.length ? (
              <ul>
                {newIconIds.map((id) => (
                  <li key={id}>
                    <a href={discoveryPaths.occupation(id)} target="_blank" rel="noopener noreferrer">
                      {getOccupation(id)?.name ?? id}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Ya tenías los íconos de las ocupaciones que aportaron en este intento.</p>
            )}
          </div>
          {testimonial && (
            <div className="ff-light ff-reward">
              <p className="ff-eyebrow">Testimonio desbloqueado</p>
              <h3>{testimonial.personName}</h3>
              <p>{testimonial.summary}</p>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="ff-primary">Ver testimonio</button>
                </DialogTrigger>
                <DialogContent className="ff-modal">
                  <DialogTitle>{testimonial.personName}</DialogTitle>
                  <DialogDescription>{testimonial.currentRole}</DialogDescription>
                  <p>{testimonial.story}</p>
                  <a
                    className="ff-secondary"
                    href={testimonial.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver video del testimonio<span className="sr-only"> (abre otra pestaña)</span>
                  </a>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      ) : (
        <div className="ff-dark ff-locked">
          <LockKeyhole aria-hidden="true" />
          <h2>El testimonio y los íconos se desbloquean al superar el caso</h2>
          <p>
            Revisa en cada fase qué quedó sin atender y vuelve a intentarlo. Tu mejor puntaje queda guardado.
          </p>
        </div>
      )}
      {SHOW_EXTRA_PROFESSIONAL && extraProfessionalId && (
        <div className="ff-light">
          <h2>Tu aporte profesional adicional</h2>
          <p>{getOccupation(extraProfessionalId)?.name}</p>
          <p>{extraReason}</p>
        </div>
      )}
      <div className="ff-final-actions">
        {passed ? (
          <>
            <button className="ff-primary" onClick={onFinish}>
              Volver a la ciudad
            </button>
            {score < FOREST_FIRE_MAX_SATISFACTION && (
              <button className="ff-secondary" onClick={onRestart}>
                Intentar llegar a {FOREST_FIRE_MAX_SATISFACTION}
              </button>
            )}
          </>
        ) : (
          <>
            <button className="ff-primary" onClick={onRestart}>
              Intentar de nuevo
            </button>
            <button className="ff-secondary" onClick={onFinish}>
              Volver a la ciudad
            </button>
          </>
        )}
      </div>
    </section>
  )
}
