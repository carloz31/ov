import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ChevronRight, X } from 'lucide-react'
import { useThemeClass } from '@/components/common/ThemeScope'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { useTypewriter } from '@/hooks/useTypewriter'
type LumiOverlayProps = {
  open: boolean
  steps: string[]
  onClose: () => void
  onFinish?: () => void
  finalLabel?: string
}
export function LumiDialogue({
  steps,
  onClose,
  onFinish,
  finalLabel = 'Entendido',
}: Omit<LumiOverlayProps, 'open'>) {
  const [step, setStep] = useState(0)
  const themeClass = useThemeClass()
  const text = steps[step] ?? ''
  const { visible, done, complete } = useTypewriter(text)
  const primaryButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const last = step === steps.length - 1
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={`sx-root ${themeClass} sx-lumi-backdrop`} />
      <Dialog.Content
        className={`sx-root ${themeClass} sx-glass sx-lumi-dialog`}
        aria-label="Orientación de Lumi"
        onClick={() => {
          if (!done) complete()
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          primaryButton.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (returnFocus.current?.isConnected) returnFocus.current.focus()
        }}
      >
        <Dialog.Title className="sr-only">Orientación de Lumi</Dialog.Title>
        <button
          type="button"
          className="sx-icon-button sx-lumi-close"
          aria-label="Cerrar guía"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
        >
          <X aria-hidden="true" size={18} />
        </button>
        <div className="sx-lumi-avatar">
          <CharacterAvatar id="companero" size="lg" />
        </div>
        <div className="sx-lumi-indicators" aria-hidden="true">
          {steps.map((_, index) => (
            <span key={index} data-active={index <= step} />
          ))}
        </div>
        <p className="sr-only">
          Paso {step + 1} de {steps.length}
        </p>
        <Dialog.Description asChild>
          <div className="sx-lumi-text">
            <span aria-hidden="true">{visible}</span>
            <span className="sr-only">{text}</span>
          </div>
        </Dialog.Description>
        <div className="sx-lumi-footer">
          <button
            type="button"
            className="sx-secondary-button"
            disabled={step === 0}
            onClick={(event) => {
              event.stopPropagation()
              setStep(step - 1)
            }}
          >
            <ArrowLeft size={16} /> Anterior
          </button>
          <button
            ref={primaryButton}
            type="button"
            className="sx-primary-button"
            onClick={(event) => {
              event.stopPropagation()
              if (!done) complete()
              else if (last) {
                onFinish?.()
                onClose()
              } else setStep(step + 1)
            }}
          >
            {!done ? 'Mostrar todo' : last ? finalLabel : 'Siguiente'}
            {done && !last && <ChevronRight size={16} />}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
