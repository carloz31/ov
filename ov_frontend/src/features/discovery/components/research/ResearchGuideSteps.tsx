import { useResearchGuide } from '@/features/discovery/hooks/useResearchGuide'
import { Link } from 'react-router'
import { ClipboardCheck, X } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'
import { suggestedQuestions } from '@/data/content/research'
export function ResearchGuideSteps({ model }: { model: ReturnType<typeof useResearchGuide> }) {
  const {
    setPicker,
    question,
    setQuestion,
    setGuide,
    research,
    step,
    guidePage,
    occupation,
    patch,
    addQuestion,
  } = model
  return (
    <div className="sx-d-guide-page" ref={guidePage}>
      <Parchment
        label={step === 0 ? 'Lo que pienso' : step === 1 ? 'Mis preguntas' : 'Lista'}
        title={step === 0 ? 'Antes de la entrevista' : step === 1 ? 'Mi lista de preguntas' : undefined}
      >
        {step === 0 ? (
          <>
            <p className="sx-d-eyebrow">Vas a entrevistar a</p>
            <div className="sx-d-quote sx-d-row">
              <strong>{occupation?.name ?? 'Elige a quién entrevistarás'}</strong>
              <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => setPicker(true)}>
                {occupation ? 'Cambiar ocupación' : 'Elegir ocupación'}
              </button>
            </div>
            <label className="sx-d-field">
              Antes de conversar con esta persona, ¿qué crees que hace en su trabajo y qué esperas descubrir?
              <textarea
                className="sx-d-input"
                rows={6}
                placeholder="Escribe lo que piensas hoy. No hay respuestas incorrectas."
                value={research.before}
                onChange={(e) => patch({ before: e.target.value })}
              />
            </label>
            <p>
              Esto queda guardado tal cual. Después de la entrevista podrás compararlo con lo que descubriste.
            </p>
            <button
              type="button"
              className="sx-d-action sx-d-action-gold"
              disabled={!occupation || research.before.trim().length < 20}
              onClick={() => patch({ guideStep: 1 })}
            >
              Seguir con las preguntas
            </button>
          </>
        ) : step === 1 ? (
          <>
            <strong>{3 + research.ownQuestions.length} preguntas</strong>
            <h3>Sugeridas por Lumi</h3>
            <ol className="sx-d-questions">
              {suggestedQuestions.map((q, i) => (
                <li data-suggested key={q}>
                  <span>{i + 1}</span>
                  {q}
                </li>
              ))}
            </ol>
            <h3>Mis preguntas</h3>
            {!research.ownQuestions.length && (
              <p>Aún no agregas preguntas propias. ¿Qué te gustaría saber que no esté arriba?</p>
            )}
            <ol className="sx-d-questions">
              {research.ownQuestions.map((q, i) => (
                <li key={`${i}-${q}`}>
                  <span>{i + 4}</span>
                  {q}
                  <button
                    type="button"
                    className="sx-d-icon"
                    aria-label="Quitar pregunta"
                    onClick={() =>
                      patch({ ownQuestions: research.ownQuestions.filter((_q, index) => index !== i) })
                    }
                  >
                    <X />
                  </button>
                </li>
              ))}
            </ol>
            <label className="sx-d-field">
              Escribe una pregunta que quieras hacer
              <input
                className="sx-d-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    addQuestion()
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              disabled={question.trim().length < 5}
              onClick={addQuestion}
            >
              Agregar
            </button>
            <div className="sx-d-actions">
              <button
                type="button"
                className="sx-d-action sx-d-action-ghost"
                onClick={() => patch({ guideStep: 0 })}
              >
                Volver
              </button>
              <button
                type="button"
                className="sx-d-action sx-d-action-gold"
                disabled={!research.ownQuestions.length}
                onClick={() => patch({ guideReadyAt: new Date().toISOString(), guideStep: 2 })}
              >
                Terminar mi guion
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sx-d-guide-ready">
              <ClipboardCheck aria-hidden="true" />
            </div>
            <h1>Tu guía de entrevista está lista</h1>
            <p>
              {occupation?.name} · {3 + research.ownQuestions.length} preguntas
            </p>
            <ol className="sx-d-questions">
              <li>
                Busca a alguien que ejerza esta ocupación: un familiar, un conocido o alguien que te
                recomienden.
              </li>
              <li>Haz la entrevista con tu guía y grábala en video, con su permiso.</li>
              <li>Vuelve a Investigaciones para publicarla con un resumen y el enlace al video.</li>
            </ol>
            <button type="button" className="sx-d-action sx-d-action-gold" onClick={() => setGuide(true)}>
              Ver mi guion completo
            </button>
            <Link className="sx-d-action" to={appPaths.student.research}>
              Ir a Investigaciones
            </Link>
          </>
        )}
      </Parchment>
      {step === 0 && (
        <details className="sx-d-question-preview">
          <summary>Preguntas que llevarás a la entrevista</summary>
          <ul>
            {suggestedQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
