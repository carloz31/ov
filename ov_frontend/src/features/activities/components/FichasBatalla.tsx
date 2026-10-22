import { Fragment } from 'react'
import { Link } from 'react-router'
import { LockKeyhole } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { useFichasBatalla } from '../hooks/useFichasBatalla'

// F04b: línea del drawer de una batalla con las fichas de las que se alimenta. F04d: todas, las bloqueadas con
// candado; cada una lleva a la mochila, que la abre (o muestra cómo obtenerla). El mapa guarda el punto en la
// URL (`?punto=`), así que «atrás» vuelve con este drawer abierto.
export function FichasBatalla({ codigo }: { codigo: string }) {
  const { fichas } = useFichasBatalla(codigo)
  if (!fichas.length) return null
  return (
    <p className="sx-drawer-fichas">
      Se alimenta de:{' '}
      {fichas.map((f, i) => (
        <Fragment key={f.codigo}>
          {i > 0 && (i === fichas.length - 1 ? ' y ' : ', ')}
          <Link
            className="sx-drawer-ficha"
            to={`${appPaths.student.resources}?${new URLSearchParams({ kind: 'sheet', ficha: f.codigo })}`}
          >
            {f.estado === 'BLOQUEADA' && <LockKeyhole size={13} aria-label="Bloqueada" />}
            {f.titulo}
          </Link>
        </Fragment>
      ))}
    </p>
  )
}
