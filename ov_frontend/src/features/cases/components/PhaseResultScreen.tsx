import { ArrowRight, CheckCircle2, Minus, Star, TriangleAlert } from 'lucide-react'

import { forestFirePhases, forestFireProfessionals } from '@/data/content/forestFireCase'

import { ForestFireProfessionalPanel } from '@/features/cases/components/ForestFireProfessionalPanel'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'

import { getPhaseSatisfaction, getProblemSatisfaction } from '@/features/cases/lib/forestFireCaseLogic'
import type { ForestFirePhase } from '@/types/cases'

export function PhaseResultScreen({
  phase,
  assignments,
  remaining,
  onContinue,
}: {
  phase: ForestFirePhase
  assignments: Record<string, string[]>
  remaining: number
  onContinue: () => void
}) {
  const maximum = phase.problems.reduce((total, p) => total + p.expectedProfessionalIds.length, 0)
  const next = forestFirePhases.find((p) => p.number === phase.number + 1)
  return (
    <section className="ff-content">
      <div className="ff-dark ff-result-heading">
        <LumiMedallion />
        <p className="ff-eyebrow">Fase {phase.number} resuelta</p>
        <h1 tabIndex={-1}>Así respondió tu equipo a la {phase.name.toLowerCase()}</h1>
        <p>Revisa qué aportó cada persona y qué necesidades quedaron sin cubrir.</p>
        <strong>
          {getPhaseSatisfaction(phase, assignments)} de {maximum} puntos de satisfacción
        </strong>
      </div>
      {phase.problems.map((problem, index) => {
        const selected = assignments[problem.id] ?? []
        const satisfaction = getProblemSatisfaction(problem, selected)
        return (
          <article className="ff-light" key={problem.id}>
            <p className="ff-eyebrow">Problema {index + 1}</p>
            <h2>{problem.title}</h2>
            <div
              className="ff-stars"
              aria-label={`${satisfaction} de ${problem.expectedProfessionalIds.length}`}
            >
              {problem.expectedProfessionalIds.map((id, i) => (
                <Star key={id} aria-hidden="true" fill={i < satisfaction ? 'currentColor' : 'none'} />
              ))}
              <span>
                {satisfaction} de {problem.expectedProfessionalIds.length}
              </span>
            </div>
            <p>{problem.resultNarrative}</p>
            {selected.map((id) => {
              const person = forestFireProfessionals.find((p) => p.id === id)!
              const contributed = problem.expectedProfessionalIds.includes(id)
              return (
                <div key={id} className={`ff-contribution ${contributed ? 'is-helpful' : 'is-neutral'}`}>
                  {contributed ? <CheckCircle2 aria-hidden="true" /> : <Minus aria-hidden="true" />}
                  <div>
                    <strong>
                      {person.personName} ({getOccupation(person.occupationId)?.name ?? person.name})
                    </strong>
                    <p className="ff-eyebrow">{contributed ? 'Aportó' : 'No era su función aquí'}</p>
                    <p>
                      {contributed
                        ? problem.professionalContributions[id]
                        : 'Participó, pero su especialidad no respondía a la necesidad principal de este problema. Usó 1 punto de presupuesto.'}
                    </p>
                    {contributed && <ForestFireProfessionalPanel initialProfessionalId={id} />}
                  </div>
                </div>
              )
            })}
            {problem.expectedProfessionalIds
              .filter((id) => !selected.includes(id))
              .map((id) => (
                <div className="ff-contribution is-missing" key={id}>
                  <TriangleAlert aria-hidden="true" />
                  <div>
                    <strong>Quedó sin atender</strong>
                    <p>{problem.missingContributionNarratives[id]}</p>
                  </div>
                </div>
              ))}
          </article>
        )
      })}
      <div className="ff-dark ff-result-footer">
        {next && (
          <p>
            Te quedan {remaining} puntos de presupuesto para las fases{' '}
            {forestFirePhases
              .filter((p) => p.number > phase.number)
              .map((p) => p.number)
              .join(' y ')}
            .
          </p>
        )}
        <button className="ff-primary" onClick={onContinue}>
          {next ? `Ir a la fase ${next.number}: ${next.name}` : 'Ver el cierre del caso'}
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  )
}
