import { useRef, useState } from 'react'
import { Clock, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import type { ShownQuestion } from '@/types/reflection'
import { missingNotice, missingPhrases } from '../../lib/reflection/personalization'
import { reflectionCopy } from '@/data/activities/reflectionConfig'
export function QuestionMemory({
  question,
  compact = false,
  hideNotice = false,
}: {
  question: ShownQuestion
  compact?: boolean
  hideNotice?: boolean
}) {
  const [open, setOpen] = useState(false)
  const returnFocus = useRef<HTMLButtonElement>(null)
  const source = question.respuestaOrigen
  const notice = !hideNotice && missingNotice(question)
  const emphasis = missingPhrases(question)
  const noticeParts = notice ? notice.split(emphasis) : []
  if (!source || (!notice && question.tipo !== 'PERSONALIZADA')) return null
  return (
    <>
      <aside className={`sx-question-memory ${compact ? 'is-compact' : ''} ${notice ? 'is-neutral' : ''}`}>
        {!notice && <Clock size={18} aria-hidden="true" />}
        <div>
          {notice ? (
            <p>
              {noticeParts[0]}
              <strong>{emphasis}</strong>
              {noticeParts[1]}
            </p>
          ) : (
            <>
              <strong>{compact ? 'Lumi recuerda:' : reflectionCopy.memory(source.titulo)}</strong>
              <blockquote>
                <mark>«{question.cita}»</mark>
              </blockquote>
            </>
          )}
          {question.tipo === 'PERSONALIZADA' && (
            <button
              type="button"
              ref={returnFocus}
              className="sx-memory-open"
              onClick={() => setOpen(true)}
              aria-label={`Ver respuesta completa de ${source.titulo}`}
            >
              <Eye size={16} />
              {!compact && reflectionCopy.fullResponse}
            </button>
          )}
        </div>
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sx-root sx-memory-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus.current?.focus()
          }}
        >
          <DialogTitle>Tu respuesta en {source.titulo}</DialogTitle>
          <DialogDescription>Versión {source.version} · Solo lectura</DialogDescription>
          <p className="sx-memory-full">{source.texto}</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
