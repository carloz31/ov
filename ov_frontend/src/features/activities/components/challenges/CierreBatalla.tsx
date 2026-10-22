import { BookOpen, Swords } from 'lucide-react'
import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'
import { resumirCierre } from '../../lib/finishSummary'
import { FinishMedalsSection } from '../FinishMedalsSection'
import { FinishBackpackSection } from '../FinishBackpackSection'
import { FinishExtrasSection } from '../FinishExtrasSection'

// F04b (api): cierres de la batalla del servidor. Victoria con sus desbloqueos, práctica sin ellos y
// derrota con el repaso como acción principal. Nunca muestra las respuestas correctas. F04c: el cierre sale de
// la respuesta del servidor al intento; mientras llega, un estado de carga, y si falla, «Reintentar».
export function CierreBatalla({
  model,
  onClose,
}: {
  model: ReturnType<typeof useChallengePlayer>
  onClose: () => void
}) {
  const {
    c,
    resultado,
    enviandoIntento,
    errorIntento,
    reintentarIntento,
    vidasEnemigo,
    title,
    sheets,
    setResourcesOpen,
    start,
    etiquetaRepaso,
  } = model
  if (enviandoIntento)
    return (
      <section className="sx-scene-panel sx-challenge-panel sx-check-panel sx-challenge-close">
        <p className="sx-challenge-loading" role="status">
          Guardando tu intento…
        </p>
      </section>
    )
  if (!resultado)
    return errorIntento ? (
      <section className="sx-scene-panel sx-challenge-panel sx-check-panel sx-challenge-close">
        <p role="alert" className="sx-player-error">
          {errorIntento}
        </p>
        <button type="button" className="sx-primary-button" onClick={reintentarIntento}>
          Reintentar
        </button>
      </section>
    ) : null
  if (!resultado.victoria)
    return (
      <section className="sx-scene-panel sx-challenge-panel sx-check-panel sx-challenge-close is-defeat">
        <span className="sx-challenge-emblem is-enemy" aria-hidden="true">
          <img src={c.ilustracion} alt="" />
        </span>
        <h1 ref={title} tabIndex={-1}>
          {c.nombre} resistió esta vez.
        </h1>
        <p>
          Le quitaste {resultado.aciertos} de sus {vidasEnemigo} vidas. Repasa la ficha y volvamos con más luz: en
          el próximo intento habrá preguntas nuevas.
        </p>
        <p>No pierdes nada de lo que ya lograste en tu recorrido.</p>
        <div className="sx-player-actions">
          {sheets.length > 0 && (
            <button type="button" className="sx-primary-button" onClick={() => setResourcesOpen(true)}>
              <BookOpen size={18} aria-hidden="true" />
              {etiquetaRepaso}
            </button>
          )}
          <button
            type="button"
            className={sheets.length > 0 ? 'sx-secondary-button' : 'sx-primary-button'}
            onClick={start}
          >
            Intentar de nuevo
          </button>
        </div>
      </section>
    )
  const practica = resultado.practica
  const resumen = practica
    ? undefined
    : resumirCierre({
        desbloqueos: resultado.nuevos_desbloqueos,
        yaCompletada: false,
        completada: true,
        tienePreguntaDiario: false,
        modoApi: true,
      })
  return (
    <section
      className={`sx-scene-panel sx-challenge-panel sx-finish-card sx-player-card sx-challenge-close ${practica ? 'is-practice' : 'is-victory'}`}
    >
      <span className={`sx-challenge-emblem ${practica ? 'is-muted' : ''}`} aria-hidden="true">
        <Swords size={40} />
      </span>
      <p className="sx-player-eyebrow">{practica ? 'Práctica completada' : 'Desafío superado'}</p>
      <h1 ref={title} tabIndex={-1}>
        ¡Disipaste a {c.nombre}!
      </h1>
      <p>La información despejó el camino hacia {c.recompensa.lugar}.</p>
      <div className="sx-challenge-pills">
        <span>
          {resultado.aciertos} aciertos de {resultado.preguntas} preguntas
        </span>
        <span>Te quedaron {resultado.destellos_restantes} destellos</span>
      </div>
      {resumen && resumen.medallas.length > 0 && <FinishMedalsSection medallas={resumen.medallas} />}
      {resumen && resumen.totalRecursos > 0 && <FinishBackpackSection resumen={resumen} />}
      {resumen && resumen.extras.length > 0 && <FinishExtrasSection extras={resumen.extras} />}
      <button type="button" className="sx-primary-button sx-challenge-continue" onClick={onClose}>
        Continuar
      </button>
    </section>
  )
}
