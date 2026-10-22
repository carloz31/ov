import { BookOpen, Check, LockKeyhole } from 'lucide-react'
import { LumiMedallion } from '@/components/student/LumiMedallion'
import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'

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
    etiquetaRepasoAntes,
    sheets,
    setResourcesOpen,
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
            <span>Cada pregunta: {c.opcionesPorPregunta} opciones</span>
          </div>
          <ul>
            <li>Cada acierto le quita una vida al enemigo.</li>
            <li>Cada error te quita un destello.</li>
            <li>Lee con calma. No hay límite de tiempo.</li>
          </ul>
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
          <div className="sx-player-actions">
            <button type="button" className="sx-primary-button" disabled={!puedeIniciar} onClick={start}>
              Enfrentar a {c.nombre}
            </button>
            {sheets.length > 0 && (
              <button type="button" className="sx-secondary-button" onClick={() => setResourcesOpen(true)}>
                <BookOpen size={18} />
                {etiquetaRepasoAntes}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
