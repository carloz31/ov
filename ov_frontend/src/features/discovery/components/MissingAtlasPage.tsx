import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { useModoCatalogo } from '../hooks/useModoCatalogo'
export function MissingAtlasPage() {
  const { rutas } = useModoCatalogo()
  return (
    <Parchment title="No encontramos esta página del atlas.">
      <Link className="sx-d-action" to={rutas.catalog.professions}>
        Volver al catálogo
      </Link>
    </Parchment>
  )
}
