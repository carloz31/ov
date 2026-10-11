import { useState } from 'react'
import { ArrowLeft, ExternalLink, Play, FileText, Lightbulb, Star, Crown, Flag } from 'lucide-react'
import { safeVideoUrl } from '@/store/adventureStore'
import { youtubeEmbedUrl } from '@/features/backpack/lib/travelerResources'
import { useDiscovery } from '@/store/discoveryStore'
import { Parchment } from '@/components/student/Parchment'
import { TrailBar } from '@/components/student/TrailBar'
import { interviewDetails, LEGEND_REACTIONS_REQUIRED, receivedReactions } from '@/data/content/research'
import { saveLearned, toggleLiked, type InterviewVideo } from '../../lib/research'
export function InterviewDetail({
  video,
  own,
  featured,
  reported,
  onBack,
  onReport,
}: {
  video: InterviewVideo
  own: boolean
  featured: boolean
  reported: boolean
  onBack: () => void
  onReport: () => void
}) {
  const discovery = useDiscovery()
  const [learning, setLearning] = useState(false),
    [text, setText] = useState('')
  const reaction = discovery.reactions[video.id],
    publication = discovery.publishedResearch.find((r) => r.videoId === video.id)
  const detail = interviewDetails[video.id] ?? {
    career: video.title,
    path: 'Por definir',
    professional: publication?.interviewee ?? 'Profesional entrevistado',
    duration: '5–10 min',
    summary: video.reflection,
    comments: [],
  }
  const authors = publication ? ['Alex', ...publication.coauthors].join(' y ') : video.alias
  const received = receivedReactions(video.id),
    embed = youtubeEmbedUrl(video.url)
  return (
    <>
      <button type="button" className="sx-d-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Volver a Investigaciones
      </button>
      <Parchment className="sx-d-interview-detail">
        <div className="sx-d-video">
          {embed ? (
            <iframe title={`Video de ${video.title}`} src={embed} allowFullScreen />
          ) : (
            <Play size={64} aria-hidden="true" />
          )}
        </div>
        <p className="sx-d-eyebrow">
          {detail.career} · {detail.path}
        </p>
        <h1>{video.title}</h1>
        <p>
          Entrevista de {detail.duration} · Publicada por {authors}
        </p>
        <p>{video.reflection}</p>
        {safeVideoUrl(video.url) && (
          <a className="sx-d-action" href={safeVideoUrl(video.url)!} target="_blank" rel="noreferrer">
            Ver video completo
            <ExternalLink aria-hidden="true" />
          </a>
        )}
      </Parchment>
      <div className="sx-d-detail-grid">
        <Parchment title="Ficha de la entrevista">
          <FileText aria-hidden="true" />
          <dl className="sx-d-facts">
            {[
              ['Carrera o profesión', detail.career],
              ['Profesional entrevistado', detail.professional],
              ['Quienes la realizaron', authors],
              ['En pocas palabras', detail.summary],
            ].map(([title, value]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Parchment>
        <Parchment title={own ? 'Reacciones recibidas' : '¿Qué te dejó esta entrevista?'}>
          {own ? (
            <>
              <p className="sx-d-demo">Reacciones recibidas de demostración</p>
              <div className="sx-d-actions">
                <span className="sx-d-tag">{received.learned} aprendieron algo</span>
                <span className="sx-d-tag">{received.liked} les gustó cómo se realizó</span>
              </div>
              <h3>Lo que aprendieron tus compañeros</h3>
              {received.texts.map((c, i) => (
                <p className="sx-d-quote" key={i}>
                  <strong>{c.author}</strong> · {c.text}
                </p>
              ))}
              {!received.texts.length && <p>Aún no hay textos para esta entrevista.</p>}
              <div className="sx-d-parchment sx-d-dark">
                <h3>
                  <Crown aria-hidden="true" />
                  Camino a Leyenda
                </h3>
                <TrailBar
                  label="Reacciones"
                  value={((received.learned + received.liked) / LEGEND_REACTIONS_REQUIRED) * 100}
                  text={`${received.learned + received.liked} de ${LEGEND_REACTIONS_REQUIRED}`}
                />
                <p>Destacada por tu orientadora · {featured ? 'Sí' : 'Aún no'}</p>
                <p>Si llega a Leyenda, la verán estudiantes de todos los salones y de futuras promociones.</p>
              </div>
              <h3>Lo que cambió para ti</h3>
              <p>{publication?.change || 'No registraste este texto en la versión anterior.'}</p>
              <small>Solo lo ves tú y tu orientadora.</small>
            </>
          ) : (
            <>
              <div className="sx-d-actions">
                <button
                  type="button"
                  className="sx-d-action sx-d-action-ghost"
                  aria-pressed={!!reaction?.learned}
                  disabled={!!reaction?.learned}
                  onClick={() => setLearning(true)}
                >
                  <Lightbulb aria-hidden="true" />
                  Aprendí algo
                </button>
                <button
                  type="button"
                  className="sx-d-action sx-d-action-ghost"
                  aria-pressed={!!reaction?.liked}
                  onClick={() => toggleLiked(video.id)}
                >
                  <Star aria-hidden="true" />
                  Me gustó cómo se realizó
                </button>
              </div>
              {reaction?.learned ? (
                <p className="sx-d-quote" role="status">
                  Lo que aprendiste: {reaction.learned.text}
                </p>
              ) : (
                learning && (
                  <form
                    className="sx-d-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (saveLearned(video.id, text)) setLearning(false)
                    }}
                  >
                    <label>
                      ¿Qué aprendiste con esta entrevista?
                      <textarea
                        rows={3}
                        className="sx-d-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                      <small>
                        Quienes realizaron la entrevista verán lo que escribas. Mínimo 15 caracteres.
                      </small>
                    </label>
                    <button type="submit" className="sx-d-action" disabled={text.trim().length < 15}>
                      Enviar
                    </button>
                  </form>
                )
              )}
              <button
                type="button"
                className="sx-d-action sx-d-action-ghost"
                disabled={reported}
                onClick={onReport}
              >
                <Flag aria-hidden="true" />
                {reported ? 'Reportado' : '¿Algo no está bien? Reportar'}
              </button>
            </>
          )}
        </Parchment>
      </div>
    </>
  )
}
