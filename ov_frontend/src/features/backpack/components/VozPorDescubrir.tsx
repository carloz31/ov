import { Link } from 'react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'

// Testimonio bloqueado cuyo llamado ya está disponible (ajuste mochila): candado, una línea borrosa en lugar del
// nombre, título, pista y el llamado que hay que atender. La tarjeta abre el pop up de requisito; «Ir a la
// Central» lleva directo al drawer del llamado.
export function VozPorDescubrir({
  titulo,
  pista,
  caso,
  hrefCaso,
  onRequisito,
}: {
  titulo: string
  pista: string
  caso?: string
  hrefCaso?: string
  onRequisito: () => void
}) {
  return (
    <article className="sx-b-voz sx-b-voz-bloqueada">
      <div className="sx-b-voz-autor">
        <span aria-hidden="true">
          <LockKeyhole size={18} />
        </span>
        <div>
          <p className="sx-b-voice-label">Una voz por descubrir</p>
          <span className="sx-b-voz-borrosa" aria-hidden="true" />
        </div>
      </div>
      <h3>
        <button type="button" onClick={onRequisito}>
          {titulo}
        </button>
      </h3>
      {pista && <p>{pista}</p>}
      {caso && (
        <div className="sx-b-requirement">
          <p>
            Atiende el llamado <strong>{caso}</strong> en la Central de Casos.
          </p>
          {hrefCaso && (
            <Link to={hrefCaso} className="sx-b-ir-central">
              Ir a la Central
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          )}
        </div>
      )}
    </article>
  )
}
