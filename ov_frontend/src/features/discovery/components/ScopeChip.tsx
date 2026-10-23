import { Compass, Flag } from 'lucide-react'

// Ajuste de F03: alcance de una página del libro. «Para tu proyecto», lleno y con el banderín de `ZonePath`;
// «Opcional · si quieres», con borde punteado y brújula. Solo refleja el dato; no decide la prioridad.
export function ScopeChip({ prioritario }: { prioritario: boolean }) {
  return prioritario ? (
    <span className="sx-d-scope sx-d-scope-project">
      <Flag aria-hidden="true" fill="currentColor" />
      Para tu proyecto
    </span>
  ) : (
    <span className="sx-d-scope sx-d-scope-optional">
      <Compass aria-hidden="true" />
      Opcional · si quieres
    </span>
  )
}
