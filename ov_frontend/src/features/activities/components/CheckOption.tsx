import { Check, X } from 'lucide-react'
export type CheckOptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missing' | 'muted'
export function CheckOption({
  text,
  state,
  multiple = false,
  label,
  explanation,
  letter,
  disabled,
  onClick,
}: {
  text: string
  state: CheckOptionState
  multiple?: boolean
  label?: string
  explanation?: string
  letter?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`sx-check-option is-${state}`}
      disabled={disabled}
      aria-pressed={state === 'selected' || state === 'correct' || state === 'incorrect'}
      onClick={onClick}
    >
      <span className={`sx-check-marker ${multiple ? 'is-multiple' : ''}`} aria-hidden="true">
        {state === 'incorrect' ? (
          <X size={16} />
        ) : state === 'correct' || (multiple && state === 'selected') ? (
          <Check size={16} />
        ) : (
          (letter ?? (state === 'selected' ? '●' : ''))
        )}
      </span>
      <span className="sx-check-option-content">
        <span>{text}</span>
        {label && <small className="sx-check-label">{label}</small>}
        {explanation && <span className="sx-check-explanation">{explanation}</span>}
      </span>
    </button>
  )
}
