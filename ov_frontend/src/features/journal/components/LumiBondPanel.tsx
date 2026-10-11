import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Sparkles } from 'lucide-react'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import { Parchment } from '@/components/student/Parchment'
import { TrailBar } from '@/components/student/TrailBar'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import { lumiMemories } from '../data/lumiMemories'
import type { LumiBond } from '../lib/lumiBond'
export function LumiBondPanel({ bond }: { bond: LumiBond }) {
  const ui = useStudentUi(),
    [params, setParams] = useSearchParams(),
    [open, setOpen] = useState<number>()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const requested = Number(params.get('memory'))
  function readMemory(number: number) {
    setOpen(number)
    updateStudentUi((current) => ({
      ...current,
      seenLumiMemories: [...new Set([...current.seenLumiMemories, number])],
      seenUnlockIds: [...new Set([...current.seenUnlockIds, `lumi-memory:${number}`])],
    }))
  }
  useEffect(() => {
    if (Number.isInteger(requested) && requested >= 1 && requested <= bond.memoriesOpened)
      readMemory(requested)
  }, [requested, bond.memoriesOpened])
  function closeMemory() {
    const number = open
    setOpen(undefined)
    if (params.has('memory'))
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('memory')
          return next
        },
        { replace: true },
      )
    if (number) buttons.current[number - 1]?.focus()
  }
  const memory = open ? lumiMemories[open - 1] : undefined
  return (
    <Parchment className="sx-d-dark sx-j-bond">
      <div className="sx-j-lumi">
        <LumiPortrait />
      </div>
      <p className="sx-d-eyebrow">Tu compañera de viaje</p>
      <h2>Amistad con Lumi</h2>
      <span className="sx-j-level">{bond.level}</span>
      <TrailBar
        label={`${bond.conversations} conversaciones`}
        value={bond.progress}
        text={
          bond.nextMemoryAt
            ? `Faltan ${bond.nextMemoryAt - bond.conversations} para el siguiente recuerdo`
            : 'Todos los recuerdos abiertos'
        }
      />
      <p>Hoy cuentan hasta 3 conversaciones. La amistad nunca se pierde.</p>
      {!bond.remainingToday && (
        <p>Hoy ya contaron tus 3 conversaciones. Puedes seguir escribiendo cuando quieras.</p>
      )}
      <div className="sx-j-memory-heading">
        <h3>Recuerdos de Lumi</h3>
        <strong>
          {bond.memoriesOpened} de {lumiMemories.length}
        </strong>
      </div>
      <div className="sx-j-memories">
        {lumiMemories.map((m, i) =>
          i < bond.memoriesOpened ? (
            <button
              key={m.threshold}
              ref={(node) => {
                buttons.current[i] = node
              }}
              type="button"
              className="sx-j-memory-open"
              onClick={() => readMemory(i + 1)}
              aria-expanded={open === i + 1}
            >
              <Sparkles aria-hidden="true" />
              <span>
                <strong>Recuerdo {i + 1}</strong>
                <span>{m.title}</span>
              </span>
              {!ui.seenLumiMemories.includes(i + 1) && <small>Nuevo</small>}
            </button>
          ) : (
            <div className="sx-j-memory-locked" key={m.threshold}>
              <span aria-hidden="true">?</span>
              <div>
                <strong>Recuerdo {i + 1}</strong>
                <span className="sx-j-memory-blur" aria-hidden="true">
                  Un recuerdo guardado
                </span>
                <small>Al llegar a {m.threshold} conversaciones</small>
              </div>
            </div>
          ),
        )}
      </div>
      {memory && (
        <Parchment className="sx-j-memory-text" title={memory.title}>
          <p>{memory.text}</p>
          <button type="button" className="sx-d-action" onClick={closeMemory}>
            Guardar en mi memoria
          </button>
        </Parchment>
      )}
    </Parchment>
  )
}
