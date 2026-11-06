import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { useEntrevistasFamilia } from '../hooks/useEntrevistasFamilia'

const MAXIMO_VISIBLE = 3

// Ajuste entrevistas por familia: «Entrevistas de esta familia» en el detalle de una carrera, de su salón y Leyendas.
// Muestra las más recientes y el resto se ve en Investigaciones. Sin la sección abierta no se muestra.
export function EntrevistasFamilia({ codigo }: { codigo: string }) {
  const { abierta, lista } = useEntrevistasFamilia(codigo)
  if (!abierta || !lista || lista.estado === 'cargando' || lista.estado === 'error') return null
  const visibles = lista.items.slice(0, MAXIMO_VISIBLE)
  return (
    <Parchment title="Entrevistas de esta familia">
      {visibles.length ? (
        <>
          {visibles.map((e) => (
            <Link
              key={e.codigo}
              className="sx-d-related sx-c-entrevista-familia"
              to={appPaths.student.interview(e.codigo)}
            >
              <strong>{e.titulo}</strong>
              <small>
                {e.dedicacion} · Por {e.autores.map((a) => a.nombre).join(', ')}
              </small>
            </Link>
          ))}
          {lista.total > MAXIMO_VISIBLE && (
            <Link className="sx-d-action" to={appPaths.student.investigationsFamily(codigo)}>
              Ver las {lista.total} entrevistas
            </Link>
          )}
        </>
      ) : (
        <>
          <p>Todavía no hay entrevistas de esta familia.</p>
          <Link className="sx-d-action" to={appPaths.student.investigationGuide(1, codigo)}>
            Investigar esta familia
          </Link>
        </>
      )}
    </Parchment>
  )
}
