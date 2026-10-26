import { Check, Flag } from 'lucide-react'

export type RouteLineTramo = {
  nombre: string
  estado: 'COMPLETO' | 'ACTUAL' | 'PENDIENTE'
  completadas: number
  total: number
}

// Ajuste pasaporte-perfil: la ruta del estudiante, un hito por tramo y un marcador dentro del tramo actual.
export function RouteLine({
  tramos,
  completadas,
  total,
}: {
  tramos: RouteLineTramo[]
  completadas: number
  total: number
}) {
  return (
    <div className="sx-route">
      <div className="sx-route-heading">
        <span>Tu ruta</span>
        <span>
          <strong>
            {completadas} de {total}
          </strong>{' '}
          misiones requeridas
        </span>
      </div>
      <ol className="sx-route-track" aria-label="Tramos de tu ruta">
        {tramos.map((t, i) => {
          const ultimo = i === tramos.length - 1
          const relleno = t.estado === 'COMPLETO' ? 100 : t.estado === 'ACTUAL' && t.total ? (t.completadas / t.total) * 100 : 0
          return (
            <li key={t.nombre} className="sx-route-tramo" data-state={t.estado}>
              <span className="sx-route-fill" style={{ width: `${relleno}%` }} aria-hidden="true" />
              {t.estado === 'ACTUAL' && (
                <span className="sx-route-marker" style={{ left: `${relleno}%` }} aria-hidden="true" />
              )}
              <span className="sx-route-milestone" aria-hidden="true">
                {t.estado === 'COMPLETO' ? <Check size={12} /> : ultimo ? <Flag size={12} /> : null}
              </span>
              <span className="sx-route-name">
                {t.nombre}
                <span className="sr-only">
                  {t.estado === 'COMPLETO' ? ' (completo)' : t.estado === 'ACTUAL' ? ' (actual)' : ' (pendiente)'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
