import { ArrowDownUp, Search } from 'lucide-react'
import { Link } from 'react-router'
import { useJournalHome, type FiltroCuaderno } from '@/features/journal/hooks/useJournalHome'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import type { JournalEntry } from '@/types/adventure'
import { Parchment } from '@/components/student/Parchment'
import { JournalCard } from '@/features/journal/components/JournalCard'
import { appPaths } from '@/routes/paths'

const filtros: [FiltroCuaderno, string][] = [
  ['todas', 'Todas'],
  ['libres', 'Libres'],
  ['del_dia', 'Pregunta del día'],
  ['cartas', 'Cartas de Lumi'],
]

// Ajuste del diario (F05): el cuaderno con buscador por título o pregunta, orden y filtros por tipo. En la portada
// muestra las 3 primeras y «Ver todo el cuaderno»; con `completo`, todas.
export function CuadernoDiario({
  entries,
  onOpen,
  completo,
}: {
  entries: JournalEntry[]
  onOpen: (entry: JournalEntry) => void
  completo: boolean
}) {
  const c = useJournalHome({ entries, completo })
  const desde = c.primera
    ? new Date(c.primera).toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Lima',
      })
    : undefined
  return (
    <Parchment className="sx-j-notebook" label="Tu cuaderno" title="Lo que le has contado a Lumi">
      {desde && <p className="sx-j-notebook-count">{`${c.total} cartas desde el ${desde}`}</p>}
      <div className="sx-j-notebook-controls">
        <label className="sx-j-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Buscar por título o pregunta</span>
          <input
            className="sx-d-input"
            placeholder="Buscar por título o pregunta"
            value={c.query}
            onChange={(event) => c.setQuery(event.target.value)}
          />
        </label>
        <button type="button" className="sx-j-order" onClick={c.alternarOrden}>
          <ArrowDownUp aria-hidden="true" size={16} />
          {c.orden === 'recientes' ? 'Más reciente primero' : 'Más antiguo primero'}
        </button>
      </div>
      <div className="sx-j-notebook-filters">
        <div className="sx-j-topic-filters" role="group" aria-label="Filtrar por tipo">
          {filtros.map(([valor, etiqueta]) => (
            <button
              type="button"
              key={valor}
              aria-pressed={c.filtro === valor}
              onClick={() => c.setFiltro(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {c.visibles.length > 0 && (
          <p className="sx-j-notebook-shown">
            {c.orden === 'recientes'
              ? `Mostrando las ${c.visibles.length} más recientes`
              : `Mostrando las ${c.visibles.length} más antiguas`}
          </p>
        )}
      </div>
      {c.visibles.length ? (
        <div className="sx-d-stack">
          {c.visibles.map((entry) => (
            <JournalCard entry={entry} key={entry.id} onOpen={() => onOpen(entry)} />
          ))}
        </div>
      ) : (
        <div className="sx-j-empty">
          <span className="sx-j-empty-lumi">
            <LumiPortrait />
          </span>
          <h3>
            {entries.length ? 'No encontramos cartas con esa búsqueda' : 'Todavía no has escrito nada aquí'}
          </h3>
          <p>
            Este espacio está listo cuando quieras usarlo. No hace falta esperar a que algo importante pase.
          </p>
        </div>
      )}
      {c.hayMas && (
        <Link className="sx-j-notebook-all" to={`${appPaths.student.journal}?cuaderno=completo`}>
          Ver todo el cuaderno
        </Link>
      )}
    </Parchment>
  )
}
