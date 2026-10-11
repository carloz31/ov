import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, CircleHelp } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { appPaths } from '@/routes/paths'
import { guideSteps, passportGuideSteps } from '@/data/content/guideTexts'
import { useStudentOverlays } from '../context/overlayContext'
import { useStudentUi } from '@/store/studentUiStore'
import { getStudentViewLabel, type StudentView } from '@/lib/studentViews'
import { StudentUserMenu } from './StudentUserMenu'
import { NoveltiesMenu } from './overlays/NoveltiesMenu'

export function StudentModuleLayout({ view, children }: { view: StudentView; children: ReactNode }) {
  const ui = useStudentUi()
  const location = useLocation()
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
  }, [location.pathname])
  const passport =
    view === 'profile-general' && new URLSearchParams(location.search).get('section') === 'passport'
  const { openGuide } = useStudentOverlays()
  return (
    <div className="sx-module">
      <header className="sx-module-header">
        <Link
          className="sx-back-to-map"
          to={ui.lastMap === 'central' ? appPaths.student.exploration : appPaths.student.missions}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Volver al mapa</span>
        </Link>
        <span aria-hidden="true" className="sx-module-separator" />
        <h1 className="sx-module-title">{getStudentViewLabel(view)}</h1>
        <div className="sx-module-actions">
          <button
            type="button"
            className="sx-icon-button"
            aria-label="Abrir guía"
            onClick={() => openGuide(passport ? passportGuideSteps : guideSteps[view])}
          >
            <CircleHelp aria-hidden="true" size={20} />
          </button>
          <NoveltiesMenu />
          <StudentUserMenu />
        </div>
      </header>
      <div ref={content} className="sx-module-content">
        {children}
      </div>
    </div>
  )
}
