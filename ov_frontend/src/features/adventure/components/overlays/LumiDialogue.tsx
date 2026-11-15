import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ChevronRight, CircleHelp, X } from 'lucide-react'
import { useThemeClass } from '@/components/common/ThemeScope'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { useTypewriter } from '@/hooks/useTypewriter'
import type { VarianteGuia } from '@/features/adventure/context/overlayContext'
type LumiOverlayProps = {
  open: boolean
  steps: string[]
  onClose: () => void
  onFinish?: () => void
  finalLabel?: string
  variante?: VarianteGuia
}
// Ajuste desbloqueos: la variante `ayuda` lleva un ícono de pregunta en el lugar de Lumi y se llama «Ayuda»; con un
// solo mensaje, sin indicadores de pasos ni «Anterior». La guía de Lumi no cambia.
export function LumiDialogue({
  steps,
  onClose,
  onFinish,
  finalLabel = 'Entendido',
  variante = 'lumi',
}: Omit<LumiOverlayProps, 'open'>) {
  const [step, setStep] = useState(0)
  const themeClass = useThemeClass()
  const text = steps[step] ?? ''
  const { visible, done, complete } = useTypewriter(text)
  const primaryButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const last = step === steps.length - 1
  const ayuda = variante === 'ayuda'
  const nombre = ayuda ? 'Ayuda' : 'Orientación de Lumi'
  const unPaso = ayuda && steps.length === 1
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={`sx-root ${themeClass} sx-lumi-backdrop`} />
      <Dialog.Content
        className={`sx-root ${themeClass} sx-glass sx-lumi-dialog`}
        aria-label={nombre}
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
        <Dialog.Title className="sr-only">{nombre}</Dialog.Title>
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
          {ayuda ? (
            <span aria-hidden="true" className="sx-character-circle sx-character-lg">
              <CircleHelp size={56} />
            </span>
          ) : (
            <CharacterAvatar id="companero" size="lg" />
          )}
        </div>
        {!unPaso && (
          <>
            <div className="sx-lumi-indicators" aria-hidden="true">
              {steps.map((_, index) => (
                <span key={index} data-active={index <= step} />
              ))}
            </div>
            <p className="sr-only">
              Paso {step + 1} de {steps.length}
            </p>
          </>
        )}
        <Dialog.Description asChild>
          <div className="sx-lumi-text">
            <span aria-hidden="true">{visible}</span>
            <span className="sr-only">{text}</span>
          </div>
        </Dialog.Description>
        <div className="sx-lumi-footer">
          {!unPaso && (
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
          )}
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
