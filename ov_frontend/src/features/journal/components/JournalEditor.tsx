import { ArrowLeft, LockKeyhole, X } from 'lucide-react'

import { Parchment } from '@/components/student/Parchment'

export function JournalEditor({
  body,
  editing,
  title,
  onTitleChange,
  remainingToday,
  lockedTags,
  onAddTag,
  onBack,
  onBodyChange,
  onRemoveTag,
  onSave,
  onTagDraftChange,
  prompt,
  suggestedTags,
  tagDraft,
  tags,
}: {
  body: string
  editing: boolean
  title: string
  onTitleChange: (title: string) => void
  remainingToday: number
  lockedTags: string[]
  onAddTag: (tag?: string) => void
  onBack: () => void
  onBodyChange: (body: string) => void
  onRemoveTag: (tag: string) => void
  onSave: () => void
  onTagDraftChange: (tag: string) => void
  prompt?: string
  suggestedTags: string[]
  tagDraft: string
  tags: string[]
}) {
  return (
    <>
      <button type="button" className="sx-d-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Volver al diario
      </button>
      <header className="sx-d-header">
        <div>
          <h1>{editing ? 'Editar lo que le contaste' : 'Cuéntale a Lumi'}</h1>
          <p className="sx-j-private">
            <LockKeyhole aria-hidden="true" size={16} />
            Nadie más lee esto
          </p>
        </div>
      </header>
      <Parchment className="sx-j-notebook sx-j-editor">
        {prompt && <p className="sx-j-question sx-j-prompt">Lumi: “{prompt}”</p>}
        <label className="sr-only" htmlFor="journal-title">
          Título de la entrada
        </label>
        <input
          id="journal-title"
          className="sx-j-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título de tu conversación"
          required
        />
        <textarea
          aria-label="Texto privado de la entrada"
          autoFocus
          className="sx-j-writing"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Escribe con calma. Lo que pongas aquí solo lo lees tú."
          required
        />
        <label htmlFor="journal-tag">Etiquetas (opcional)</label>
        <div className="sx-j-tags">
          {tags.map((tag) => (
            <span key={tag}>
              #{tag}
              {lockedTags.includes(tag) ? (
                <small>sugerida</small>
              ) : (
                <button type="button" aria-label={`Quitar etiqueta ${tag}`} onClick={() => onRemoveTag(tag)}>
                  <X aria-hidden="true" size={16} />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="sx-d-actions">
          <input
            id="journal-tag"
            className="sx-d-input"
            value={tagDraft}
            onChange={(e) => onTagDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAddTag()
              }
            }}
            placeholder="Ej. familia, dudas, intereses"
          />
          <button
            type="button"
            className="sx-d-action sx-d-action-ghost"
            disabled={!tagDraft.trim()}
            onClick={() => onAddTag()}
          >
            Agregar
          </button>
        </div>
        {!!suggestedTags.length && (
          <div className="sx-j-tags">
            <span>Usadas antes:</span>
            {suggestedTags.slice(0, 5).map((tag) => (
              <button type="button" key={tag} onClick={() => onAddTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        )}
        <div className="sx-j-editor-actions">
          <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onBack}>
            Ahora no
          </button>
          <button
            type="button"
            className="sx-d-action sx-d-action-gold"
            disabled={!body.trim() || !title.trim()}
            onClick={onSave}
          >
            Contarle a Lumi
          </button>
        </div>
        <p className="sx-j-save-help">
          {editing
            ? 'Editar no suma una conversación nueva.'
            : remainingToday
              ? 'Esta conversación suma a tu amistad con Lumi.'
              : 'Hoy ya contaron tus 3 conversaciones; esta igual se guarda.'}
        </p>
      </Parchment>
    </>
  )
}
