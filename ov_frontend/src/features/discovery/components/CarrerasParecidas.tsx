import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import type { CarrerasParecidas as Parecidas, FamiliaPublica } from '@/types/servidor'

// Ajuste catalogo-datos-reales (F6b): cuántas otras carreras de su tipo hay en la familia, tres por nombre, y el
// listado filtrado por la familia.
export function CarrerasParecidas({ parecidas, familia }: { parecidas: Parecidas; familia: FamiliaPublica }) {
  if (!parecidas.total) return null
  return (
    <Parchment title="Carreras parecidas">
      <p>
        {parecidas.total === 1 ? 'Otra carrera' : `Otras ${parecidas.total} carreras`} de la familia{' '}
        <strong>{familia.nombre}</strong>: {parecidas.carreras.map((c) => c.nombre).join(', ')}
        {parecidas.total > parecidas.carreras.length ? '…' : '.'}
      </p>
      <Link
        className="sx-d-action sx-d-action-ghost sx-d-full"
        to={`${appPaths.student.catalog.careers}?familia=${familia.codigo}`}
      >
        Ver toda la familia
      </Link>
    </Parchment>
  )
}
