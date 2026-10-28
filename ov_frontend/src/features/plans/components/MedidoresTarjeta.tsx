import { Link } from 'react-router'
import { ESCALA_MEDIDOR, MEDIDORES } from '@/lib/servidor/adaptadoresPlanes'
import { appPaths } from '@/routes/paths'
import type { Medidores } from '@/types/servidor'
import { ICONOS_MEDIDOR } from '../lib/medidores'

// F07b (ajuste v4.2, lienzos de Mis planes y «Cómo me siento»): solo en el plan A, tres mini tarjetas de solo
// lectura con barra de tres segmentos y la palabra; sin valor, segmentos punteados y «Sin valorar · Valorar».
export function MedidoresTarjeta({ medidores, carrera }: { medidores: Medidores; carrera: string }) {
  return (
    <ul className="sx-p-mini-medidores" aria-label="Cómo me siento">
      {MEDIDORES.map((m) => {
        const Icono = ICONOS_MEDIDOR[m.codigo],
          valor = medidores[m.codigo]
        return (
          <li key={m.codigo} data-valorado={valor !== null}>
            <small>
              <Icono aria-hidden="true" size={12} /> {m.nombre}
            </small>
            <span className="sx-p-barra" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} data-lleno={valor !== null && n <= valor} />
              ))}
            </span>
            {valor !== null ? (
              <strong>{ESCALA_MEDIDOR[valor - 1]}</strong>
            ) : (
              <span className="sx-p-sin-valorar">
                Sin valorar · <Link to={appPaths.student.plan(carrera, 'MEDIDORES')}>Valorar</Link>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
