import { Link } from 'react-router'
import { haceDias } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import type { Aliados, InvestigacionEnCurso, PreguntaBasePublica } from '@/types/servidor'

// F09 (boceto 02): la investigación en curso dentro de Mis investigaciones. Cancelar va en la tarjeta de la vista
// principal.
export function TarjetaEnCursoMia({
  enCurso,
  base,
  aliados,
  ahora,
}: {
  enCurso: InvestigacionEnCurso
  base: PreguntaBasePublica[]
  aliados: Aliados
  ahora: Date
}) {
  const lista = enCurso.estado === 'GUIA_LISTA'
  const total = aliados.misma_ocupacion.length + aliados.otras.length
  const misma = aliados.misma_ocupacion.length
  const iniciada = haceDias(enCurso.creada_en, ahora)
  return (
    <article className="sx-i-tarjeta" data-destacada="en-curso">
      <div className="sx-i-banda" data-tono="en-curso">
        <span className="sx-i-insignia" data-tono="oscuro">
          En curso · {lista ? 'guía lista' : 'guion en preparación'}
        </span>
        <small>Iniciada {iniciada}</small>
      </div>
      <div className="sx-i-cuerpo">
        <p className="sx-i-kicker">Investigación · {enCurso.ocupacion.titulo}</p>
        <h2>Todavía sin entrevista</h2>
        <p>
          Tu guion tiene {base.length + enCurso.preguntas.length} preguntas.{' '}
          {total === 0
            ? 'Aún no hay aliados en tu salón.'
            : `Hay ${total} ${total === 1 ? 'aliado' : 'aliados'} en tu salón${
                misma ? `: ${misma === 1 ? 'uno investiga' : `${misma} investigan`} lo mismo` : ''
              }.`}
        </p>
        <div className="sx-i-acciones">
          <Link
            className="sx-i-boton"
            data-tono="claro"
            to={appPaths.student.investigationGuide(lista ? 3 : 2)}
          >
            Ver mi guion
          </Link>
          {lista && (
            <Link className="sx-i-boton" to={appPaths.student.investigationPublish()}>
              Publicar mi entrevista
            </Link>
          )}
        </div>
        <small className="sx-i-letra-chica">
          Solo puede haber una investigación en curso. Cancelarla se hace desde la tarjeta de en curso de la
          vista principal.
        </small>
      </div>
    </article>
  )
}
