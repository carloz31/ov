import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'
import { Star } from 'lucide-react'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { RewardCard } from '@/features/activities/components/RewardCard'
import { CheckOption } from '@/features/activities/components/CheckOption'
import { CierreBatalla } from './CierreBatalla'
import { IntroDesafio } from './IntroDesafio'
export function ChallengeStage({
  model,
  onClose,
}: {
  model: ReturnType<typeof useChallengePlayer>
  onClose: () => void
}) {
  const {
    c,
    error,
    practice,
    stage,
    setStage,
    battle,
    setBattle,
    repasar,
    abrirRecompensa,
    title,
    muestraRecompensas,
    cierreServidor,
    vidasEnemigo,
    destellos,
    sheets,
    question,
    hit,
    victory,
    start,
    answer,
    responseTitle,
  } = model
  return (
    <main className="sx-challenge-stage case-scrollbar">
      {error && (
        <p role="alert" className="sx-player-error">
          {error}
        </p>
      )}
      <div className="sx-enemy-stage">
        {stage === 'battle' && battle && (
          <div
            className="sx-enemy-life"
            role="progressbar"
            aria-label={`Vida de ${c.nombre}`}
            aria-valuemin={0}
            aria-valuemax={vidasEnemigo}
            aria-valuenow={battle.enemyLife}
          >
            {Array.from({ length: vidasEnemigo }, (_, i) => (
              <span key={i} data-filled={i < battle.enemyLife} />
            ))}
            <span className="sr-only">
              {battle.enemyLife} de {vidasEnemigo} vidas
            </span>
          </div>
        )}
        <img
          key={`${stage}-${battle?.answered ?? 0}`}
          src={c.ilustracion}
          alt={c.nombre}
          className={
            stage === 'result' && victory
              ? 'anim-vanish'
              : hit && stage === 'battle'
                ? 'anim-shake'
                : 'anim-float'
          }
          style={{
            opacity:
              stage === 'result' && victory
                ? undefined
                : battle
                  ? 0.4 + (0.6 * battle.enemyLife) / vidasEnemigo
                  : 1,
          }}
        />
        {hit && stage === 'battle' && (
          <span key={battle?.answered} className="sx-enemy-flash anim-flash" aria-hidden="true">
            <Star size={90} fill="currentColor" />
          </span>
        )}
      </div>
      {stage === 'intro' ? (
        // Sin hooks propios: se llama como función para que su marcado quede en línea, como antes de separarla.
        IntroDesafio({ model })
      ) : stage === 'battle' && battle && question ? (
        <section className="sx-scene-panel sx-check-panel sx-challenge-panel">
          <div className="sx-battle-question-header">
            <p className="sx-player-eyebrow">PREGUNTA {battle.index + 1}</p>
            <div
              className="sx-battle-sparks"
              aria-label={`Destellos restantes: ${battle.sparks} de ${destellos}`}
            >
              {Array.from({ length: destellos }, (_, i) => (
                <Star
                  key={`${i}-${battle.answered}`}
                  size={24}
                  aria-hidden="true"
                  fill={i < battle.sparks ? 'currentColor' : 'none'}
                  data-lit={i < battle.sparks}
                  className={!hit && battle.selected && i === battle.sparks ? 'anim-dim' : ''}
                />
              ))}
            </div>
          </div>
          <h2 ref={!battle.selected ? title : undefined} tabIndex={-1}>
            {question.enunciado}
          </h2>
          <div className="sx-player-options">
            {question.opciones.map((o, i) => (
              <CheckOption
                key={o.id}
                text={o.texto}
                letter={String.fromCharCode(65 + i)}
                disabled={!!battle.selected}
                state={
                  !battle.selected
                    ? 'idle'
                    : o.id === question.correcta
                      ? 'correct'
                      : o.id === battle.selected
                        ? 'incorrect'
                        : 'muted'
                }
                label={
                  !battle.selected
                    ? undefined
                    : o.id === question.correcta
                      ? o.id === battle.selected
                        ? 'Tu respuesta · Correcta'
                        : 'Respuesta correcta'
                      : o.id === battle.selected
                        ? 'Tu respuesta'
                        : undefined
                }
                onClick={() => answer(o.id)}
              />
            ))}
          </div>
          {battle.selected && (
            <div className={`sx-check-result ${hit ? 'is-success' : 'is-hint'}`} aria-live="polite">
              <LumiMedallion />
              <div>
                <h3 ref={title} tabIndex={-1}>
                  {responseTitle}
                </h3>
                <p>{question.explicacion}</p>
              </div>
            </div>
          )}
          {battle.selected && (
            <div className="sx-player-actions sx-actions-end">
              <button
                type="button"
                className="sx-primary-button"
                onClick={() =>
                  battle.finished
                    ? setStage('result')
                    : setBattle({ ...battle, index: battle.index + 1, selected: undefined })
                }
              >
                {battle.finished ? 'Ver resultado' : 'Siguiente pregunta'}
              </button>
            </div>
          )}
        </section>
      ) : cierreServidor ? (
        <CierreBatalla model={model} onClose={onClose} />
      ) : (
        battle && (
          <section
            className={`sx-scene-panel sx-challenge-panel ${victory ? 'sx-finish-card sx-player-card' : 'sx-check-panel'}`}
          >
            <LumiMedallion celebration={victory} />
            {victory ? (
              <>
                <p className="sx-player-eyebrow">DESAFÍO SUPERADO</p>
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
                {muestraRecompensas && !practice.current && battle.sparks === destellos && c.logroOculto && (
                  <RewardCard kind="badge" title={c.logroOculto.nombre} />
                )}
                {muestraRecompensas && !practice.current && (
                  <RewardCard
                    kind={c.recompensa.recursoIds?.length ? 'sheet' : 'object'}
                    title={c.recompensa.titulo}
                    index={!practice.current && battle.sparks === destellos && c.logroOculto ? 1 : 0}
                    onOpen={c.recompensa.recursoIds?.length ? abrirRecompensa : undefined}
                  />
                )}
                {practice.current && <p>Completaste una práctica. Tu recompensa ya viaja contigo.</p>}
                <div className="sx-player-actions">
                  <button type="button" className="sx-primary-button" onClick={onClose}>
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 ref={title} tabIndex={-1}>
                  {c.nombre} resistió esta vez.
                </h1>
                <p>
                  Le quitaste {battle.hits} de sus {vidasEnemigo} vidas. Repasa la ficha y volvamos con más
                  luz: en el próximo intento habrá preguntas nuevas.
                </p>
                <p>No pierdes nada de lo que ya lograste en tu recorrido.</p>
                <div className="sx-player-actions">
                  {sheets.length > 0 && (
                    <button
                      type="button"
                      className="sx-primary-button"
                      onClick={repasar}
                    >
                      Repasar la ficha
                    </button>
                  )}
                  <button type="button" className="sx-secondary-button" onClick={start}>
                    Intentar de nuevo
                  </button>
                  <button type="button" className="sx-secondary-button" onClick={onClose}>
                    Volver a la ciudad
                  </button>
                </div>
              </>
            )}
          </section>
        )
      )}
    </main>
  )
}
