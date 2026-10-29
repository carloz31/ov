import type { JournalEntry } from '@/types/adventure'

import { JournalTags } from '@/features/journal/components/JournalTags'
import { fechaServidor } from '@/lib/servidor/fechas'

const dia = (fecha: Date) =>
  fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })

// Ajuste del diario (F05): una entrada del cuaderno como un punto de su línea de tiempo: fecha, origen, título y
// extracto. Toda la entrada abre su detalle.
export function JournalCard({ entry, onOpen }: { entry: JournalEntry; onOpen: () => void }) {
  const daily = entry.linkedActivityId?.startsWith('daily-prompt-')
  const origen =
    entry.etiqueta ?? (daily ? 'Pregunta del día' : entry.kind === 'open' ? 'Libre' : 'Carta de Lumi')
  const tipo = origen === 'Pregunta del día' ? 'daily' : origen === 'Libre' ? 'open' : 'letter'
  const creada = fechaServidor(entry.createdAt)
  const fecha = dia(creada) === dia(new Date()) ? `Hoy, ${dia(creada)}` : dia(creada)
  return (
    <li className="sx-j-entry" data-kind={tipo}>
      <button type="button" className="sx-j-entry-open" onClick={onOpen}>
        <span className="sx-j-entry-meta">
          <time dateTime={entry.createdAt}>{fecha}</time>
          <span className="sx-j-origin">{origen}</span>
          {entry.editada && <span className="sx-j-origin sx-j-origin-plain">Editada</span>}
        </span>
        <h3>{entry.title}</h3>
        <p className="sx-j-entry-excerpt">{entry.body}</p>
      </button>
      {entry.etiqueta === undefined && <JournalTags tags={entry.topicTags} />}
    </li>
  )
}
