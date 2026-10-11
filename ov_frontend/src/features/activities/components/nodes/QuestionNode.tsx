import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import { catalog } from '@/data/activities/content'
import { studentId } from '@/lib/activities/logic'
import type { Actividad, NodoPregunta } from '@/types/activities'
import { updateJourney, useJourney } from '@/store/journeyStore'
import { DialogueBox } from '../DialogueBox'
import { CheckOption, type CheckOptionState } from '../CheckOption'
import { evaluateStudentCheck } from '../../lib/checks'
import { LumiMedallion } from '@/components/student/LumiMedallion'

export function QuestionNode({
  activity,
  node,
  onContinue,
  fresh = false,
  onResources,
}: {
  activity: Actividad
  node: NodoPregunta
  onContinue: () => void
  fresh?: boolean
  onResources: (ids: string[]) => void
}) {
  const state = useJourney()
  const review = fresh || state.progress[activity.id]?.estado === 'completada'
  const prior = review
    ? []
    : state.attempts.filter((a) => a.actividadId === activity.id && a.nodoId === node.id)
  const [attempts, setAttempts] = useState(prior)
  const last = attempts.at(-1)
  const [selected, setSelected] = useState(
    last?.opcionIds.filter((id) => node.opciones.find((o) => o.id === id)?.correcta) ?? [],
  )
  const feedback = last ? evaluateStudentCheck(node, last.opcionIds, attempts.length - 1) : undefined
  const blocked = new Set(
    attempts.flatMap((a) => a.opcionIds.filter((id) => !node.opciones.find((o) => o.id === id)?.correcta)),
  )
  const titleRef = useRef<HTMLHeadingElement>(null)
  const hasFeedback = !!last
  useEffect(() => {
    if (hasFeedback) titleRef.current?.focus()
  }, [attempts.length, hasFeedback])
  const multiple = node.formato === 'opcion_multiple'
  const sheets = [
    ...new Set([
      ...activity.nodos.flatMap((n) => (n.tipo === 'diapositiva' ? (n.recursoIds ?? []) : [])),
      ...(activity.recompensa?.recursoIds ?? []),
    ]),
  ].filter((id) => catalog.recursos.some((r) => r.id === id && r.tipo === 'ficha'))
  function answer() {
    if (!selected.length || feedback?.final) return
    const outcome = evaluateStudentCheck(node, selected, attempts.length)
    const attempt = {
      estudianteId: studentId,
      actividadId: activity.id,
      nodoId: node.id,
      opcionIds: [...selected],
      correcta: outcome.correct,
      revelada: outcome.final && !outcome.correct,
      numeroIntento: attempts.length + 1,
      respondidaEn: new Date().toISOString(),
    }
    if (review || updateJourney((current) => ({ ...current, attempts: [...current.attempts, attempt] }))) {
      setAttempts([...attempts, attempt])
      if (!outcome.final) setSelected(selected.filter((id) => !outcome.wrongIds.includes(id)))
    }
  }
  return (
    <div className="sx-player-scene">
      <div className="sx-scene-space">
        <section className="sx-scene-panel sx-check-panel">
          <h2>{node.enunciado}</h2>
          <p className="sx-player-response-instruction">
            {multiple ? 'Marca todas las que correspondan.' : 'Selecciona una respuesta.'}
          </p>
          <div className="sx-player-options sx-question-options">
            {node.opciones.map((option) => {
              const chosen = feedback?.final
                ? last?.opcionIds.includes(option.id)
                : selected.includes(option.id)
              let optionState: CheckOptionState = blocked.has(option.id)
                ? 'incorrect'
                : chosen
                  ? 'selected'
                  : 'idle'
              if (feedback?.final)
                optionState = option.correcta
                  ? multiple && !chosen
                    ? 'missing'
                    : 'correct'
                  : chosen || blocked.has(option.id)
                    ? 'incorrect'
                    : 'muted'
              const label =
                optionState === 'correct'
                  ? chosen
                    ? 'Tu respuesta · Correcta'
                    : 'Respuesta correcta'
                  : optionState === 'incorrect'
                    ? 'Tu respuesta'
                    : optionState === 'missing'
                      ? `También era ${option.tambienEra ?? 'una respuesta correcta'}`
                      : undefined
              return (
                <CheckOption
                  key={option.id}
                  text={option.texto}
                  state={optionState}
                  multiple={multiple}
                  label={label}
                  explanation={
                    feedback?.final || (multiple && blocked.has(option.id))
                      ? (option.explicacion ?? option.retroalimentacion)
                      : undefined
                  }
                  disabled={feedback?.final || blocked.has(option.id)}
                  onClick={() =>
                    setSelected(
                      multiple
                        ? selected.includes(option.id)
                          ? selected.filter((id) => id !== option.id)
                          : [...selected, option.id]
                        : [option.id],
                    )
                  }
                />
              )
            })}
          </div>
          {feedback && (
            <div
              className={`sx-check-result ${feedback.correct ? 'is-success' : 'is-hint'}`}
              aria-live="polite"
            >
              <LumiMedallion />
              <div>
                <h3 ref={titleRef} tabIndex={-1}>
                  {feedback.title}
                </h3>
                <p>{feedback.explanation}</p>
              </div>
            </div>
          )}
          <div className="sx-player-actions">
            {sheets.length > 0 && (
              <button type="button" className="sx-secondary-button" onClick={() => onResources(sheets)}>
                <BookOpen size={18} />
                Ver ficha
              </button>
            )}
            {feedback?.final ? (
              <button type="button" className="sx-primary-button" onClick={onContinue}>
                Continuar el camino
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="sx-primary-button"
                disabled={!selected.length}
                onClick={answer}
              >
                {attempts.length ? 'Comprobar de nuevo' : 'Comprobar'}
              </button>
            )}
          </div>
        </section>
      </div>
      <DialogueBox speakerId={node.hablanteId} text={node.enunciado} />
    </div>
  )
}
