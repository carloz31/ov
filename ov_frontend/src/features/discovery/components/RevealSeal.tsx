import { Flag } from 'lucide-react'
import { Seal } from '@/components/student/Seal'

// Ajuste de F03: cuerpo común de la tarjeta lista para revelar (y de la llegada lista). El sello es la única
// acción; mientras revela se ve igual, pero no responde.
export function RevealSeal({
  texto,
  adentro,
  llegada,
  ocupado,
  romper,
}: {
  texto: string
  adentro: string
  llegada: boolean
  ocupado: boolean
  romper: () => void
}) {
  return (
    <div className="sx-d-helena-box sx-d-reveal-box">
      <button
        type="button"
        className="sx-d-reveal-seal"
        aria-label="Romper el sello"
        aria-disabled={ocupado}
        onClick={() => {
          if (!ocupado) romper()
        }}
      >
        <Seal state="ready" large icono={llegada ? <Flag fill="currentColor" /> : undefined} />
      </button>
      <p>{texto}</p>
      <p>
        <strong>Adentro:</strong> {adentro}
      </p>
      <p className="sx-d-reveal-hint">Toca el sello para romperlo</p>
    </div>
  )
}
