import type { ReactNode } from 'react'
import '@/styles/student/student-base.css'
import '@/styles/student/student-logbook.css'
import '@/styles/student/student-targets.css'
import '@/styles/student/student-progress.css'
// Keep tokens active in body portals without changing the shared theme context.
export function StudentThemeScope({ children }: { children: ReactNode }) {
  return (
    <div className="sx-theme-scope" data-student-experience>
      {children}
    </div>
  )
}
