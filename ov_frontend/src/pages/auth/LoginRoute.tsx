import { useLogin } from '@/features/auth/hooks/useLogin'
import { Navigate } from 'react-router'
import { LoginScreen } from '@/features/auth/components/LoginScreen'

import { appPaths } from '@/routes/paths'

function LoginRoute() {
  const { active, enter } = useLogin()
  if (active) return <Navigate replace to={appPaths.roleSelection} />
  return (
    <LoginScreen
      onEnter={enter}
    />
  )
}

export { LoginRoute }
