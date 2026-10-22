import { BookOpen, Swords } from 'lucide-react'
import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'
import { resumirCierre } from '../../lib/finishSummary'
import { FinishMedalsSection } from '../FinishMedalsSection'
import { FinishBackpackSection } from '../FinishBackpackSection'
import { FinishExtrasSection } from '../FinishExtrasSection'

// F04b (api): cierres de la batalla del servidor. Victoria con sus desbloqueos, práctica sin ellos y
// derrota con el repaso como acción principal. Nunca muestra las respuestas correctas.
export function CierreBatalla({
  model,
  onClose,
}: {
  model: ReturnType<typeof useChallengePlayer>
  onClose: () => void
}) {
  const { c, battle, victory, practicaIntento, desbloqueos, title, sheets, setResourcesOpen, start, etiquetaRepaso } =
    model
  if (!battle) return null
  if (!victory)
    return (
      <section className="sx-scene-panel sx-challenge-panel sx-check-panel sx-challenge-close is-defeat">
        <span className="sx-challenge-emblem is-enemy" aria-hidden="true">
          <img src={c.ilustracion} alt="" />
        </span>
        <h1 ref={title} tabIndex={-1}>
          {c.nombre} resistió esta vez.
        </h1>
        <p>
          Le quitaste {battle.hits} de sus {c.vidasEnemigo} vidas. Repasa la ficha y volvamos con más luz: en el
          próximo intento habrá preguntas nuevas.
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
  const resumen = practicaIntento
    ? undefined
    : resumirCierre({ desbloqueos, yaCompletada: false, completada: true, tienePreguntaDiario: false, modoApi: true })
  return (
    <section
      className={`sx-scene-panel sx-challenge-panel sx-finish-card sx-player-card sx-challenge-close ${practicaIntento ? 'is-practice' : 'is-victory'}`}
    >
      <span className={`sx-challenge-emblem ${practicaIntento ? 'is-muted' : ''}`} aria-hidden="true">
        <Swords size={40} />
      </span>
      <p className="sx-player-eyebrow">{practicaIntento ? 'Práctica completada' : 'Desafío superado'}</p>
      <h1 ref={title} tabIndex={-1}>
        ¡Disipaste a {c.nombre}!
      </h1>
      <p>La información despejó el camino hacia {c.recompensa.lugar}.</p>
      <div className="sx-challenge-pills">
        <span>
          {battle.hits} aciertos de {battle.answered} preguntas
        </span>
        <span>Te quedaron {battle.sparks} destellos</span>
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
