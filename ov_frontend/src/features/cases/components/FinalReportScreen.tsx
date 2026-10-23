import { LockKeyhole } from 'lucide-react'
import { forestFirePhases } from '@/data/content/forestFireCase'

import { LumiMedallion } from '@/components/student/LumiMedallion'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'

import {
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
  SHOW_EXTRA_PROFESSIONAL,
  getPhaseSatisfaction,
  getProblemSatisfaction,
  getTotalSatisfaction,
} from '@/features/cases/lib/forestFireCaseLogic'
import type { ForestFireAssignments } from '@/types/cases'
import type { OcupacionNueva } from '@/types/servidor'
import type { TestimonioCaso } from '@/features/cases/hooks/useTestimonioCaso'
import { TarjetaTestimonio } from '@/components/student/TarjetaTestimonio'
import { abrirTestimonio } from '@/store/visorRecursoStore'
import type { ResultadoCasoServidor } from '@/features/cases/hooks/useForestFireCase'

import { SatisfactionBar } from '@/features/cases/components/SatisfactionBar'

export function FinalReportScreen({
  assignments,
  bestScore,
  newIcons,
  testimonio,
  etiquetaVolver,
  onRestart,
  onFinish,
  extraReason,
  extraProfessionalId,
  servidor,
}: {
  assignments: ForestFireAssignments
  bestScore: number
  newIcons: OcupacionNueva[]
  // Ajustes Central (7): el testimonio que regala el caso, con la tarjeta de Recursos; sin él, no hay bloque.
  testimonio?: TestimonioCaso
  etiquetaVolver: string
  onRestart: () => void
  onFinish: () => void
  extraReason: string
  extraProfessionalId: string
  // F04 (api): aprobado según el umbral del servidor.
  servidor?: ResultadoCasoServidor
}) {
  const score = getTotalSatisfaction(assignments)
  const passed = servidor ? servidor.superado : score >= FOREST_FIRE_PASS_SCORE
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
        {servidor && (
          <>
            <p>{servidor.puntaje}</p>
            <p>{servidor.tipos}</p>
          </>
        )}
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
            <p className="ff-eyebrow">Íconos de ocupación · {newIcons.length} nuevos</p>
            {newIcons.length ? (
              <ul className="ff-tags">
                {newIcons.map((icono) => (
                  <li key={icono.codigo}>{icono.titulo}</li>
                ))}
              </ul>
            ) : (
              <p>Ya tenías los íconos de las ocupaciones que aportaron en este intento.</p>
            )}
          </div>
          {testimonio && (
            <div className="ff-reward ff-reward-testimonio">
              <p className="ff-eyebrow">Testimonio desbloqueado</p>
              <article className="sx-b-card sx-b-voice sx-b-unlocked">
                <TarjetaTestimonio
                  nombre={testimonio.nombre}
                  rol={testimonio.rol}
                  titulo={testimonio.titulo}
                  cita={testimonio.cita}
                  regalo={testimonio.regalo}
                  onEscuchar={() => abrirTestimonio(testimonio.codigo)}
                />
              </article>
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
      {/* El reintento de un caso superado vive en su drawer; sin superar, se sale con la X. */}
      <div className="ff-final-actions">
        {passed ? (
          <button className="ff-primary" onClick={onFinish}>
            {etiquetaVolver}
          </button>
        ) : (
          <button className="ff-primary" onClick={onRestart}>
            Intentar de nuevo
          </button>
        )}
      </div>
    </section>
  )
}
