import { useNavigate } from 'react-router'
import { RoleSelectionScreen } from '@/features/auth/components/RoleSelectionScreen'
import type { PlatformRole } from '@/features/auth/types'
import { endDemoAccess } from '@/features/auth/lib/demoAccess'
import { appPaths } from '@/routes/paths'

const roleHomePaths: Record<PlatformRole, string> = {
  student: appPaths.student.missions,
  parent: appPaths.parent.overview,
  counselor: appPaths.counselor.dashboard,
}

function RoleSelectionRoute() {
  const navigate = useNavigate()

  return (
    <RoleSelectionScreen
      onSelectRole={(role) => navigate(roleHomePaths[role])}
      onSignOut={() => {
        endDemoAccess()
        navigate(appPaths.login, { replace: true })
      }}
    />
  )
}

export { RoleSelectionRoute }
