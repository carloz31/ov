import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { InlineDialogue } from '../InlineDialogue'
import { TypedQuestion } from '@/features/activities/components/followup/TypedQuestion'
import type { TurnoRegistro } from '../../hooks/useRegistroServidor'
import { BloquePorAmpliar } from './BloquePorAmpliar'
import { TITULO_CIERRE_REGISTRO, textoPorAmpliar, type FilaPorAmpliar } from '../../lib/porAmpliar'

// Seguimiento de un registro del servidor (F01): el mismo hilo de FollowUp, con la pregunta que manda
// el servidor. Al cerrar, solo el nombre del ítem y su pista: nunca una clasificación.
export function RegistroSeguimiento({
  item,
  hilo,
  ocupado,
  error,
  porAmpliar,
  onResponder,
  onOmitir,
  onReintentar,
  onContinuar,
}: {
  item?: string
  hilo?: { textoInicial: string; turnos: TurnoRegistro[]; pendiente?: TurnoRegistro; borrador: string }
  ocupado: boolean
  error: string
  porAmpliar?: FilaPorAmpliar[]
  onResponder: (texto: string) => void
  onOmitir: () => void
  onReintentar: () => void
  onContinuar: () => void
}) {
  const [response, setResponse] = useState(hilo?.borrador ?? '')
  const pregunta = !ocupado && !porAmpliar ? hilo?.pendiente : undefined
  return (
    <section className="sx-followup" aria-label="Seguimiento de Lumi">
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" className="sx-secondary-button" disabled={ocupado} onClick={onReintentar}>
            Reintentar guardado
          </button>
        </div>
      )}
      {hilo && (
        <>
          <h3>Tu respuesta</h3>
          <blockquote className="sx-followup-original">{hilo.textoInicial}</blockquote>
          <div className="sx-followup-thread">
            {hilo.turnos.map((turn) => (
              <div key={turn.orden} className="sx-followup-turn">
                {turn === pregunta ? (
                  <TypedQuestion key={turn.orden} text={turn.pregunta} />
                ) : (
                  <InlineDialogue speakerId="companero" text={turn.pregunta} light />
                )}
                {!turn.omitida && !!turn.respuesta?.trim() && (
                  <div className="sx-followup-answer">
                    <span>Tu respuesta</span>
                    <p>{turn.respuesta}</p>
                  </div>
                )}
                {turn.omitida && <p className="sx-followup-omitted">Pregunta omitida</p>}
              </div>
            ))}
          </div>
        </>
      )}
      <div>
        {ocupado && (
          <div role="status" className="sx-followup-waiting">
            <InlineDialogue speakerId="companero" text="Estoy leyendo tu respuesta…" light />
            <span className="sx-followup-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {pregunta && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (response.trim()) onResponder(response.trim())
            }}
          >
            <label className="sr-only" htmlFor={`sx-followup-${item}`}>
              Amplía tu respuesta
            </label>
            <textarea
              id={`sx-followup-${item}`}
              className="sx-submission-textarea sx-followup-input"
              placeholder="Escribe aquí si quieres ampliar tu respuesta"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
            />
            <div className="sx-player-actions">
              <button type="submit" className="sx-primary-button" disabled={!response.trim()}>
                Responder
                <ArrowRight size={18} />
              </button>
              <button type="button" className="sx-followup-skip" onClick={onOmitir}>
                Continuar sin responder
              </button>
            </div>
          </form>
        )}
        {porAmpliar && !ocupado && (
          <div className="sx-followup-finish">
            <div role="status">
              <BloquePorAmpliar
                titulo={TITULO_CIERRE_REGISTRO}
                texto={porAmpliar.length ? textoPorAmpliar(porAmpliar.length, { volver: true }) : undefined}
                filas={porAmpliar}
                conPista
              />
            </div>
            <button
              type="button"
              className="sx-primary-button sx-por-ampliar-continuar"
              onClick={onContinuar}
            >
              Continuar
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
