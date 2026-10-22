import { Check, LockKeyhole } from 'lucide-react'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'
import { ChipsFicha } from './ChipsFicha'

// Presentación del desafío antes de la batalla. En api, vidas y destellos vienen del servidor: mientras no
// llegan, un estado de carga en lugar de las reglas y la acción; si la lectura falla, solo el aviso de error
// del reproductor (F04c).
export function IntroDesafio({ model }: { model: ReturnType<typeof useChallengePlayer> }) {
  const {
    c,
    title,
    requirements,
    puedeIniciar,
    estadoBatalla,
    vidasEnemigo,
    destellos,
    fichasIntro,
    start,
  } = model
  return (
    <section className="sx-scene-panel sx-check-panel sx-challenge-panel">
      <LumiMedallion />
      <h1 ref={title} tabIndex={-1}>
        {c.titulo}
      </h1>
      <p>{c.presentacionEnemigo}</p>
      {estadoBatalla === 'cargando' ? (
        <p className="sx-challenge-loading" role="status">
          Preparando la batalla…
        </p>
      ) : estadoBatalla === 'error' ? null : (
        <>
          <div className="sx-challenge-rules">
            <span>
              {c.nombre}: {vidasEnemigo} de vida
            </span>
            <span>Tú: {destellos} destellos</span>
          </div>
          <p className="sx-challenge-rule">
            Cada acierto le quita una vida al enemigo y cada error te quita un destello. Sin límite de tiempo.
          </p>
          <ChipsFicha etiqueta="Tu luz viene de:" fichas={fichasIntro} />
          <ul className="sx-challenge-requirements">
            {requirements.map((r) => (
              <li key={`${r.tipo}-${r.id}`}>
                {r.completed ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <LockKeyhole size={18} aria-hidden="true" />
                )}
                {r.completed
                  ? r.tipo === 'ficha'
                    ? `Habilitado por leer la ficha «${r.titulo}»`
                    : `Habilitado por completar «${r.titulo}»`
                  : `Pendiente: ${r.titulo}`}
              </li>
            ))}
          </ul>
          <div className="sx-player-actions sx-actions-end">
            <button type="button" className="sx-primary-button" disabled={!puedeIniciar} onClick={start}>
              Enfrentar a {c.nombre}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
