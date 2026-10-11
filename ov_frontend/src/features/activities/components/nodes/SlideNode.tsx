import { ArrowRight, BookOpen } from 'lucide-react'
import type { NodoDiapositiva } from '@/types/activities'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { ContentBlocks } from '../ContentBlocks'

export function SlideNode({
  node,
  onContinue,
  onResources,
}: {
  node: NodoDiapositiva
  onContinue: () => void
  onResources: (ids: string[]) => void
}) {
  return (
    <div className="sx-card-stage">
      <article className="sx-glass-dark sx-player-card sx-slide-card case-scrollbar">
        <header className="sx-slide-header">
          <p className="sx-player-eyebrow">{node.etiqueta ?? 'Una pista para tu camino'}</p>
          {node.presentadorId && <CharacterAvatar id={node.presentadorId} size="sm" />}
        </header>
        <h2>{node.titulo}</h2>
        <ContentBlocks blocks={node.bloques} />
        {node.mediaUrl && <img className="sx-slide-image" src={node.mediaUrl} alt={node.titulo} />}
        <footer className="sx-card-footer">
          {node.recursoIds?.length ? (
            <button
              type="button"
              className="sx-secondary-button"
              onClick={() => onResources(node.recursoIds ?? [])}
            >
              <BookOpen size={18} />
              Profundizar
            </button>
          ) : (
            <span>Detente el tiempo que necesites.</span>
          )}
          <button type="button" className="sx-primary-button" onClick={onContinue}>
            Entendido <ArrowRight size={18} />
          </button>
        </footer>
      </article>
    </div>
  )
}
