import { Map } from 'lucide-react'
import { useVolverAlMapa } from '../hooks/useVolverAlMapa'

// Salida de la pantalla de fin; también cierra la consulta de un registro sin cambios (F02).
export function VolverAlMapa({ actividad, onClose }: { actividad: string; onClose?: () => void }) {
  const volverAlMapa = useVolverAlMapa(actividad)
  return (
    <button
      className="sx-primary-button"
      onClick={() => {
        volverAlMapa()
        onClose?.()
      }}
    >
      <Map size={18} /> Volver al mapa
    </button>
  )
}
