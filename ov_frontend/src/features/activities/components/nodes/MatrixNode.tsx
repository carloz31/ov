import { useRef, useState } from 'react'
import { ArrowRight, Check, Pencil, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import type { Actividad, NodoConsigna } from '@/types/activities'
import { latestSubmission } from '@/lib/activities/logic'
import { useJourney } from '@/store/journeyStore'
import { SubmissionNode } from './SubmissionNode'
import { useReflections } from '@/store/reflectionStore'
import { QuestionMemory } from '../reflection/QuestionMemory'

export function MatrixNode({ activity, onContinue }: { activity: Actividad; onContinue: () => void }) {
  const state = useJourney()
  const reflections = useReflections()
  const [activeId, setActiveId] = useState<string>()
  const [column, setColumn] = useState(0)
  const returnFocus = useRef<HTMLElement | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const template = activity.plantilla
  if (template?.tipo !== 'matriz') return null
  const tasks = activity.nodos.filter((node): node is NodoConsigna => node.tipo === 'consigna')
  const active = tasks.find((node) => node.id === activeId)
  const required = tasks.filter((node) => node.obligatoria)
  const done = required.filter((node) => latestSubmission(state, activity.id, node.id)).length
  function cell(node: NodoConsigna, label: string) {
    const entry = latestSubmission(state, activity.id, node.id)
    const question = reflections.preguntas[`${activity.id}/${node.id}`]
    const firstNotice =
      question?.respuestaOrigen &&
      tasks.find(
        (task) =>
          reflections.preguntas[`${activity.id}/${task.id}`]?.respuestaOrigen?.respuestaId ===
          question.respuestaOrigen?.respuestaId,
      )?.id
    return (
      <div key={node.id}>
        <button
          type="button"
          key={node.id}
          className={`sx-matrix-cell ${entry ? 'is-filled' : ''}`}
          onClick={(event) => {
            returnFocus.current = event.currentTarget
            setActiveId(node.id)
          }}
        >
          <span className="sx-cell-label">
            {label}
            {entry ? <Check size={15} /> : <Pencil size={14} />}
          </span>
          <span className="sx-cell-text">
            {entry?.contenido.tipo === 'texto' ? entry.contenido.texto : 'Escribe una posibilidad…'}
          </span>
          <small>
            {entry
              ? `Guardado · versión ${entry.version}`
              : node.obligatoria
                ? 'Necesario para continuar'
                : 'Opcional'}
          </small>
        </button>
        {question && <QuestionMemory question={question} compact hideNotice={firstNotice !== node.id} />}
      </div>
    )
  }
  return (
    <div className="sx-card-stage">
      <section className="sx-glass sx-player-card sx-matrix-card case-scrollbar">
        <p className="sx-player-eyebrow">Tu futuro se dibuja con lápiz</p>
        <h2>{activity.titulo}</h2>
        <p>No necesitas certezas. Empieza por lo cercano y deja espacio para cambiar de rumbo.</p>
        <div className="sx-matrix-tabs" role="tablist" aria-label="Horizonte de tu mapa">
          {template.columnas.map((col, index) => (
            <button
              type="button"
              key={col.id}
              ref={(button) => {
                tabs.current[index] = button
              }}
              role="tab"
              id={`sx-tab-${col.id}`}
              aria-controls={`sx-column-${col.id}`}
              tabIndex={column === index ? 0 : -1}
              aria-selected={column === index}
              onClick={() => setColumn(index)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % template.columnas.length
                    : event.key === 'ArrowLeft'
                      ? (index + template.columnas.length - 1) % template.columnas.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? template.columnas.length - 1
                          : undefined
                if (next === undefined) return
                event.preventDefault()
                setColumn(next)
                tabs.current[next]?.focus()
              }}
            >
              {col.etiqueta}
            </button>
          ))}
        </div>
        <div
          className={`sx-matrix matrix-${template.estilo}`}
          style={{ gridTemplateColumns: `repeat(${template.columnas.length}, minmax(0, 1fr))` }}
        >
          {template.columnas.map((col, index) => (
            <section
              key={col.id}
              className={`sx-matrix-column ${index === column ? 'is-active' : ''}`}
              id={`sx-column-${col.id}`}
              role="tabpanel"
              aria-labelledby={`sx-tab-${col.id}`}
            >
              <header>
                <span>{index + 1}</span>
                <h3>{col.etiqueta}</h3>
                <p>{col.subtitulo ?? 'Un horizonte por explorar'}</p>
              </header>
              {template.filas.map((row) => {
                const task = tasks.find((node) => node.slot === `${col.id}.${row.id}`)
                return task ? cell(task, `${row.icono ?? ''} ${row.etiqueta}`) : null
              })}
            </section>
          ))}
        </div>
        <div className="sx-matrix-outside">
          {template.consignasFuera?.map((id) => {
            const task = tasks.find((node) => node.id === id)
            return task ? cell(task, task.etiqueta ?? task.premisa) : null
          })}
        </div>
        <footer className="sx-card-footer">
          <span>
            {done} de {required.length} entregas necesarias guardadas
          </span>
          <button
            type="button"
            className="sx-primary-button"
            disabled={done !== required.length}
            onClick={onContinue}
          >
            Guardar mi mapa y seguir
            <ArrowRight size={18} />
          </button>
        </footer>
        <Dialog
          open={!!active}
          onOpenChange={(open) => {
            if (!open) setActiveId(undefined)
          }}
        >
          <DialogContent
            className="sx-root sx-matrix-editor case-scrollbar"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              if (returnFocus.current?.isConnected) returnFocus.current.focus()
            }}
          >
            <DialogTitle>{active?.etiqueta ?? 'Una nueva coordenada'}</DialogTitle>
            <DialogDescription>
              Tu mapa puede cambiar contigo. Cada entrega conserva su versión anterior.
            </DialogDescription>
            {active && (
              <SubmissionNode
                key={active.id}
                activity={activity}
                node={active}
                onSaved={() => setActiveId(undefined)}
              />
            )}
            <button type="button" className="sx-secondary-button" onClick={() => setActiveId(undefined)}>
              <X size={18} />
              Volver al mapa
            </button>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  )
}
