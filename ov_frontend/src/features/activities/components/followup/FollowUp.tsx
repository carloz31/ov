import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Actividad, NodoConsigna } from '@/types/activities'
import { InlineDialogue } from '../InlineDialogue'
import { evaluateResponse, finalizeResponse } from '../../lib/reflection/evaluation'
import { getReflections } from '@/store/reflectionStore'
import {
  getFollowUpRecord,
  saveFollowUpResponse,
  setFollowUpRecord,
  useFollowUps,
} from '../../store/followUpStore'
import { answeredTurns, responseCapacity } from '../../lib/responseCondenser'
import { TypedQuestion } from '@/features/activities/components/followup/TypedQuestion'
export function FollowUp({
  activity,
  node,
  onContinue,
}: {
  activity: Actividad
  node: NodoConsigna
  onContinue: () => void
}) {
  const key = `${activity.id}/${node.id}`
  const record = useFollowUps().records[key]
  const [phase, setPhase] = useState<'waiting' | 'question' | 'finishing' | 'done'>('waiting')
  const [response, setResponse] = useState('')
  const [condensed, setCondensed] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const finishing = useRef(false)
  const mounted = useRef(false)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const last = record?.turnos.at(-1)
  const question = last && !last.omitida && last.respuesta === undefined ? last : undefined
  const input = {
    textoInicial: record?.textoInicial ?? '',
    turnos: record?.turnos ?? [],
    premisa: node.premisa,
    maxCaracteres: node.entregable.tipo === 'texto' ? node.entregable.maxCaracteres : undefined,
  }
  const capacity = question ? responseCapacity(input, question.pregunta) : 0

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!record || finishing.current) return
    let cancelled = false
    async function finish() {
      finishing.current = true
      setPhase('finishing')
      const result = await saveFollowUpResponse(activity, node)
      if (
        (answeredTurns(record!.turnos).length &&
          !result.saved &&
          !getFollowUpRecord(key)?.versionCondensada) ||
        !finalizeResponse(activity, node)
      ) {
        finishing.current = false
        if (mounted.current)
          setError('No se pudo guardar todo el seguimiento. Libera espacio y vuelve a intentarlo.')
        return
      }
      if (!mounted.current) return
      setCondensed(result.saved)
      setPhase('done')
    }
    if (last && !last.omitida && last.respuesta === undefined) {
      setPhase('question')
      return
    }
    if (last?.omitida || getReflections().respuestas[key]?.estado === 'FINAL') {
      void finish()
      return
    }
    setPhase('waiting')
    void (async () => {
      const result = await evaluateResponse(
        activity,
        node,
        [record.textoInicial, ...answeredTurns(record.turnos).map((turn) => turn.respuesta)].join('\n\n'),
        answeredTurns(record.turnos).length,
      )
      if (cancelled || !mounted.current) return
      const pregunta = result?.clasificacion === 'INSUFICIENTE' ? result.preguntaSeguimiento : undefined
      const limit = pregunta
        ? responseCapacity(
            {
              textoInicial: record.textoInicial,
              turnos: record.turnos,
              premisa: node.premisa,
              maxCaracteres: node.entregable.tipo === 'texto' ? node.entregable.maxCaracteres : undefined,
            },
            pregunta,
          )
        : 0
      if (!pregunta || limit < 1 || record.turnos.length >= 2) {
        await finish()
        return
      }
      const saved = setFollowUpRecord(key, {
        ...record,
        turnos: [
          ...record.turnos,
          {
            orden: record.turnos.length ? 2 : 1,
            pregunta,
            omitida: false,
            creadaEn: new Date().toISOString(),
          },
        ],
      })
      if (!saved) {
        setError('No se pudo guardar la pregunta de seguimiento. Vuelve a intentarlo.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activity, node, record, last, key, retry])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
    if (phase === 'question') textarea.current?.focus({ preventScroll: true })
    if (phase === 'done') continueButton.current?.focus({ preventScroll: true })
  }, [phase, question?.orden])

  function respond(omit: boolean) {
    if (!record || !question || finishing.current) return
    const value = response.trim()
    if (!omit && (!value || value.length > capacity)) return
    const current = getFollowUpRecord(key)
    // A double click cannot resolve the same turn twice.
    if (!current || current.turnos.at(-1)?.respondidaEn) return
    const saved = setFollowUpRecord(key, {
      ...current,
      turnos: current.turnos.map((turn) =>
        turn.orden === question.orden
          ? {
              ...turn,
              omitida: omit,
              respuesta: omit ? undefined : value,
              respondidaEn: new Date().toISOString(),
            }
          : turn,
      ),
    })
    setResponse('')
    if (!saved) {
      setError('No se pudo guardar la ampliación. Vuelve a intentarlo.')
    }
  }

  return (
    <section className="sx-followup" aria-label="Seguimiento de Lumi">
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="sx-secondary-button"
            onClick={() => {
              setError('')
              setRetry((value) => value + 1)
            }}
          >
            Reintentar guardado
          </button>
        </div>
      )}
      <h3>Tu respuesta</h3>
      <blockquote className="sx-followup-original">{record?.textoInicial}</blockquote>
      <div className="sx-followup-thread">
        {record?.turnos.map((turn) => (
          <div key={turn.orden} className="sx-followup-turn">
            {turn === question ? (
              <TypedQuestion key={turn.orden} text={turn.pregunta} />
            ) : (
              <InlineDialogue speakerId="companero" text={turn.pregunta} light />
            )}
            {answeredTurns([turn]).length > 0 && (
              <div className="sx-followup-answer">
                <span>Tu respuesta</span>
                <p>{turn.respuesta}</p>
              </div>
            )}
            {turn.omitida && <p className="sx-followup-omitted">Pregunta omitida</p>}
          </div>
        ))}
      </div>
      <div ref={end}>
        {(phase === 'waiting' || phase === 'finishing') && (
          <div role="status" className="sx-followup-waiting">
            <InlineDialogue speakerId="companero" text="Estoy leyendo tu respuesta…" light />
            <span className="sx-followup-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {phase === 'question' && question && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              respond(false)
            }}
          >
            <label className="sr-only" htmlFor={`sx-followup-${node.id}`}>
              Amplía tu respuesta
            </label>
            <textarea
              ref={textarea}
              id={`sx-followup-${node.id}`}
              className="sx-submission-textarea sx-followup-input"
              placeholder="Escribe aquí si quieres ampliar tu respuesta"
              value={response}
              maxLength={capacity}
              onChange={(event) => setResponse(event.target.value)}
              aria-describedby={`sx-followup-count-${node.id}`}
            />
            <p className="sx-submission-help" id={`sx-followup-count-${node.id}`}>
              Te quedan {Math.max(0, capacity - response.length)} caracteres
            </p>
            <div className="sx-player-actions">
              <button type="submit" className="sx-primary-button" disabled={!response.trim()}>
                Responder
                <ArrowRight size={18} />
              </button>
              <button type="button" className="sx-followup-skip" onClick={() => respond(true)}>
                Omitir
              </button>
            </div>
          </form>
        )}
        {phase === 'done' && (
          <div className="sx-followup-finish">
            <div role="status">
              <InlineDialogue
                speakerId="companero"
                light
                text={
                  condensed
                    ? 'Lo guardé todo junto, como una sola respuesta.'
                    : 'Tu respuesta quedó guardada tal como la escribiste.'
                }
              />
            </div>
            <button ref={continueButton} type="button" className="sx-primary-button" onClick={onContinue}>
              Continuar
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
