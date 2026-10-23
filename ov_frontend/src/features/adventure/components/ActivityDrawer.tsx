import type { ReactNode } from 'react'
import type { AdventureState } from '@/types/adventure'
import { useAdventure } from '@/store/adventureStore'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Clock, LockKeyhole, Play, X } from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { useThemeClass } from '@/components/common/ThemeScope'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBloquesDrawerCargando } from '@/store/cargaDrawerStore'
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
  carga,
  onClose,
  onAction,
  onJournal,
  onFallbackFocus,
  renderCaseProgress,
  renderJournal,
  renderPorAmpliar,
  renderFichasBatalla,
}: {
  point?: StudentMapPoint
  details?: PointDetails
  // `base`: faltan datos del propio drawer; `esperaBloques`: los bloques de cada tipo avisan su carga.
  carga?: { base: boolean; esperaBloques: boolean }
  onClose: () => void
  onAction: (details: PointDetails) => void
  onJournal: (details: PointDetails) => void
  onFallbackFocus?: () => void
  renderCaseProgress?: (adventure: AdventureState, actividad?: string) => ReactNode
  renderJournal?: (journal: NonNullable<PointDetails['journal']>, onOpen: () => void) => ReactNode
  // Lo que un registro completado quedó por ampliar (F01); lo decide el dominio de actividades.
  renderPorAmpliar?: (codigo: string) => ReactNode
  // Las fichas de las que se alimenta una batalla (F04b); lo decide el dominio de actividades.
  renderFichasBatalla?: (codigo: string) => ReactNode
}) {
  const adventure = useAdventure()
  const theme = useThemeClass()
  const closeButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const Icon = point?.icon
  // Los bloques avisan que cargan en sus efectos, que corren antes que el de aquí: hasta ese momento
  // (`asentado`), y mientras alguno cargue, se ve el skeleton y el contenido queda montado pero oculto.
  const [asentado, setAsentado] = useState<string | undefined>()
  const bloquesCargando = useBloquesDrawerCargando()
  const clavePunto = point ? `${point.zone}/${point.id}` : undefined
  useEffect(() => setAsentado(clavePunto), [clavePunto])
  const cargando =
    !!carga && (carga.base || (carga.esperaBloques && (asentado !== clavePunto || bloquesCargando)))
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
              {cargando && <EsqueletoDrawer />}
              <div
                className="sx-drawer-body"
                hidden={cargando}
                style={cargando ? { display: 'none' } : undefined}
              >
                <DrawerHeader className="sx-drawer-header">
                  <div className="sx-drawer-meta">
                    <span className="sx-drawer-badge" data-status={details.badge}>
                      {details.badge}
                    </span>
                    {details.opcional && (
                      <span className="sx-drawer-badge" data-status="Opcional">
                        Opcional
                      </span>
                    )}
                    {details.meta && (
                      <span>
                        <Clock size={14} />
                        {details.meta}
                      </span>
                    )}
                  </div>
                  <DrawerTitle className="sx-drawer-title">{details.title}</DrawerTitle>
                  <DrawerDescription className="sx-drawer-description">
                    {details.description}
                  </DrawerDescription>
                </DrawerHeader>
                <span className="sx-drawer-type">{details.type}</span>
                {point.specActivityId && renderFichasBatalla?.(point.specActivityId)}
                {point.specActivityId && renderPorAmpliar?.(point.specActivityId)}
                {details.requirement && (
                  <p className="sx-drawer-requirement">
                    <LockKeyhole size={18} />
                    {details.requirement}
                  </p>
                )}
                {details.requirementLink && (
                  <Link className="sx-drawer-requirement-link" to={details.requirementLink.href}>
                    {details.requirementLink.label}
                  </Link>
                )}
                {details.caseProgress && renderCaseProgress?.(adventure, point.specActivityId)}
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

// Mientras el drawer espera sus datos: estado, tiempo, título, descripción, tipo y bloque del tipo.
function EsqueletoDrawer() {
  return (
    <div className="sx-drawer-body" aria-busy="true" aria-label="Cargando actividad">
      <div className="sx-drawer-meta">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
