import { useRef, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import type { NodoItem, RespuestaItem } from '@/types/activities'
import { DialogueBox } from '../DialogueBox'
import { PasoAnterior } from '../PasoAnterior'

// Tras tocar una opción, se marca y se avanza después de este lapso; mientras tanto se ignoran toques.
const RETARDO_AVANCE_MS = 275

export function ItemNode({
  node,
  text,
  options,
  existing,
  direct,
  onAnswer,
  onContinue,
  onAnterior,
  busy = false,
  readOnly = false,
  inmediato = false,
  fijas = false,
  onCambiar,
}: {
  node: NodoItem
  text: string
  options: { value: string | number; text: string }[]
  existing?: Pick<RespuestaItem, 'valor'>
  busy?: boolean
  readOnly?: boolean
  // Sin el lapso de avance: la opción se envía al pulsarla (api; el guardado se ve en la opción).
  inmediato?: boolean
  // Ajuste de F03, al re-entrar a un test completado (api): sin cambios posibles, una línea lo explica;
  // si se admiten, «Cambiar mis respuestas» pasa a edición.
  fijas?: boolean
  onCambiar?: () => void
  direct: boolean
  onAnswer: (value: string | number) => void
  onContinue: () => void
  onAnterior?: () => void
}) {
  const [elegida, setElegida] = useState(existing?.valor)
  const esperando = useRef(false)
  // Avanza: si la opción es la ya guardada, sin volver a responder.
  function avanzar(valor: string | number | undefined) {
    if (valor === undefined) return
    if (valor === existing?.valor) onContinue()
    else onAnswer(valor)
  }
  function elegir(valor: string | number) {
    if (busy || readOnly || esperando.current) return
    setElegida(valor)
    esperando.current = true
    if (inmediato) avanzar(valor)
    else setTimeout(() => avanzar(valor), RETARDO_AVANCE_MS)
  }
  const principal = readOnly
    ? existing && (
        <button type="button" className="sx-primary-button" disabled={busy} onClick={onContinue}>
          Siguiente <ArrowRight size={18} />
        </button>
      )
    : existing && (
        <button
          type="button"
          className="sx-primary-button"
          disabled={busy || esperando.current}
          onClick={() => {
            if (esperando.current) return
            esperando.current = true
            avanzar(elegida)
          }}
        >
          Siguiente <ArrowRight size={18} />
        </button>
      )
  const panel = (
    <>
      {direct && <p className="sx-player-eyebrow">{node.etiqueta ?? 'Para conocerte mejor:'}</p>}
      <h2>{text}</h2>
      <p className="sx-player-response-instruction">
        {fijas
          ? 'Tus respuestas ya quedaron fijas.'
          : readOnly
            ? 'Tus respuestas están guardadas. Puedes revisarlas.'
            : 'Selecciona una respuesta.'}
      </p>
      <div className="sx-player-options">
        {options.map((option) => (
          <button
            type="button"
            className={`sx-player-option ${elegida === option.value ? 'is-selected' : ''}`}
            aria-pressed={elegida === option.value}
            disabled={busy || readOnly}
            aria-busy={busy && elegida === option.value}
            key={option.value}
            onClick={() => elegir(option.value)}
          >
            {option.text}
            {/* Ajuste de F03: mientras el servidor guarda, el loader va en la opción elegida. */}
            {busy && elegida === option.value && (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <p className="sx-player-note">
        No hay respuestas correctas o incorrectas. Elige lo que se parezca a ti.
      </p>
      {(principal || onAnterior || onCambiar) && (
        <div className="sx-step-footer">
          {onAnterior && <PasoAnterior onClick={onAnterior} disabled={busy || esperando.current} />}
          {onCambiar && (
            <button type="button" className="sx-secondary-button" onClick={onCambiar}>
              Cambiar mis respuestas
            </button>
          )}
          {principal}
        </div>
      )}
    </>
  )
  return direct ? (
    <div className="sx-card-stage">
      <section className="sx-glass-dark sx-player-card sx-item-card case-scrollbar">{panel}</section>
    </div>
  ) : (
    <div className="sx-player-scene">
      <div className="sx-scene-space">
        <section className="sx-glass-dark sx-scene-panel">{panel}</section>
      </div>
      <DialogueBox speakerId={node.hablanteId} label={node.etiqueta ?? 'Para conocerte mejor:'} text={text} />
    </div>
  )
}
