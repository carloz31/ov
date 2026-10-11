import { Brain } from 'lucide-react'
import type { FilaResumenPagina } from '../types'

export function DimensionSummaryRow({ fila }: { fila: FilaResumenPagina }) {
  return (
    <div className="sx-d-helena-dimension">
      <span className="sx-d-helena-marker" aria-hidden="true">
        {fila.marcador === 'letra' ? fila.codigo : <Brain />}
      </span>
      <div>
        <strong>{fila.nombre}</strong>
        <p>{fila.descripcion}</p>
      </div>
    </div>
  )
}
