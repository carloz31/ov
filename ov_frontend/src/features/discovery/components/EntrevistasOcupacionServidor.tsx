import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { useEntrevistasOcupacion } from '../hooks/useEntrevistasOcupacion'

// F09 (api): «Entrevistas de tu salón» en el detalle de una ocupación, con las entrevistas del servidor. Sin la
// sección Investigaciones abierta no se muestra.
export function EntrevistasOcupacionServidor({ codigo }: { codigo: string }) {
  const { abierta, lista } = useEntrevistasOcupacion(codigo)
  if (!abierta || !lista || lista.estado === 'cargando' || lista.estado === 'error') return null
  return (
    <Parchment title="Entrevistas de tu salón">
      {lista.items.length ? (
        lista.items.map((e) => (
          <Link key={e.codigo} className="sx-d-related" to={appPaths.student.interview(e.codigo)}>
            <strong>{e.titulo}</strong>
            <small>Por {e.autores.map((a) => a.nombre).join(', ')}</small>
          </Link>
        ))
      ) : (
        <>
          <p>Nadie de tu salón la ha investigado todavía.</p>
          <Link className="sx-d-action" to={appPaths.student.investigationGuide(1, codigo)}>
            Investigarla
          </Link>
        </>
      )}
    </Parchment>
  )
}
