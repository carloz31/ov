import { ArrowRight } from 'lucide-react'
import type { NodoDialogo, NodoEleccion } from '@/types/activities'
import { DialogueBox } from '../DialogueBox'

export function ChoiceNode({
  node,
  previous,
  onChoose,
}: {
  node: NodoEleccion
  previous?: NodoDialogo
  onChoose: (option: NodoEleccion['opciones'][number]) => void
}) {
  return (
    <div className="sx-player-scene">
      <div className="sx-scene-space">
        <section className="sx-glass-dark sx-scene-panel">
          <p className="sx-player-eyebrow">Tu voz también cuenta</p>
          <h2>{node.enunciado ?? previous?.texto ?? '¿Qué le dirías?'}</h2>
          {node.nota && <p className="sx-player-response-instruction">{node.nota}</p>}
          <p className="sx-player-response-instruction">Selecciona una respuesta.</p>
          <div className="sx-player-options">
            {node.opciones.map((option) => (
              <button
                type="button"
                className="sx-player-option"
                key={option.id}
                onClick={() => onChoose(option)}
              >
                {option.texto}
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </section>
      </div>
      {previous && <DialogueBox speakerId={previous.hablanteId} text={previous.texto} typewriter={false} />}
    </div>
  )
}
