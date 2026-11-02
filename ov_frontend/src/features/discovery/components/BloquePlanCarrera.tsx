import { Link } from 'react-router'
import { Loader2, TriangleAlert } from 'lucide-react'
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

// Ajuste catalogo-datos-reales (F6b) · F07a: el plan desde el detalle de carrera. Ajuste resultados-intereses
// (boceto 06): «Hacer mi plan» va en la cabecera, junto a «Guardar». Precedencia: ya es un plan, los tres planes
// tienen otra carrera, la carrera no es favorita (un plan se crea solo desde una favorita: el botón queda
// deshabilitado y lo explica) o hay espacio para armarlo.
export function BloquePlanCarrera({ planes }: { planes: PlanesCarrera }) {
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
      <div className="sx-c-plan-cabecera">
        <span className="sx-c-es-plan">Ya es tu Plan {planes.letra}</span>
        <Link
          className="sx-d-action sx-d-action-gold"
          to={planes.codigo ? appPaths.student.plan(planes.codigo) : appPaths.student.decisions}
        >
          Ver mi tarjeta
        </Link>
      </div>
    )
  if (planes.libres <= 0)
    return (
      <p className="sx-c-plan-cabecera">
        <small>
          Tus tres planes ya tienen carrera (
          {planes.ocupados.map((p) => `${p.letra}: ${p.nombre}`).join(', ')}). Para usar esta, reemplaza uno
          desde <Link to={appPaths.student.decisions}>Mis planes</Link>.
        </small>
      </p>
    )
  const noFavorita = planes.esFavorita === false
  return (
    <div className="sx-c-plan-cabecera">
      <button
        type="button"
        className="sx-d-action sx-d-action-gold"
        disabled={noFavorita || !!planes.ocupado}
        aria-busy={planes.ocupado || undefined}
        aria-describedby="plan-ayuda"
        onClick={planes.armar}
      >
        {planes.ocupado && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
        Hacer mi plan
      </button>
      <small id="plan-ayuda" className={noFavorita ? undefined : 'sr-only'}>
        {noFavorita
          ? 'Para armar un plan, primero guárdala en tus favoritos'
          : `Te queda${planes.libres === 1 ? '' : 'n'} ${planes.libres} de 3 espacios.`}
      </small>
      {aviso}
    </div>
  )
}
