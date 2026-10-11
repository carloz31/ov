import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { additionalMissions, reflectionCopy } from '@/data/activities/reflectionConfig'
import { activityById } from '@/data/activities/content'
import { updateReflections, useReflections } from '@/store/reflectionStore'
import { isWithinStudentDemo } from '@/config/studentDemoScope'

export function AdditionalReveal({
  onFrame,
  onSelect,
  enabled = true,
}: {
  onFrame: (ids: string[]) => void
  onSelect: (id: string) => void
  enabled?: boolean
}) {
  const state = useReflections()
  const pending = state.desbloqueos.filter((d) => !d.visto && isWithinStudentDemo(d.actividadId))
  const first = pending[0]
  const firstId = first?.actividadId
  const card =
    pending.length || !isWithinStudentDemo(state.anuncioAdicional?.actividadId ?? '')
      ? undefined
      : state.anuncioAdicional?.actividadId
  useEffect(() => {
    if (!firstId || !enabled) return
    const mission = additionalMissions.find((m) => m.id === firstId)
    if (!mission) return
    onFrame([mission.puntoOrigen, mission.id])
    const timer = setTimeout(
      () => {
        updateReflections((s) => {
          const desbloqueos = s.desbloqueos.map((d) =>
            d.actividadId === firstId ? { ...d, visto: true } : d,
          )
          const finished = desbloqueos.filter((d) => isWithinStudentDemo(d.actividadId)).every((d) => d.visto)
          return {
            ...s,
            desbloqueos,
            primeraAdicionalVista: s.primeraAdicionalVista || finished,
            anuncioAdicional: finished
              ? { actividadId: firstId, primero: !s.primeraAdicionalVista }
              : s.anuncioAdicional,
          }
        })
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2700,
    )
    return () => clearTimeout(timer)
  }, [firstId, onFrame, enabled])
  function close() {
    updateReflections((s) => ({ ...s, primeraAdicionalVista: true, anuncioAdicional: undefined }))
  }
  const dismiss = useRef(close)
  dismiss.current = close
  useEffect(() => {
    if (!card || !enabled) return
    const timer = setTimeout(() => dismiss.current(), 7000)
    return () => clearTimeout(timer)
  }, [card, enabled])
  if (!card || !enabled) return null
  const mission = activityById(card)
  const origin =
    activityById(additionalMissions.find((m) => m.id === card)?.actividadOrigen ?? '')?.titulo ?? ''
  return (
    <aside
      className="sx-root sx-glass sx-badge-toast"
      aria-label="Nueva misión adicional"
      role="status"
      aria-live="polite"
    >
      <CharacterAvatar id="companero" size="sm" />
      <div className="sx-badge-copy">
        <p className="sx-badge-label">Nueva misión adicional</p>
        <h2>{mission?.titulo ?? 'Se abrió un nuevo sendero'}</h2>
        <p>
          {state.anuncioAdicional?.primero
            ? reflectionCopy.firstAdditional(origin)
            : reflectionCopy.nextAdditional(origin)}
        </p>
        <button
          type="button"
          className="sx-notice-action"
          onClick={() => {
            onSelect(card)
            close()
          }}
        >
          Ver la misión
        </button>
      </div>
      <button
        type="button"
        className="sx-badge-close sx-icon-button"
        aria-label="Cerrar aviso"
        onClick={close}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
