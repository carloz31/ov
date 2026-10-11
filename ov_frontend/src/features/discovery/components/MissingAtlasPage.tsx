import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'
export function MissingAtlasPage() {
  return (
    <Parchment title="No encontramos esta página del atlas.">
      <Link className="sx-d-action" to={appPaths.student.catalog.professions}>
        Volver al catálogo
      </Link>
    </Parchment>
  )
}
