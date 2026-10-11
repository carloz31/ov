import { Parchment } from '@/components/student/Parchment'
import { MessageCircle, BookOpen, Compass, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'

export function ResultNextSteps() {
  const prompt = '¿En qué momento reciente usaste tu inteligencia más fuerte sin darte cuenta?'
  return (
    <Parchment className="sx-d-result-panel sx-d-result-next" aria-labelledby="siguientes-pasos">
      <p className="sx-d-eyebrow">Siguiente paso</p>
      <h2 id="siguientes-pasos">Qué hacer con lo que descubriste</h2>
      <p>
        Este resultado no recomienda carreras: te ayuda a conocer cómo aprendes y en qué contextos te
        desenvuelves mejor.
      </p>
      <div className="sx-d-result-grid">
        <article className="sx-d-result-card">
          <span className="sx-d-result-step-icon">
            <MessageCircle aria-hidden="true" />
          </span>
          <h3>Conversa con tu familia</h3>
          <p>
            Compara lo que dice el cuestionario con lo que ellos ven de ti. Luego cuéntanos qué aprendiste.
          </p>
          <Link className="sx-d-action" to={appPaths.student.conversations}>
            Abrir guía de conversación <ChevronRight aria-hidden="true" />
          </Link>
        </article>
        <article className="sx-d-result-card">
          <span className="sx-d-result-step-icon">
            <BookOpen aria-hidden="true" />
          </span>
          <h3>Escríbelo en tu diario</h3>
          <p>{prompt}</p>
          <Link className="sx-d-action" to={`${appPaths.student.journal}?${new URLSearchParams({ prompt })}`}>
            Escribir en mi diario <ChevronRight aria-hidden="true" />
          </Link>
        </article>
        <article className="sx-d-result-card">
          <span className="sx-d-result-step-icon">
            <Compass aria-hidden="true" />
          </span>
          <h3>Míralo junto a tus intereses</h3>
          <p>
            Lo que te atrae hacer y la forma en que aprendes se complementan. La página I tiene ocupaciones y
            carreras.
          </p>
          <Link className="sx-d-action" to={discoveryPaths.helenaPage('intereses')}>
            Ir a la página I <ChevronRight aria-hidden="true" />
          </Link>
        </article>
      </div>
    </Parchment>
  )
}
