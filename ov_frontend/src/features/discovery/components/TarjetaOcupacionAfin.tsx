import { Link } from 'react-router'
import type { OcupacionAfinPublica } from '@/types/servidor'
import { etiquetaAfinidad, letrasCompartidas } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: una ocupación afín del resultado del estudiante (boceto 01, paso 1).
export function TarjetaOcupacionAfin({
  ocupacion,
  total,
  codigo,
  href,
}: {
  ocupacion: OcupacionAfinPublica
  total: number
  codigo: string
  href: string
}) {
  const compartidas = letrasCompartidas(ocupacion.riasec, codigo)
  return (
    <article className="sx-r-ocupacion">
      <header>
        <span className="sx-r-banda" data-banda={ocupacion.banda}>
          {etiquetaAfinidad(ocupacion)}
        </span>
        <small>
          {ocupacion.posicion} de {total}
        </small>
      </header>
      <h3>{ocupacion.titulo}</h3>
      {ocupacion.resumen && <p>{ocupacion.resumen}</p>}
      {!!ocupacion.riasec.length && (
        <p className="sx-r-letras">
          {ocupacion.riasec.map((l) => (
            <span key={l} className="sx-r-letra" data-dimension={l} aria-hidden="true">
              {l}
            </span>
          ))}
          <small>
            {compartidas.length
              ? `Comparte ${compartidas.length} de tus intereses`
              : 'No comparte letras con tu código'}
          </small>
        </p>
      )}
      {ocupacion.familia_principal && (
        <p className="sx-r-familia">
          Familia: <strong>{ocupacion.familia_principal.nombre}</strong>
        </p>
      )}
      <Link className="sx-r-boton-borde" to={href}>
        Ver ocupación
      </Link>
    </article>
  )
}
