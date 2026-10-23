import { useNoveltyQueue } from '../../hooks/useNoveltyQueue'
import { type ReactNode, useState } from 'react'

import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { registrarCheckIn } from '@/store/servidor/diario'
import { UnlockToast } from './UnlockToast'

import { appPaths } from '@/routes/paths'

import { updateStudentUi } from '@/store/studentUiStore'
import type { StudentView } from '@/lib/studentViews'
import { CheckInDialog } from './CheckInDialog'
import { getTodayCheckIn, saveTodayCheckIn } from '../../lib/checkIn'
import { LumiOverlay } from './LumiOverlay'
import { BadgeToast } from './BadgeToast'
import { markBadgeAnnounced } from '../../lib/unlocks'

import { StudentOverlayContext } from '../../context/overlayContext'
import { TriangleAlert } from 'lucide-react'

export function OverlayQueue({
  view,
  activityOpen,
  children,
}: {
  view: StudentView
  activityOpen: boolean
  children: ReactNode
}) {
  const {
    adventure,
    navigate,
    today,
    setManual,
    setAutomatic,
    active,
    context,
    badge,
    aviso,
    guide,
    closeGuide,
    dismissSignal,
    mostrarAviso,
    marcarVistos,
    errorAvisos,
    senal,
  } = useNoveltyQueue(view, activityOpen)
  const [errorSenal, setErrorSenal] = useState('')
  const cerrarSenal = () => {
    setErrorSenal('')
    setManual(null)
    setAutomatic(null)
  }

  return (
    <StudentOverlayContext.Provider value={context}>
      {children}
      <LumiOverlay
        key={active?.kind === 'intro' ? `intro:${active.view}` : (active?.kind ?? 'closed')}
        open={!!guide}
        steps={guide ?? []}
        onClose={closeGuide}
        finalLabel={active?.kind === 'arrival' ? 'Entrar a la ciudad' : undefined}
        onFinish={
          active?.kind === 'arrival'
            ? () => {
                updateStudentUi((current) => ({ ...current, cityArrivalSeen: true }))
                navigate(appPaths.student.exploration)
              }
            : undefined
        }
      />
      <CheckInDialog
        key={today}
        open={active?.kind === 'signal' || active?.kind === 'check-in'}
        value={senal.activo ? senal.hoy?.value : getTodayCheckIn(adventure)?.value}
        onReturnFocus={active?.kind === 'signal' ? active.onReturnFocus : undefined}
        onDismiss={() => {
          setErrorSenal('')
          dismissSignal()
        }}
        servidor={senal.activo ? { escala: senal.escala, error: errorSenal } : undefined}
        onSave={(value) => {
          if (!senal.activo) {
            saveTodayCheckIn(value)
            return cerrarSenal()
          }
          // F05: uno por día en el servidor; si falla, el diálogo sigue abierto con el mensaje.
          void registrarCheckIn(value).then((respuesta) =>
            respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar'
              ? cerrarSenal()
              : setErrorSenal(mensajeErrorServidor(respuesta)),
          )
        }}
      />
      {badge && (
        <BadgeToast
          key={badge.code}
          badge={badge}
          onDismiss={() => updateStudentUi((current) => markBadgeAnnounced(current, badge.code))}
        />
      )}
      {aviso && <UnlockToast key={aviso.id} aviso={aviso} onDismiss={() => mostrarAviso(aviso.id)} />}
      {errorAvisos && (
        <aside className="sx-root sx-glass sx-badge-toast" role="alert">
          <span className="sx-toast-icon" aria-hidden="true">
            <TriangleAlert size={18} />
          </span>
          <div className="sx-badge-copy">
            <p>{mensajeErrorServidor(errorAvisos)}</p>
            <button className="sx-secondary-button sx-toast-action" onClick={() => void marcarVistos()}>
              Reintentar avisos
            </button>
          </div>
        </aside>
      )}
    </StudentOverlayContext.Provider>
  )
}
