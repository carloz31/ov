import { useNoveltyQueue } from '../../hooks/useNoveltyQueue'
import { type ReactNode } from 'react'

import { mensajeErrorServidor } from '@/store/servidor/sesion'
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
  } = useNoveltyQueue(view, activityOpen)

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
        value={getTodayCheckIn(adventure)?.value}
        onReturnFocus={active?.kind === 'signal' ? active.onReturnFocus : undefined}
        onDismiss={dismissSignal}
        onSave={(value) => {
          saveTodayCheckIn(value)
          setManual(null)
          setAutomatic(null)
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
          <div>
            <p>{mensajeErrorServidor(errorAvisos)}</p>
            <button className="sx-primary-button" onClick={() => void marcarVistos()}>
              Reintentar avisos
            </button>
          </div>
        </aside>
      )}
    </StudentOverlayContext.Provider>
  )
}
