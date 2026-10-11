import { ArrowRight } from 'lucide-react'

export function StepActions({
  onBack,
  onNext,
  disabled,
  label,
}: {
  onBack: () => void
  onNext: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <div className="ff-step-actions">
      <button className="ff-secondary" onClick={onBack}>
        Atrás
      </button>
      <button className="ff-primary" disabled={disabled} onClick={onNext}>
        {label}
        <ArrowRight size={18} />
      </button>
    </div>
  )
}
