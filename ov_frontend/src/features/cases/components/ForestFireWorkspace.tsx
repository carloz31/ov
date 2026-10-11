import { useForestFireCase } from '@/features/cases/hooks/useForestFireCase'
import { ArrowDown, X } from 'lucide-react'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
import { ProfessionalDirectory } from '@/features/cases/components/ProfessionalDirectory'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { toggleAssignment } from '@/features/cases/lib/forestFireCaseLogic'
import { StepActions } from '@/features/cases/components/StepActions'
import { ClueList } from '@/features/cases/components/ClueList'
export function ForestFireWorkspace({ model }: { model: ReturnType<typeof useForestFireCase> }) {
  const {
    step,
    setAssignments,
    dragContactId,
    setDragContactId,
    dropHovered,
    setDropHovered,
    phase,
    remaining,
    phaseAssignments,
    goToStep,
    call,
  } = model
  return (
    <section className="ff-workspace" key={`${phase.id}-${step}`}>
      <div className="ff-problem-column">
        <article className="ff-problem-card ff-dark">
          <p className="ff-eyebrow">
            Problema {step} de {phase.problems.length}
          </p>
          <h1 tabIndex={-1}>{phase.problems[step - 1].title}</h1>
          <p>{phase.problems[step - 1].detail}</p>
          <div className="ff-community-mobile">
            <ClueList phase={phase} label="Pistas" />
          </div>
        </article>
        <div className="ff-community-desktop ff-dark">
          <div className="ff-community-heading">
            <h2>Lo que dijo la comunidad</h2>
            <ClueList phase={phase} label="Ver completo" />
          </div>
          <ul>
            {phase.messages.map((message) => (
              <li key={message.id}>
                <strong>{message.speaker}:</strong> {message.summary}
              </li>
            ))}
          </ul>
        </div>
        <div
          className={`ff-team-zone ff-dark ${dragContactId ? 'is-dragging-contact' : ''} ${dropHovered ? 'is-drop-hovered' : ''}`}
        >
          <div className="ff-team-heading">
            <h2>
              Tu equipo<span className="ff-desktop-copy"> para este problema</span>
            </h2>
            <span>{phaseAssignments[phase.problems[step - 1].id].length} contactos</span>
          </div>
          {phaseAssignments[phase.problems[step - 1].id].length === 0 && (
            <div className="ff-team-empty">
              <div className="ff-desktop-copy">
                <ArrowDown size={28} />
                <strong>
                  {dropHovered && dragContactId
                    ? `Suelta para agregar a ${forestFireProfessionals.find((p) => p.id === dragContactId)?.personName}`
                    : 'Arrastra aquí a quien llamarías'}
                </strong>
                <p>
                  Revisa su hoja de vida en la lista de la derecha y suéltalo en este espacio. También puedes
                  usar el botón +.
                </p>
              </div>
              <p className="ff-mobile-copy">Toca + en un contacto para sumarlo</p>
            </div>
          )}
          <ul className="ff-team">
            {phaseAssignments[phase.problems[step - 1].id].map((id) => {
              const person = forestFireProfessionals.find((p) => p.id === id)!
              return (
                <li key={id}>
                  <span className="ff-initial">{person.personName.charAt(0)}</span>
                  <span>
                    <strong>{person.personName}</strong>
                    <small>{getOccupation(person.occupationId)?.name ?? person.name}</small>
                  </span>
                  <button
                    className="ff-icon-button"
                    aria-label={`Quitar a ${person.personName}`}
                    onClick={() =>
                      setAssignments((current) =>
                        toggleAssignment(current, phase.id, phase.problems[step - 1].id, id),
                      )
                    }
                  >
                    <X size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
          {dropHovered && dragContactId && phaseAssignments[phase.problems[step - 1].id].length > 0 && (
            <p className="ff-drop-label">
              Suelta para agregar a {forestFireProfessionals.find((p) => p.id === dragContactId)?.personName}
            </p>
          )}
        </div>
        <StepActions
          onBack={() => goToStep(step - 1)}
          disabled={!phaseAssignments[phase.problems[step - 1].id].length}
          onNext={() => goToStep(step + 1)}
          label={step === phase.problems.length ? 'Revisar el equipo' : 'Siguiente problema'}
        />
      </div>
      <ProfessionalDirectory
        selectedIds={phaseAssignments[phase.problems[step - 1].id]}
        budgetRemaining={remaining}
        problemTitle={phase.problems[step - 1].title}
        onCall={(id) => call(phase.problems[step - 1].id, id)}
        onDragContact={(id, overTeam) => {
          setDragContactId(id)
          setDropHovered(!!id && !!overTeam)
        }}
      />
    </section>
  )
}
