import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { InvestigacionEnCurso, PreguntaBasePublica } from '@/types/servidor'

// F09 (boceto 03): «Tu investigación en curso» sobre el selector, con el avance en tres pasos. Con la guía lista,
// publicar y los consejos (paso Guía lista); con el guion a medias, seguir con él.
export function TarjetaEnCurso({
  enCurso,
  base,
  onCancelar,
}: {
  enCurso: InvestigacionEnCurso
  base: PreguntaBasePublica[]
  onCancelar: () => void
}) {
  const lista = enCurso.estado === 'GUIA_LISTA'
  const preguntas = base.length + enCurso.preguntas.length
  return (
    <section className="sx-i-panel" data-destacada="true" aria-labelledby="en-curso-titulo">
      <div className="sx-i-panel-cabecera">
        <p className="sx-i-kicker">Tu investigación en curso</p>
        <button type="button" className="sx-i-enlace" onClick={onCancelar}>
          Cancelar investigación
        </button>
      </div>
      <h2 id="en-curso-titulo">{enCurso.ocupacion.titulo}</h2>
      <ol className="sx-i-pasos">
        <li className="sx-i-paso" data-hecho={lista || undefined}>
          {lista ? <Check aria-hidden="true" size={18} /> : <span className="sx-i-paso-numero">1</span>}
          <span>
            <strong>{lista ? 'Guion listo' : 'Guion en preparación'}</strong> · {preguntas} preguntas
          </span>
        </li>
        <li className="sx-i-paso">
          <span className="sx-i-paso-numero">2</span>
          <span>
            <strong>Entrevistar</strong> · fuera de la plataforma
          </span>
        </li>
        <li className="sx-i-paso">
          <span className="sx-i-paso-numero">3</span>
          <span>
            <strong>Publicar</strong> · ficha y enlace
          </span>
        </li>
      </ol>
      <p>
        {lista
          ? '¿Ya conversaste con esa persona? Comparte lo que descubriste con tu salón. Si la hiciste en grupo, podrás agregar a tus compañeros al publicar.'
          : 'Termina tu guion para salir a entrevistar: las tres preguntas base y al menos una tuya.'}
      </p>
      <div className="sx-i-acciones">
        {lista ? (
          <>
            <Link className="sx-i-boton" to={appPaths.student.investigationPublish()}>
              Publicar mi entrevista
            </Link>
            <Link className="sx-i-boton" data-tono="claro" to={appPaths.student.investigationGuide(3)}>
              Consejos y camino a Leyenda
            </Link>
          </>
        ) : (
          <Link className="sx-i-boton" to={appPaths.student.investigationGuide(2)}>
            Seguir con mi guion
          </Link>
        )}
      </div>
      <small className="sx-i-letra-chica">
        El guion sigue editable hasta que publiques. Cancelar borra el guion y lo que pensabas; te lo
        preguntamos una vez, sin pedir motivo.
      </small>
    </section>
  )
}
