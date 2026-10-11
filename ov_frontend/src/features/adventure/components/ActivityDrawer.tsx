import type { ReactNode } from 'react'
import type { AdventureState } from '@/types/adventure'
import { useAdventure } from '@/store/adventureStore'
import { useRef } from 'react'
import { Link } from 'react-router'
import { Clock, LockKeyhole, Play, X } from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { useThemeClass } from '@/components/common/ThemeScope'
import {
  Drawer,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer'
import type { StudentMapPoint } from '../lib/mapPoints'
import type { PointDetails } from '@/features/adventure/lib/pointDetails'
export function ActivityDrawer({
  point,
  details,
  onClose,
  onAction,
  onJournal,
  onFallbackFocus,
  onRetryRequirement,
  renderCaseProgress,
  renderJournal,
}: {
  point?: StudentMapPoint
  details?: PointDetails
  onClose: () => void
  onAction: (details: PointDetails) => void
  onJournal: (details: PointDetails) => void
  onFallbackFocus?: () => void
  onRetryRequirement?: () => void
  renderCaseProgress?: (adventure: AdventureState) => ReactNode
  renderJournal?: (journal: NonNullable<PointDetails['journal']>, onOpen: () => void) => ReactNode
}) {
  const adventure = useAdventure()
  const theme = useThemeClass()
  const closeButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const Icon = point?.icon
  return (
    <Drawer
      direction="right"
      autoFocus
      open={!!point}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      shouldScaleBackground={false}
    >
      <DrawerPortal>
        <DrawerOverlay className="sx-root sx-activity-overlay" />
        <DrawerPrimitive.Content
          className={`sx-root ${theme} sx-activity-drawer overflow-x-hidden sx-drawer-${point?.zone ?? 'camino'}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null
            closeButton.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocus.current?.isConnected && returnFocus.current.tagName !== 'BODY')
              returnFocus.current.focus()
            else onFallbackFocus?.()
          }}
        >
          {point && details && (
            <>
              <div
                className="sx-drawer-visual"
                style={
                  details.imageUrl
                    ? {
                        backgroundImage: `linear-gradient(to top, color-mix(in srgb, var(--foreground) 48%, transparent), transparent 65%), url(${details.imageUrl})`,
                      }
                    : undefined
                }
              >
                {!details.imageUrl && Icon && (
                  <span className="sx-drawer-icon">
                    <Icon size={56} aria-hidden="true" />
                  </span>
                )}
                <span className="sx-glass sx-drawer-region">{details.region}</span>
                <DrawerClose asChild>
                  <button
                    ref={closeButton}
                    type="button"
                    className="sx-glass sx-drawer-close"
                    aria-label="Cerrar ficha"
                  >
                    <X size={18} />
                  </button>
                </DrawerClose>
              </div>
              <div className="sx-drawer-body">
                <DrawerHeader className="sx-drawer-header">
                  <div className="sx-drawer-meta">
                    <span className="sx-drawer-badge" data-status={details.badge}>
                      {details.badge}
                    </span>
                    <span>
                      <Clock size={14} />
                      {details.meta}
                    </span>
                  </div>
                  <DrawerTitle className="sx-drawer-title">{details.title}</DrawerTitle>
                  <DrawerDescription className="sx-drawer-description">
                    {details.description}
                  </DrawerDescription>
                </DrawerHeader>
                <span className="sx-drawer-type">{details.type}</span>
                {details.requirement && (
                  <p className="sx-drawer-requirement">
                    <LockKeyhole size={18} />
                    {details.requirement}
                    {onRetryRequirement && (
                      <button type="button" className="sx-secondary-button" onClick={onRetryRequirement}>
                        Reintentar requisito
                      </button>
                    )}
                  </p>
                )}
                {details.caseProgress && renderCaseProgress?.(adventure)}
                {details.journal && renderJournal?.(details.journal, () => onJournal(details))}
                <button
                  type="button"
                  className="sx-primary-button sx-drawer-action"
                  disabled={details.disabled}
                  onClick={() => onAction(details)}
                >
                  <Play size={18} />
                  {details.actionLabel}
                </button>
                {point.additional && (
                  <button type="button" className="sx-secondary-button" onClick={onClose}>
                    Más tarde
                  </button>
                )}
                {!!details.reviewActivities?.length && (
                  <section>
                    <h3>Revisar mis encuentros</h3>
                    <ul>
                      {details.reviewActivities.map((a) => (
                        <li key={a.codigo}>
                          <Link
                            className="sx-secondary-button"
                            to={`/student/exploration?actividad=${a.codigo}&revision=1`}
                          >
                            {a.titulo}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  )
}
