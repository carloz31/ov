import { Compass } from 'lucide-react'

export function StudentBrand() {
  return (
    <div className="sx-student-brand" aria-label="Orientación Explora">
      <span className="sx-brand-mark" aria-hidden="true">
        <Compass size={22} />
      </span>
      <span className="sx-brand-name">
        <span>Orientación</span>
        <strong>Explora</strong>
      </span>
    </div>
  )
}
