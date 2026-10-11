import { ParentActivitySlide } from '@/features/parent/components/ParentActivitySlide'
import { ParentActivityFinish } from '@/features/parent/components/ParentActivityFinish'
import { useParentActivitySession } from '@/features/parent/hooks/useParentActivitySession'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'

import type { Actividad } from '@/types/activities'
import { appPaths } from '@/routes/paths'

import { evaluateParentQuestion } from '@/features/parent/lib/missionLogic'

import { ParentResourceDialog } from '@/features/parent/components/ParentResourceDialog'
import { ParentQuestion } from '@/features/parent/components/ParentQuestion'
import { PreviousButton } from '@/features/parent/components/PreviousButton'

export function ParentActivitySession({ activity, review }: { activity: Actividad; review: boolean }) {
  const model = useParentActivitySession(activity, review)
  const {
    navigate,
    error,
    optionId,
    setOptionId,
    resources,
    setResources,
    practice,
    setPractice,
    entrance,
    heading,
    resourceTrigger,
    node,
    index,
    steps,
    step,
    selected,
    advance,
    back,
  } = model
  return (
    <div className="parent-activity-player min-h-svh">
      <header className="parent-activity-topbar">
        <Button
          className="parent-player-exit"
          size="icon"
          aria-label="Salir de la actividad"
          onClick={() => navigate(appPaths.parent.activities)}
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
        <div className="parent-activity-heading">
          <p>{review ? 'Repaso' : 'Actividad informativa'}</p>
          <h1>{activity.titulo}</h1>
        </div>
        <span className="parent-activity-step">
          Paso {step} de {steps.length}
        </span>
        <div
          className="parent-activity-progress"
          role="progressbar"
          aria-label="Avance de la actividad"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={step}
          aria-valuetext={`Paso ${step} de ${steps.length}`}
        >
          <span
            className="parent-progress-track"
            style={{ width: `${100 - (step / steps.length) * 100}%` }}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-5 py-8 sm:px-10 lg:py-10">
        {!review && error && (
          <div role="alert" className="mb-5 rounded-xl border p-4">
            <p>{error}</p>
            <Button className="mt-3" variant="outline" onClick={model.retrySaving}>
              Reintentar guardado
            </Button>
          </div>
        )}
        {node ? (
          <div className="min-w-0">
            {node.transicion && (
              <div
                key={`transition-${node.id}`}
                className={`parent-transition ${entrance.transition ? 'parent-rise' : ''}`}
              >
                <CheckCircle2 size={22} aria-hidden />
                <p>{node.transicion}</p>
              </div>
            )}
            <p className="parent-section-label">
              {node.tipo === 'diapositiva'
                ? (node.etiqueta ?? 'Información')
                : node.tipo === 'pregunta'
                  ? 'Para comprobar'
                  : node.tipo === 'eleccion'
                    ? 'Para conversar'
                    : 'Información'}
            </p>
            <h2
              ref={heading}
              tabIndex={-1}
              className={`parent-step-title ${node.tipo === 'pregunta' ? 'parent-question-title' : ''}`}
            >
              {node.tipo === 'diapositiva'
                ? node.titulo
                : node.tipo === 'pregunta'
                  ? node.enunciado
                  : node.tipo === 'eleccion'
                    ? node.enunciado
                    : 'Para continuar'}
            </h2>
            {node.tipo === 'diapositiva' && <ParentActivitySlide model={model} />}
            {node.tipo === 'dialogo' && <p className="mt-5 leading-8">{node.texto}</p>}
            {node.tipo === 'pregunta' && (
              <ParentQuestion
                key={node.id}
                activity={activity}
                node={node}
                review={review}
                practiceAttempts={practice[node.id] ?? []}
                onPracticeAnswer={(selection) =>
                  setPractice((current) => {
                    const attempts = current[node.id] ?? []
                    const result = evaluateParentQuestion(node, selection, attempts.length)
                    return {
                      ...current,
                      [node.id]: [
                        ...attempts,
                        {
                          opcionIds: selection,
                          correcta: result.correct,
                          revelada: result.revealed,
                          numeroIntento: attempts.length + 1,
                        },
                      ],
                    }
                  })
                }
                onContinue={advance}
                onBack={back}
                backDisabled={index <= 0}
              />
            )}
            {node.tipo === 'eleccion' && (
              <div className="mt-5 space-y-4">
                {node.nota && <p className="parent-support-text">{node.nota}</p>}
                <div className="grid gap-3">
                  {node.opciones.map((option) => (
                    <Button
                      key={option.id}
                      variant={optionId === option.id ? 'default' : 'outline'}
                      className="parent-choice-button"
                      aria-pressed={optionId === option.id}
                      onClick={() => setOptionId(option.id)}
                    >
                      {option.texto}
                    </Button>
                  ))}
                </div>
                {selected && (
                  <div role="status" className="parent-transition">
                    {selected.reaccion?.map((reaction) => <p key={reaction.id}>{reaction.texto}</p>) ?? (
                      <p>Puede continuar.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {node.tipo !== 'pregunta' && (
              <div className="parent-player-navigation">
                <PreviousButton onClick={back} disabled={index <= 0} />
                <Button disabled={node.tipo === 'eleccion' && !selected} onClick={advance}>
                  {index === activity.nodos.length - 1 ? 'Terminar actividad' : 'Continuar'}{' '}
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ParentActivityFinish model={model} />
        )}
      </main>
      <ParentResourceDialog
        returnFocus={() => resourceTrigger.current?.focus()}
        ids={resources}
        open={resources.length > 0}
        onOpenChange={(open) => {
          if (!open) setResources([])
        }}
      />
    </div>
  )
}
