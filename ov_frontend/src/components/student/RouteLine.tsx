import { Check, Flag } from 'lucide-react'

export type RouteLineTramo = {
  nombre: string
  estado: 'COMPLETO' | 'ACTUAL' | 'PENDIENTE'
  completadas: number
  total: number
}

// Ajuste pasaporte-perfil: la ruta del estudiante. Cada punto marca dónde empieza un tramo (el primero, el
// tramo 1); el último tramo es el penúltimo punto y el punto final, con la bandera, es «Fin del viaje». El
// marcador azul va dentro del tramo actual, en proporción a sus requeridas.
export function RouteLine({
  tramos,
  completadas,
  total,
}: {
  tramos: RouteLineTramo[]
  completadas: number
  total: number
}) {
  const terminado = tramos.length > 0 && tramos.every((t) => t.estado === 'COMPLETO')
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
          // Se llegó al inicio del tramo si es el primero o si el anterior está completo.
          const alcanzado = i === 0 || tramos[i - 1].estado === 'COMPLETO'
          const relleno =
            t.estado === 'COMPLETO' ? 100 : t.estado === 'ACTUAL' && t.total ? (t.completadas / t.total) * 100 : 0
          return (
            <li key={t.nombre} className="sx-route-tramo" data-state={t.estado}>
              <span className="sx-route-fill" style={{ width: `${relleno}%` }} aria-hidden="true" />
              {t.estado === 'ACTUAL' && (
                <span className="sx-route-marker" style={{ left: `${relleno}%` }} aria-hidden="true" />
              )}
              <span className="sx-route-milestone" data-reached={alcanzado} data-first={i === 0} aria-hidden="true">
                {alcanzado && i > 0 && <Check size={12} />}
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
        <li className="sx-route-end" data-state={terminado ? 'COMPLETO' : 'PENDIENTE'}>
          <span className="sx-route-milestone" data-reached={terminado} aria-hidden="true">
            <Flag size={12} />
          </span>
          <span className="sx-route-name">Fin del viaje</span>
        </li>
      </ol>
    </div>
  )
}
