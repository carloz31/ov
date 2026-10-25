import { ArrowRight, Sun } from 'lucide-react'
import { LumiQuestion } from '@/features/journal/components/LumiQuestion'
import type { EstadoHoy } from '@/features/journal/hooks/usePreguntaDeHoy'

export type DailyQuestionEditorContext = {
  prompt: string
  linkedActivityId: string
  title: string
  lockedTags: string[]
}

// Ajuste del diario (F05): la columna «Hoy» reúne la pregunta del día y la escritura libre en una sola tarjeta.
export function DailyQuestionCard({
  now,
  hoy,
  onRespond,
  onFree,
}: {
  now: Date
  hoy: EstadoHoy
  onRespond: (context: DailyQuestionEditorContext) => void
  onFree: () => void
}) {
  const fecha = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(now)
    .replace(',', '')
  const conPregunta = hoy.estado === 'pregunta' && hoy.editor
  return (
    <section aria-label="Hoy" className="sx-j-hoy" data-state={hoy.estado}>
      <header className="sx-j-hoy-header">
        <p className="sx-j-hoy-date">
          <Sun aria-hidden="true" size={16} /> Hoy · {fecha}
        </p>
        {conPregunta && <span className="sx-j-chip">La pregunta vence hoy</span>}
      </header>
      {hoy.estado === 'cargando' ? (
        <LumiQuestion prompt="Lumi está escribiendo…" />
      ) : conPregunta ? (
        <>
          <p className="sx-j-hoy-label">Lumi te pregunta</p>
          <h2 className="sx-j-hoy-question">“{hoy.texto}”</h2>
        </>
      ) : (
        <h2 className="sx-j-hoy-question">
          {hoy.estado === 'contada' ? 'Hoy ya le contaste a Lumi' : 'Hoy no hay pregunta'}
        </h2>
      )}
      {hoy.error && <p className="sx-j-hoy-help">{hoy.error}</p>}
      <div className="sx-j-hoy-actions">
        {conPregunta && (
          <button type="button" className="sx-d-action" onClick={() => onRespond(hoy.editor!)}>
            Responder a Lumi <ArrowRight aria-hidden="true" size={16} />
          </button>
        )}
        <button
          type="button"
          className={conPregunta ? 'sx-d-action sx-d-action-ghost' : 'sx-d-action'}
          onClick={onFree}
        >
          Escribir algo libre
        </button>
        <p className="sx-j-hoy-help">No necesitas una pregunta para contarle algo.</p>
      </div>
    </section>
  )
}
