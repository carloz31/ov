import { useProfessionalDirectory } from '@/features/cases/hooks/useProfessionalDirectory'
import { ArrowLeft, Check, GripVertical, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import { ProfessionalResume } from '@/features/cases/components/ProfessionalResume'
export function ProfessionalDirectory({
  selectedIds,
  budgetRemaining,
  problemTitle,
  onCall,
  onDragContact,
}: {
  selectedIds: string[]
  budgetRemaining: number
  problemTitle: string
  onCall: (id: string) => void
  onDragContact: (id?: string, overTeam?: boolean) => void
}) {
  const {
    setResumeId,
    desktop,
    resumeOpener,
    backButton,
    drag,
    suppressClick,
    dragGhost,
    setDragGhost,
    professional,
    called,
    startDrag,
    moveDrag,
    finishDrag,
  } = useProfessionalDirectory({ selectedIds, budgetRemaining, onCall, onDragContact })
  const addButton = professional && (
    <button
      className="ff-primary ff-resume-add"
      disabled={called || budgetRemaining === 0}
      onClick={() => {
        onCall(professional.id)
        setResumeId(undefined)
      }}
    >
      {called ? 'Ya está en tu equipo' : `Agregar al equipo de «${problemTitle}»`}
    </button>
  )
  return (
    <aside className="ff-directory" aria-label="Contactos disponibles">
      <div className="ff-directory-heading">
        <div>
          <h2>
            <span className="ff-desktop-copy">Contactos disponibles</span>
            <span className="ff-mobile-copy">Contactos</span>
          </h2>
          <p className="ff-desktop-copy">Cada llamada usa 1 punto de presupuesto.</p>
          <p className="ff-mobile-copy">1 llamada = 1 punto</p>
        </div>
        <span className="ff-contact-count">{forestFireProfessionals.length}</span>
      </div>
      <div className="ff-directory-list" hidden={desktop && !!professional}>
        {forestFireProfessionals.map((p) => (
          <article
            key={p.id}
            className={`ff-contact ${selectedIds.includes(p.id) ? 'is-called' : ''}`}
            data-draggable={(desktop && !selectedIds.includes(p.id) && budgetRemaining > 0) || undefined}
            draggable={false}
            onPointerDown={(event) => startDrag(event, p.id)}
            onPointerMove={moveDrag}
            onPointerUp={(event) => finishDrag(event)}
            onPointerCancel={(event) => finishDrag(event, true)}
            onLostPointerCapture={() => {
              drag.current = undefined
              setDragGhost(undefined)
              onDragContact(undefined)
            }}
            onClickCapture={(event) => {
              if (suppressClick.current) {
                event.preventDefault()
                event.stopPropagation()
                suppressClick.current = false
              }
            }}
          >
            <GripVertical className="ff-contact-grip" size={18} aria-hidden="true" />
            <span className="ff-initial">{p.personName.charAt(0)}</span>
            <div className="ff-contact-name">
              <strong>{p.personName}</strong>
              <small>{getOccupation(p.occupationId)?.name ?? p.name}</small>
            </div>
            <button
              className="ff-resume-link"
              onClick={(event) => {
                resumeOpener.current = event.currentTarget
                setResumeId(p.id)
              }}
            >
              Hoja de vida<span className="sr-only"> de {p.personName}</span>
            </button>
            <button
              className="ff-contact-add"
              disabled={selectedIds.includes(p.id) || budgetRemaining === 0}
              aria-label={
                selectedIds.includes(p.id)
                  ? `${p.personName} ya está en tu equipo`
                  : `Agregar a ${p.personName} al equipo`
              }
              onClick={() => onCall(p.id)}
            >
              {selectedIds.includes(p.id) ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
            </button>
          </article>
        ))}
      </div>
      {desktop && professional && (
        <div
          className="ff-directory-resume"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setResumeId(undefined)
          }}
        >
          <button ref={backButton} className="ff-resume-back" onClick={() => setResumeId(undefined)}>
            <ArrowLeft size={18} />
            Contactos
          </button>
          <div className="ff-resume-scroll">
            <ProfessionalResume professional={professional} />
          </div>
          {addButton}
        </div>
      )}
      <Dialog
        open={!desktop && !!professional}
        onOpenChange={(open) => {
          if (!open) setResumeId(undefined)
        }}
      >
        <DialogContent
          className="ff-modal ff-bottom-sheet ff-resume-sheet"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            resumeOpener.current?.focus()
          }}
        >
          <DialogTitle className="sr-only">Hoja de vida de {professional?.personName}</DialogTitle>
          <DialogDescription className="sr-only">Datos del catálogo de ocupaciones.</DialogDescription>
          {professional && (
            <div className="ff-resume-scroll">
              <ProfessionalResume professional={professional} />
            </div>
          )}
          {addButton}
        </DialogContent>
      </Dialog>
      {dragGhost && (
        <div
          className="ff-contact-ghost"
          aria-hidden="true"
          style={{ left: dragGhost.x + 12, top: dragGhost.y + 12 }}
        >
          {forestFireProfessionals.find((p) => p.id === dragGhost.id)?.personName}
        </div>
      )}
    </aside>
  )
}
