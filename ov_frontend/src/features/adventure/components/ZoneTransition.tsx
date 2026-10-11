import { useEffect, useState } from 'react'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import type { StudentZone } from '../lib/mapPoints'

export function ZoneTransition({ zone }: { zone: StudentZone }) {
  const ui = useStudentUi()
  const [show, setShow] = useState(ui.lastMap !== zone)
  useEffect(() => {
    if (!show) return
    const finish = () => {
      updateStudentUi((current) => ({ ...current, lastMap: zone }))
      setShow(false)
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const timeout = setTimeout(finish, 1000)
    return () => clearTimeout(timeout)
  }, [show, zone])
  return show ? (
    <div className={`sx-zone-transition sx-transition-${zone}`} role="status" aria-live="polite">
      <CharacterAvatar id="companero" size="lg" />
      <strong>{zone === 'missions' ? 'El camino' : 'La ciudad'}</strong>
      <span>{zone === 'missions' ? 'Tu ruta paso a paso' : 'Tú eliges el orden'}</span>
    </div>
  ) : null
}
