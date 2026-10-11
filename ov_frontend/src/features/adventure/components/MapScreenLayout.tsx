import { useMapInteraction } from '@/features/adventure/hooks/useMapInteraction'
import type { ComponentProps, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, PanelLeftOpen } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/Sheet'
import type { JourneyState } from '@/types/activities'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import { StudentUserMenu } from './StudentUserMenu'
import { StudentBrand } from '@/components/student/StudentBrand'
import { NoveltiesMenu } from './overlays/NoveltiesMenu'
import { guideSteps } from '@/data/content/guideTexts'
import { updateStudentUi } from '@/store/studentUiStore'
import { ActivityDrawer } from './ActivityDrawer'
import { AdventurePanel } from './AdventurePanel'
import { CollapsedAdventurePanel } from '@/features/adventure/components/CollapsedAdventurePanel'
import { CityLocked } from './CityLocked'
import { MapCanvas } from './MapCanvas'
import { MapControls } from './MapControls'
import { type StudentMapPoint, type StudentZone } from '../lib/mapPoints'
import { ZoneSwitch } from './ZoneSwitch'
import { ZoneTransition } from './ZoneTransition'
import { ZoomControls } from './ZoomControls'
export function MapScreenLayout({
  zone,
  points,
  adventure,
  journey,
  renderCaseProgress,
  renderJournal,
  renderAdditional,
}: {
  zone: StudentZone
  points: StudentMapPoint[]
  adventure: AdventureState
  journey: JourneyState
  renderCaseProgress?: ComponentProps<typeof ActivityDrawer>['renderCaseProgress']
  renderJournal?: ComponentProps<typeof ActivityDrawer>['renderJournal']
  renderAdditional?: (props: {
    onFrame: (ids: string[]) => void
    onSelect: (id: string) => void
    enabled: boolean
  }) => ReactNode
}) {
  const {
    ui,
    navigate,
    canvas,
    frameAdditional,
    returnPoint,
    mobilePanelButton,
    selectedId,
    scale,
    setScale,
    minimumScale,
    setMinimumScale,
    openGuide,
    openCheckIn,
    announcementBlocked,
    mobilePanelOpen,
    setMobilePanelOpen,
    mobile,
    cityOpen,
    locked,
    recommended,
    progress,
    selected,
    details,
    mostrarMisionesAdicionales,
    reintentarRequisito,
    closePoint,
    selectPoint,
    action,
    journal,
  } = useMapInteraction({ zone, points, adventure, journey })
  const panel = (
    <AdventurePanel
      adventure={adventure}
      points={points}
      recommended={recommended}
      progress={progress}
      onCheckIn={() => {
        setMobilePanelOpen(false)
        openCheckIn(mobile ? () => mobilePanelButton.current?.focus() : undefined)
      }}
      onSelect={(id) => {
        if (locked) navigate(appPaths.student.missions)
        else selectPoint(id)
      }}
    />
  )
  return (
    <div className={`sx-map-screen sx-zone-${zone}`}>
      <h1 className="sr-only">Aventura · {zone === 'missions' ? 'Camino' : 'Ciudad'}</h1>
      <header className="sx-map-header">
        <StudentBrand />
        <NoveltiesMenu />
        <StudentUserMenu />
      </header>
      <div className="sx-map-stage" data-panel-open={!mobile && !ui.panelCollapsed}>
        <MapCanvas
          ref={canvas}
          points={points}
          variant={zone === 'missions' ? 'route' : 'open'}
          panelOpen={!mobile && !ui.panelCollapsed}
          panelInset={mobile ? 0 : ui.panelCollapsed ? 72 : 304}
          selectedId={selectedId}
          recommendedId={recommended?.id}
          onSelect={selectPoint}
          onScaleChange={setScale}
          onMinimumScaleChange={setMinimumScale}
          locked={locked}
          label={
            zone === 'missions' ? 'Aventura · Camino de misiones' : 'Central de Casos · Llamados de la ciudad'
          }
          backgroundImage={
            zone === 'missions' ? '/images/adventure/journey-map.png' : '/images/adventure/city-map.png'
          }
        />
        {locked && <CityLocked adventure={adventure} />}
        {mostrarMisionesAdicionales &&
          renderAdditional?.({
            onFrame: frameAdditional,
            onSelect: selectPoint,
            enabled: !announcementBlocked && !selectedId && !mobilePanelOpen,
          })}
        <aside
          className="sx-glass sx-adventure-panel"
          data-collapsed={ui.panelCollapsed}
          aria-label="Panel de aventura"
          inert={mobile ? true : undefined}
        >
          {ui.panelCollapsed && (
            <CollapsedAdventurePanel
              progress={progress.value}
              recommended={recommended}
              onSelect={(id) => (locked ? navigate(appPaths.student.missions) : selectPoint(id))}
            />
          )}
          <div className="sx-panel-scroll" inert={ui.panelCollapsed ? true : undefined}>
            {panel}
          </div>
          <button
            type="button"
            className="sx-panel-toggle"
            aria-label={ui.panelCollapsed ? 'Desplegar panel' : 'Plegar panel'}
            onClick={() =>
              updateStudentUi((current) => ({ ...current, panelCollapsed: !current.panelCollapsed }))
            }
          >
            {ui.panelCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </aside>
        <ZoneSwitch
          zone={zone}
          cityOpen={cityOpen}
          onCityLocked={() =>
            zone === 'missions' ? selectPoint('city') : navigate(appPaths.student.missions)
          }
        />
        <MapControls onHelp={() => openGuide(guideSteps[zone])} />
        <ZoomControls
          scale={scale}
          minimumScale={minimumScale}
          onZoom={(factor) => canvas.current?.zoom(factor)}
          onScale={(value) => canvas.current?.setScale(value)}
          onCenter={() => canvas.current?.centerMap()}
        />
        <button
          type="button"
          className="sx-glass sx-mobile-panel-open"
          ref={mobilePanelButton}
          aria-label="Abrir panel"
          onClick={() => setMobilePanelOpen(true)}
        >
          <PanelLeftOpen size={20} />
        </button>
      </div>
      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent
          side="bottom"
          className="sx-root sx-mobile-panel"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            mobilePanelButton.current?.focus()
          }}
        >
          <SheetTitle className="sr-only">Panel de aventura</SheetTitle>
          <SheetDescription className="sr-only">Tu progreso y los accesos de tu aventura.</SheetDescription>
          {panel}
        </SheetContent>
      </Sheet>
      <ActivityDrawer
        renderCaseProgress={renderCaseProgress}
        renderJournal={renderJournal}
        point={selected}
        details={details}
        onClose={closePoint}
        onAction={action}
        onJournal={journal}
        onRetryRequirement={reintentarRequisito}
        onFallbackFocus={() => {
          if (mobile) mobilePanelButton.current?.focus()
          else canvas.current?.focusNode(returnPoint.current)
        }}
      />
      <ZoneTransition zone={zone} />
    </div>
  )
}
