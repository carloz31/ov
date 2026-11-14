import { useEffect, useRef } from 'react'
import { CircleHelp, X } from 'lucide-react'

// Ajuste lumi-mensajes (§1.1, solo api): antes de completar la primera misión, el botón de ayuda del mapa abre
// este aviso sin Lumi junto al botón. Se cierra con su ✕, tocando fuera o con Escape.
export function AvisoAyudaMapa({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fuera = (evento: PointerEvent) => {
      if (!caja.current?.parentElement?.contains(evento.target as Node)) onCerrar()
    }
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [onCerrar])
  return (
    <div ref={caja} role="status" className="sx-glass sx-aviso-ayuda-mapa">
      <CircleHelp size={18} aria-hidden="true" />
      <p>{texto}</p>
      <button
        type="button"
        className="sx-aviso-ayuda-mapa-cerrar"
        aria-label="Cerrar aviso"
        onClick={onCerrar}
      >
        <X size={16} />
      </button>
    </div>
  )
}
