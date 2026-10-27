import { X } from 'lucide-react'

// Ajuste catalogo-datos-reales (revisión de F6a): «Limpiar filtros» de un listado (fila de resultado y estado vacío).
export function BotonLimpiar({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <button type="button" className="sx-c-limpiar" onClick={onLimpiar}>
      <X aria-hidden="true" size={16} /> Limpiar filtros
    </button>
  )
}
