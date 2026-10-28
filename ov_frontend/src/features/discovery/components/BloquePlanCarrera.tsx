import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { FileText, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { appPaths } from '@/routes/paths'

type PlanesCarrera = {
  letra: string | null
  libres: number
  ocupados: { letra: string; nombre: string }[]
  armar: () => void
  // F07a: lo que llega del servidor (opcional para las pruebas de los tres estados de F6b).
  disponible?: boolean
  codigo?: string
  esFavorita?: boolean
  ocupado?: boolean
  aviso?: { id: number; titulo: string; descripcion?: string } | null
  cerrarAviso?: () => void
}

// Ajuste catalogo-datos-reales (F6b) · F07a: la acción central del detalle de carrera. Precedencia: ya es un plan,
// los tres planes tienen otra carrera, la carrera no es favorita (un plan se crea solo desde una favorita; se
// marca con el mismo botón de la cabecera) o hay espacio para armarlo.
export function BloquePlanCarrera({ planes, favorito }: { planes: PlanesCarrera; favorito?: ReactNode }) {
  if (planes.disponible === false) return null
  const aviso = planes.aviso && planes.cerrarAviso && (
    <AvisoToast
      key={planes.aviso.id}
      icono={TriangleAlert}
      etiqueta="Mis planes"
      titulo={planes.aviso.titulo}
      descripcion={planes.aviso.descripcion}
      onDismiss={planes.cerrarAviso}
    />
  )
  if (planes.letra)
    return (
      <section className="sx-c-plan">
        <h2>
          <FileText aria-hidden="true" /> Ya es tu Plan {planes.letra}
        </h2>
        <p>Sigue armándolo en tu tarjeta: presupuesto, dudas y pasos.</p>
        <Link
          className="sx-d-action sx-d-action-gold"
          to={planes.codigo ? appPaths.student.plan(planes.codigo) : appPaths.student.decisions}
        >
          Ver mi tarjeta
        </Link>
      </section>
    )
  if (planes.libres <= 0)
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
  if (planes.esFavorita === false)
    return (
      <section className="sx-c-plan">
        <h2>
          <FileText aria-hidden="true" /> ¿Te ves aquí? Arma un plan
        </h2>
        <p>Para armar un plan, primero guárdala en tus favoritos</p>
        {favorito}
      </section>
    )
  return (
    <section className="sx-c-plan">
      <h2>
        <FileText aria-hidden="true" /> ¿Te ves aquí? Arma un plan
      </h2>
      <p>
        Convierte esta carrera en un plan con institución, presupuesto y pasos. Te queda{planes.libres === 1 ? '' : 'n'}{' '}
        <strong>{planes.libres} de 3</strong> espacios.
      </p>
      <button type="button" className="sx-d-action sx-d-action-gold" disabled={planes.ocupado} onClick={planes.armar}>
        Armar un plan con esta carrera
      </button>
      {aviso}
    </section>
  )
}
