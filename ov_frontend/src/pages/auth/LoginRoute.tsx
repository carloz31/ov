import { Navigate } from 'react-router'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { useLogin } from '@/features/auth/hooks/useLogin'

import { portalPorRol } from '@/routes/paths'

function LoginRoute() {
  const { cuenta, enter, error, enviando, mostrarAvisoDemo } = useLogin()
  if (cuenta) return <Navigate replace to={portalPorRol[cuenta.rol]} />
  return (
    <LoginScreen
      onEnter={(usuario, contrasena) => void enter(usuario, contrasena)}
      error={error}
      enviando={enviando}
      mostrarAvisoDemo={mostrarAvisoDemo}
    />
  )
}

export { LoginRoute }
