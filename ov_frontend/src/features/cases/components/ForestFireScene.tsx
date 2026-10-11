import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ArrowRight, Check, RadioTower } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import type { ForestFireCommunityMessage, ForestFirePhase } from '@/types/cases'
import {
  centerScene,
  clampSceneOffset,
  coverScene,
  isSceneDrag,
  revealScenePoint,
} from '@/features/cases/lib/forestFireSceneGeometry'

export function ListenScreen({
  phase,
  heard,
  helpSeen,
  onHelpSeen,
  onHear,
  onNext,
}: {
  phase: ForestFirePhase
  heard: string[]
  helpSeen: boolean
  onHelpSeen: () => void
  onHear: (ids: string[]) => void
  onNext: () => void
}) {
  const [message, setMessage] = useState<ForestFireCommunityMessage>()
  const [helpOpen, setHelpOpen] = useState(!helpSeen)
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })
  const [imageSize, setImageSize] = useState({ width: 1536, height: 1024 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const helpButton = useRef<HTMLButtonElement>(null)
  const markHelpSeen = useRef(onHelpSeen)
  markHelpSeen.current = onHelpSeen
  const offsetRef = useRef(offset)
  const drag = useRef<
    | {
        pointerId: number
        start: { x: number; y: number }
        origin: typeof offset
        clueId?: string
        moved: boolean
      }
    | undefined
  >(undefined)
  const sceneSize = coverScene(viewportSize, imageSize)
  const allHeard = phase.messages.every((m) => heard.includes(m.id))

  function apply(next: typeof offset) {
    const bounded = clampSceneOffset(next, viewportSize, sceneSize)
    offsetRef.current = bounded
    setOffset(bounded)
  }
  useEffect(() => {
    markHelpSeen.current()
    const element = viewport.current
    if (!element) return
    const measure = () => setViewportSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
    // The seen flag belongs to the attempt, and is recorded once on entering this phase's scene.
  }, [phase.id])
  useEffect(() => {
    const centered = centerScene(viewportSize, coverScene(viewportSize, imageSize))
    offsetRef.current = centered
    setOffset(centered)
  }, [viewportSize, imageSize, phase.id])

  function openClue(id: string) {
    const clue = phase.messages.find((m) => m.id === id)
    if (!clue) return
    opener.current = viewport.current?.querySelector<HTMLButtonElement>(`[data-clue-id="${id}"]`) ?? null
    setHelpOpen(false)
    setMessage(clue)
    onHear([id])
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-clue-id]')
    drag.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: offsetRef.current,
      clueId: target?.dataset.clueId,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = drag.current
    if (!origin || origin.pointerId !== event.pointerId) return
    origin.moved ||= isSceneDrag(origin.start, { x: event.clientX, y: event.clientY })
    if (origin.moved)
      apply({
        x: origin.origin.x + event.clientX - origin.start.x,
        y: origin.origin.y + event.clientY - origin.start.y,
      })
  }
  function endPointer(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const origin = drag.current
    if (!origin || origin.pointerId !== event.pointerId) return
    drag.current = undefined
    setDragging(false)
    origin.moved ||= isSceneDrag(origin.start, { x: event.clientX, y: event.clientY })
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!cancelled && !origin.moved && origin.clueId) openClue(origin.clueId)
  }
  function dismissHelp() {
    setHelpOpen(false)
    helpButton.current?.focus()
  }
  return (
    <section className="ff-listen">
      <h1 className="sr-only" tabIndex={-1}>
        Escucha a la comunidad
      </h1>
      <div
        className="ff-scene-window"
        ref={viewport}
        aria-label="Escena con pistas de la comunidad"
        data-dragging={dragging || undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => endPointer(event)}
        onPointerCancel={(event) => endPointer(event, true)}
        onLostPointerCapture={() => {
          drag.current = undefined
          setDragging(false)
        }}
      >
        <div
          className="ff-scene"
          style={{
            width: sceneSize.width,
            height: sceneSize.height,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          <img
            src={phase.backgroundImage}
            alt=""
            aria-hidden="true"
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget
              if (naturalWidth && naturalHeight) setImageSize({ width: naturalWidth, height: naturalHeight })
            }}
          />
          {phase.messages.map((m) => {
            const listened = heard.includes(m.id)
            return (
              <div
                className="ff-point-position"
                key={m.id}
                style={{ left: `${m.position.x}%`, top: `${m.position.y}%` }}
              >
                <button
                  className={`ff-point ${listened ? 'is-heard' : ''}`}
                  data-clue-id={m.id}
                  aria-label={`Pista: ${m.speaker}, ${m.context}${listened ? ' (escuchada)' : ''}`}
                  onFocus={() =>
                    apply(revealScenePoint(offsetRef.current, m.position, viewportSize, sceneSize))
                  }
                  onClick={(event) => {
                    if (event.detail === 0) openClue(m.id)
                  }}
                >
                  {listened ? <Check aria-hidden="true" /> : <RadioTower aria-hidden="true" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div className="ff-scene-help">
        <button
          ref={helpButton}
          className="ff-help-button"
          aria-label="¿Qué hago aquí?"
          aria-expanded={helpOpen}
          aria-controls={`help-${phase.id}`}
          onClick={() => {
            setHelpOpen((open) => !open)
          }}
        >
          ?
        </button>
        {helpOpen && (
          <div
            id={`help-${phase.id}`}
            className="ff-help-bubble ff-dark"
            role="region"
            aria-label="Ayuda de Lumi"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                dismissHelp()
              }
            }}
          >
            <LumiMedallion />
            <div>
              <p className="ff-eyebrow">Lumi</p>
              <p className="ff-desktop-copy">{phase.listenPrompt}</p>
              <p className="ff-mobile-copy">{phase.listenPromptMobile}</p>
              <button className="ff-secondary" onClick={dismissHelp}>
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="ff-listen-footer">
        <div className="ff-listen-count" role="status">
          <strong>
            Escuchaste {heard.length} de {phase.messages.length}
          </strong>
          <span className="ff-desktop-copy">Arrastra la escena para encontrar a todas las personas</span>
          <span className="ff-mobile-copy">Arrastra para explorar</span>
        </div>
        <button className="ff-primary" disabled={!allHeard} onClick={onNext}>
          {allHeard ? 'Ver el primer problema' : `Escucha a las ${phase.messages.length} personas`}
          <ArrowRight size={18} />
        </button>
      </div>
      <Dialog
        open={!!message}
        onOpenChange={(open) => {
          if (!open) setMessage(undefined)
        }}
      >
        <DialogContent
          className="ff-modal ff-responsive-modal"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            opener.current?.focus()
          }}
        >
          {message && (
            <>
              <p className="ff-eyebrow">
                Pista {phase.messages.findIndex((m) => m.id === message.id) + 1} de {phase.messages.length}
              </p>
              <DialogTitle>{message.speaker}</DialogTitle>
              <DialogDescription>{message.context}</DialogDescription>
              <blockquote>“{message.message}”</blockquote>
              <button className="ff-primary" onClick={() => setMessage(undefined)}>
                Anotar y seguir explorando
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
