import { Link } from 'react-router'
import { FileText } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import type { usePlanesCarrera } from '../hooks/usePlanesCarrera'

// Ajuste catalogo-datos-reales (F6b): la acción central del detalle de carrera, en tres estados: ya es un plan,
// hay espacio para armarlo, o los tres planes tienen otra carrera.
export function BloquePlanCarrera({ planes }: { planes: ReturnType<typeof usePlanesCarrera> }) {
  if (planes.letra)
    return (
      <section className="sx-c-plan">
        <h2>
          <FileText aria-hidden="true" /> Ya es tu Plan {planes.letra}
        </h2>
        <p>Sigue armándolo en tu tarjeta: presupuesto, dudas y pasos.</p>
        <Link className="sx-d-action sx-d-action-gold" to={appPaths.student.decisions}>
          Ver mi tarjeta
        </Link>
      </section>
    )
  if (planes.libres > 0)
    return (
      <section className="sx-c-plan">
        <h2>
          <FileText aria-hidden="true" /> ¿Te ves aquí? Arma un plan
        </h2>
        <p>
          Convierte esta carrera en un plan con institución, presupuesto y pasos. Te queda{planes.libres === 1 ? '' : 'n'}{' '}
          <strong>{planes.libres} de 3</strong> espacios.
        </p>
        <button type="button" className="sx-d-action sx-d-action-gold" onClick={planes.armar}>
          Armar un plan con esta carrera
        </button>
      </section>
    )
  return (
    <section className="sx-c-plan">
      <h2>
        <FileText aria-hidden="true" /> ¿Te ves aquí?
      </h2>
      <p>
        Tus tres planes ya tienen carrera ({planes.ocupados.map((p) => `${p.letra}: ${p.nombre}`).join(', ')}). Para
        usar esta, reemplaza uno desde <Link to={appPaths.student.decisions}>Mis planes</Link>.
      </p>
    </section>
  )
}
