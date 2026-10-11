import { ArrowRight } from 'lucide-react'
import type { NodoItem, RespuestaItem } from '@/types/activities'
import { DialogueBox } from '../DialogueBox'

export function ItemNode({
  node,
  text,
  options,
  existing,
  direct,
  onAnswer,
  onContinue,
  busy = false,
  readOnly = false,
}: {
  node: NodoItem
  text: string
  options: { value: string | number; text: string }[]
  existing?: Pick<RespuestaItem, 'valor'>
  busy?: boolean
  readOnly?: boolean
  direct: boolean
  onAnswer: (value: string | number) => void
  onContinue: () => void
}) {
  const panel = (
    <>
      {direct && <p className="sx-player-eyebrow">{node.etiqueta ?? 'Para conocerte mejor:'}</p>}
      <h2>{text}</h2>
      <p className="sx-player-response-instruction">
        {readOnly ? 'Tus respuestas están guardadas. Puedes revisarlas.' : 'Selecciona una respuesta.'}
      </p>
      <div className="sx-player-options">
        {options.map((option) => (
          <button
            type="button"
            className={`sx-player-option ${existing?.valor === option.value ? 'is-selected' : ''}`}
            aria-pressed={existing?.valor === option.value}
            disabled={busy || readOnly}
            key={option.value}
            onClick={() => onAnswer(option.value)}
          >
            {option.text}
          </button>
        ))}
      </div>
      <p className="sx-player-note">
        No hay respuestas correctas o incorrectas. Elige lo que se parezca a ti.
      </p>
      {existing && (
        <button type="button" className="sx-secondary-button" disabled={busy} onClick={onContinue}>
          {readOnly ? 'Continuar la revisión' : 'Mantener mi respuesta y continuar'} <ArrowRight size={18} />
        </button>
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
