import { ForestFireWorkspace } from '@/features/cases/components/ForestFireWorkspace'
import { useForestFireCase } from '@/features/cases/hooks/useForestFireCase'
import { ArrowRight, Check } from 'lucide-react'
import { forestFirePhases, forestFireProfessionals } from '@/data/content/forestFireCase'
import { ForestFireCaseHeader } from './ForestFireCaseHeader'
import { ListenScreen } from './ForestFireScene'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { SHOW_EXTRA_PROFESSIONAL, canOpenPhaseStep } from '@/features/cases/lib/forestFireCaseLogic'
import { ExtraProfessionalQuestionScreen } from '@/features/cases/components/ExtraProfessionalQuestionScreen'
import { ProfessionalWordCloudScreen } from '@/features/cases/components/ProfessionalWordCloudScreen'
import '../styles/forest-fire.css'
import '../styles/forest-fire-workspace.css'
import { StepActions } from '@/features/cases/components/StepActions'
import { PhaseResultScreen } from '@/features/cases/components/PhaseResultScreen'
import { FinalReportScreen } from '@/features/cases/components/FinalReportScreen'
export function ForestFireCaseView({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete?: () => void
}) {
  const model = useForestFireCase()
  const {
    phaseIndex,
    screen,
    setScreen,
    step,
    assignments,
    helpSeenByPhase,
    setHelpSeenByPhase,
    newIconIds,
    extraProfessionalId,
    setExtraProfessionalId,
    extraReason,
    setExtraReason,
    main,
    phase,
    heard,
    visited,
    remaining,
    phaseAssignments,
    labels,
    adventure,
    storageError,
    explorationError,
    goToStep,
    markHeard,
    restart,
    showReport,
    advance,
    complete,
    isStepComplete,
  } = model
  return (
    <div
      className={`sx-root ff-case ff-play ${screen === 'workspace' ? 'ff-workspace-active' : ''}`}
      style={{
        backgroundImage: `url(${phase.backgroundImage})`,
        backgroundPosition: phase.backgroundPosition,
      }}
    >
      <ForestFireCaseHeader
        label={
          screen === 'report'
            ? 'Cierre del caso'
            : `Fase ${phase.number} de ${forestFirePhases.length} · ${phase.name}`
        }
        progress={(phase.number / forestFirePhases.length) * 100}
        budgetRemaining={remaining}
        finished={screen === 'report'}
        onClose={onClose}
      >
        {screen === 'workspace' && (
          <nav className="ff-steps" aria-label="Pasos de la fase">
            {labels.map((label, index) => (
              <button
                key={label}
                aria-current={step === index ? 'step' : undefined}
                data-complete={isStepComplete(index) || undefined}
                disabled={
                  !visited.includes(index) && !canOpenPhaseStep(phase, phaseAssignments, heard, index)
                }
                onClick={() => goToStep(index)}
              >
                <span aria-hidden="true">{isStepComplete(index) ? <Check size={14} /> : index + 1}</span>
                {label}
              </button>
            ))}
          </nav>
        )}
      </ForestFireCaseHeader>
      <main ref={main}>
        {screen === 'phase-intro' && (
          <section
            className="ff-intro"
            style={{
              backgroundImage: `url(${phase.backgroundImage})`,
              backgroundPosition: phase.backgroundPosition,
            }}
          >
            <div className="ff-dark">
              <LumiMedallion />
              <p className="ff-eyebrow">Siguiente etapa</p>
              <h1 tabIndex={-1}>
                Fase {phase.number}: {phase.name}
              </h1>
              <p>{phase.subtitle}</p>
              <button className="ff-primary" onClick={() => setScreen('workspace')}>
                Comenzar fase
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
        {screen === 'workspace' && step === 0 && (
          <ListenScreen
            key={phase.id}
            phase={phase}
            heard={heard}
            helpSeen={!!helpSeenByPhase[phase.id]}
            onHelpSeen={() => setHelpSeenByPhase((current) => ({ ...current, [phase.id]: true }))}
            onHear={markHeard}
            onNext={() => goToStep(1)}
          />
        )}
        {screen === 'workspace' && step > 0 && step <= phase.problems.length && (
          <ForestFireWorkspace model={model} />
        )}
        {screen === 'workspace' && step === phase.problems.length + 1 && (
          <section className="ff-content">
            <div className="ff-dark">
              <LumiMedallion />
              <p className="ff-eyebrow">Revisa tu equipo</p>
              <h1 tabIndex={-1}>¿Así enfrentarás la {phase.name.toLowerCase()}?</h1>
              <p>
                Usarás {Object.values(phaseAssignments).reduce((total, ids) => total + ids.length, 0)} puntos.
                {phaseIndex < forestFirePhases.length - 1 &&
                  ` Te quedarán ${remaining} para las fases siguientes.`}
              </p>
            </div>
            {phase.problems.map((problem, index) => (
              <article className="ff-light ff-review" key={problem.id}>
                <h2>{problem.title}</h2>
                <ul>
                  {phaseAssignments[problem.id].map((id) => {
                    const person = forestFireProfessionals.find((p) => p.id === id)!
                    return (
                      <li key={id}>
                        {person.personName} ({getOccupation(person.occupationId)?.name ?? person.name})
                      </li>
                    )
                  })}
                </ul>
                {!phaseAssignments[problem.id].length && <p>Este problema necesita al menos un contacto.</p>}
                <button
                  className="ff-secondary"
                  aria-label={`Cambiar equipo para ${problem.title}`}
                  onClick={() => goToStep(index + 1)}
                >
                  Cambiar
                </button>
              </article>
            ))}
            <StepActions
              onBack={() => goToStep(phase.problems.length)}
              disabled={!complete}
              onNext={() => {
                if (complete) setScreen('result')
              }}
              label="Confirmar equipo"
            />
          </section>
        )}
        {screen === 'result' && (
          <PhaseResultScreen
            phase={phase}
            assignments={phaseAssignments}
            remaining={remaining}
            onContinue={advance}
          />
        )}
        {screen === 'game-over' && (
          <section className="ff-intro" style={{ backgroundImage: `url(${phase.backgroundImage})` }}>
            <div className="ff-dark">
              <LumiMedallion />
              <h1 tabIndex={-1}>El presupuesto se agotó</h1>
              <p>
                Usaste los 16 puntos antes de completar todas las fases. Vuelve a intentarlo con un nuevo
                equipo.
              </p>
              <button className="ff-primary" onClick={restart}>
                Intentar de nuevo
              </button>
              <button className="ff-secondary" onClick={onClose}>
                Volver a la ciudad
              </button>
            </div>
          </section>
        )}
        {SHOW_EXTRA_PROFESSIONAL && screen === 'extra-question' && (
          <ExtraProfessionalQuestionScreen
            selectedProfessionalId={extraProfessionalId}
            reason={extraReason}
            onSelectProfessional={setExtraProfessionalId}
            onReasonChange={setExtraReason}
            onSubmit={() => setScreen('word-cloud')}
          />
        )}
        {SHOW_EXTRA_PROFESSIONAL && screen === 'word-cloud' && (
          <ProfessionalWordCloudScreen
            selectedProfessionalId={extraProfessionalId}
            reason={extraReason}
            onContinue={showReport}
          />
        )}
        {screen === 'report' && (
          <FinalReportScreen
            assignments={assignments}
            bestScore={adventure.caseBestScores['forest-fire'] ?? 0}
            newIconIds={newIconIds}
            onRestart={restart}
            onFinish={onComplete ?? onClose}
            extraReason={extraReason}
            extraProfessionalId={extraProfessionalId}
          />
        )}
        {screen === 'report' && (storageError || explorationError) && (
          <p className="ff-storage-warning" role="status">
            No se pudo guardar en este dispositivo. El resultado sigue disponible durante esta sesión.
          </p>
        )}
      </main>
    </div>
  )
}
