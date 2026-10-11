import { useReturnFocus } from '@/hooks/useReturnFocus'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { safeVideoUrl } from '@/store/adventureStore'
import { getDiscovery, updateDiscovery } from '@/store/discoveryStore'
import type { ResearchInProgress, ResearchPublication } from '@/types/discovery'
import { getAllies } from '@/data/content/research'
import { isPublicationValid, publishResearch } from '../../lib/research'
export function PublishDialog({ research, onClose }: { research: ResearchInProgress; onClose: () => void }) {
  const focus = useReturnFocus()
  const [form, setForm] = useState<ResearchPublication>(
    research.publication ?? { interviewee: '', summary: '', change: '', videoUrl: '', coauthors: [] },
  )
  const [publishing, setPublishing] = useState(false)
  const patch = (change: Partial<ResearchPublication>) => setForm((f) => ({ ...f, ...change }))
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent {...focus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>Publicar mi entrevista</DialogTitle>
          <DialogDescription>Comparte lo que descubriste con tu salón.</DialogDescription>
        </DialogHeader>
        <form
          className="sx-d-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (publishing || getDiscovery().research?.publishedVideoId) return
            setPublishing(true)
            const id = publishResearch(form)
            if (id) onClose()
            else setPublishing(false)
          }}
        >
          <label>
            ¿A quién entrevistaste?
            <input
              className="sx-d-input"
              value={form.interviewee}
              onChange={(e) => patch({ interviewee: e.target.value })}
            />
          </label>
          <label>
            Resumen de la entrevista
            <textarea
              rows={4}
              className="sx-d-input"
              value={form.summary}
              onChange={(e) => patch({ summary: e.target.value })}
            />
            <small>
              Lo más importante que te contó: cómo es su trabajo, qué estudió, qué consejo dio. Mínimo 30
              caracteres.
            </small>
          </label>
          <div className="sx-d-quote">
            <strong>Antes pensabas</strong>
            <p>
              <em>{research.before}</em>
            </p>
          </div>
          <label>
            ¿Qué cambió después de conversar?
            <textarea
              rows={3}
              className="sx-d-input"
              value={form.change}
              onChange={(e) => patch({ change: e.target.value })}
            />
            <small>Esto solo lo ves tú y tu orientadora.</small>
          </label>
          <label>
            Enlace al video
            <input
              type="url"
              className="sx-d-input"
              value={form.videoUrl}
              onChange={(e) => patch({ videoUrl: e.target.value })}
            />
            <small>Súbelo a tu canal de YouTube como «no listado» y pega aquí el enlace.</small>
          </label>
          {form.videoUrl && !safeVideoUrl(form.videoUrl) && <p role="alert">Usa un enlace HTTPS válido.</p>}
          <fieldset>
            <legend>Coautores (opcional)</legend>
            <div className="sx-d-actions">
              {getAllies(research.occupationId).map((alias) => (
                <button
                  type="button"
                  key={alias}
                  className="sx-d-action sx-d-action-ghost"
                  aria-pressed={form.coauthors.includes(alias)}
                  onClick={() =>
                    patch({
                      coauthors: form.coauthors.includes(alias)
                        ? form.coauthors.filter((a) => a !== alias)
                        : [...form.coauthors, alias],
                    })
                  }
                >
                  {alias}
                  {form.coauthors.includes(alias) && ' · Coautor'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="sx-d-actions">
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              onClick={() => {
                updateDiscovery((s) => ({
                  ...s,
                  research: s.research ? { ...s.research, publication: form } : undefined,
                }))
                onClose()
              }}
            >
              Guardar para después
            </button>
            <button
              type="submit"
              className="sx-d-action sx-d-action-mint"
              disabled={!isPublicationValid(form) || publishing}
            >
              Publicar en mi salón
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
