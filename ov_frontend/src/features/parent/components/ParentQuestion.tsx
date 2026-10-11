import { useParentQuestion } from '@/features/parent/hooks/useParentQuestion'
import { ArrowRight, Check, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'

import type { Actividad, IntentoPregunta, NodoPregunta } from '@/types/activities'

import { PreviousButton } from '@/features/parent/components/PreviousButton'
type PracticeAttempt = Pick<IntentoPregunta, 'opcionIds' | 'correcta' | 'revelada' | 'numeroIntento'>
export function ParentQuestion({
  activity,
  node,
  review,
  practiceAttempts,
  onPracticeAnswer,
  onContinue,
  onBack,
  backDisabled,
}: {
  activity: Actividad
  node: NodoPregunta
  review: boolean
  practiceAttempts: PracticeAttempt[]
  onPracticeAnswer: (selected: string[]) => void
  onContinue: () => void
  onBack: () => void
  backDisabled: boolean
}) {
  const { feedbackTitle, answerOptions, selected, setSelected, retrying, feedback, wrongIds, check, retry } =
    useParentQuestion({ activity, node, review, practiceAttempts, onPracticeAnswer })
  return (
    <div className="mt-6 space-y-5">
      <fieldset ref={answerOptions} tabIndex={-1} className="space-y-3 outline-none">
        <legend className="sr-only">
          {node.formato === 'opcion_multiple'
            ? 'Marque todas las respuestas que correspondan'
            : 'Seleccione una respuesta'}
        </legend>
        {node.opciones.map((option) => {
          const final = !!feedback?.canContinue
          const correct = final && option.correcta
          const wrong = wrongIds.has(option.id)
          const chosen = selected.includes(option.id)
          const tone = correct ? 'correct' : wrong ? 'wrong' : chosen ? 'selected' : final ? 'muted' : 'idle'
          return (
            <label className="parent-answer-option" data-tone={tone} key={option.id}>
              <input
                className="sr-only"
                name={node.id}
                type={node.formato === 'opcion_multiple' ? 'checkbox' : 'radio'}
                checked={chosen}
                disabled={(!!feedback && !retrying) || wrong}
                onChange={() =>
                  setSelected(
                    node.formato === 'opcion_multiple'
                      ? chosen
                        ? selected.filter((id) => id !== option.id)
                        : [...selected, option.id]
                      : [option.id],
                  )
                }
              />
              <span
                className={`parent-option-marker ${node.formato === 'opcion_multiple' ? 'parent-checkbox-marker' : ''}`}
                aria-hidden
              >
                {correct ? (
                  <Check size={19} />
                ) : wrong ? (
                  <X size={19} />
                ) : chosen ? (
                  node.formato === 'opcion_multiple' ? (
                    <Check size={16} />
                  ) : (
                    <span />
                  )
                ) : null}
              </span>
              <span className="parent-option-text">{option.texto}</span>
              {correct ? (
                <span className="parent-option-tag">
                  {chosen ? 'Su respuesta · Correcta' : 'Respuesta correcta'}
                </span>
              ) : wrong ? (
                <span className="parent-option-tag">Su respuesta</span>
              ) : null}
            </label>
          )
        })}
      </fieldset>
      {feedback && (
        <>
          <section
            className={`parent-question-feedback ${feedback.canContinue && feedback.correct ? 'parent-feedback-correct' : 'parent-feedback-hint'}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <h3 ref={feedbackTitle} tabIndex={-1}>
              {feedback.title}
            </h3>
            {feedback.explanations.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </section>
          {feedback.canContinue && (
            <aside className="parent-remember">
              <h3>Para recordar</h3>
              <p>{node.explicacion}</p>
            </aside>
          )}
        </>
      )}
      <div className="parent-player-navigation">
        <PreviousButton onClick={onBack} disabled={backDisabled} />
        {feedback?.canContinue ? (
          <Button onClick={onContinue}>
            Continuar <ArrowRight aria-hidden />
          </Button>
        ) : feedback && !retrying ? (
          <Button onClick={retry}>
            Volver a intentarlo <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button disabled={!selected.length} onClick={check}>
            Comprobar respuesta
          </Button>
        )}
      </div>
    </div>
  )
}
