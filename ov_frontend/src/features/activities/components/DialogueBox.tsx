import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { useTypewriter } from '@/hooks/useTypewriter'

export type DialogueBoxProps = {
  speakerId: string
  text: string
  label?: string
  hint?: string
  continueLabel?: string
  onContinue?: () => void
  typewriter?: boolean
}
export function DialogueBox({
  speakerId,
  text,
  label,
  hint,
  continueLabel = 'Continuar',
  onContinue,
  typewriter = true,
}: DialogueBoxProps) {
  const { visible, done, complete } = useTypewriter(text, { enabled: typewriter })
  useEffect(() => {
    const enter = (event: KeyboardEvent) => {
      const target = event.target
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        event.defaultPrevented ||
        !(target instanceof HTMLElement) ||
        target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]') ||
        document.querySelector('[role="dialog"]')
      )
        return
      event.preventDefault()
      if (!done) complete()
      else onContinue?.()
    }
    window.addEventListener('keydown', enter)
    return () => window.removeEventListener('keydown', enter)
  }, [done, complete, onContinue])
  return (
    <section
      className="sx-glass-dark sx-dialogue-box"
      onClick={() => {
        if (!done) complete()
      }}
    >
      <div className="sx-dialogue-avatar">
        <CharacterAvatar id={speakerId} size="lg" />
      </div>
      <div className="sx-dialogue-copy">
        {label && <p className="sx-player-eyebrow">{label}</p>}
        <p className="sx-dialogue-text">
          <span aria-hidden="true">{visible}</span>
          <span className="sr-only">{text}</span>
        </p>
      </div>
      <footer>
        {hint && <span>{hint}</span>}
        {onContinue && (
          <button
            type="button"
            className="sx-primary-button"
            onClick={(event) => {
              event.stopPropagation()
              if (!done) complete()
              else onContinue()
            }}
          >
            {done ? continueLabel : 'Mostrar todo'} {done && <ArrowRight size={18} />}
          </button>
        )}
      </footer>
    </section>
  )
}
