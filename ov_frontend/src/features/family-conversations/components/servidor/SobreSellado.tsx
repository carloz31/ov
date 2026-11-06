import { Heart } from 'lucide-react'

// F08: el sobre de la carta y del regalo (ilustración CSS, sin imagen). `flota`: animación suave con sello que late.
export function SobreSellado({ flota = false }: { flota?: boolean }) {
  return (
    <div aria-hidden="true" className={`fam-sobre${flota ? ' fam-sobre--flota' : ''}`}>
      <span className="fam-sobre-sello">
        <Heart size={34} />
      </span>
    </div>
  )
}
