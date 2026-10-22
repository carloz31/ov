import { Fragment } from 'react'
import { useFichasBatalla } from '../hooks/useFichasBatalla'
import { abrirRecurso } from '@/store/visorRecursoStore'

// F04b: línea del drawer de una batalla con las fichas de las que se alimenta; cada nombre abre su ficha.
export function FichasBatalla({ codigo }: { codigo: string }) {
  const { fichas } = useFichasBatalla(codigo)
  if (!fichas.length) return null
  return (
    <>
      <p className="sx-drawer-fichas">
        Se alimenta de:{' '}
        {fichas.map((f, i) => (
          <Fragment key={f.codigo}>
            {i > 0 && (i === fichas.length - 1 ? ' y ' : ', ')}
            <button type="button" className="sx-drawer-ficha" onClick={() => abrirRecurso(f.codigo, 'repaso')}>
              {f.titulo}
            </button>
          </Fragment>
        ))}
      </p>
    </>
  )
}
